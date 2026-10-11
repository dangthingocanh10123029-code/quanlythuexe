// Ghi Firestore cho nghiệp vụ đặt xe. Mỗi hàm tự kiểm tra điều kiện và gửi thông báo;
// lỗi nghiệp vụ ném Error có message tiếng Việt để UI hiện thẳng.
import { collection, deleteField, doc, getDoc, getDocs, increment, query, runTransaction, serverTimestamp, where, writeBatch } from "firebase/firestore"
import { auth, db } from "../config/firebase"
import type { Car } from "../types/car"
import type { Booking, BookingAddOn } from "../types/booking"
import { applyRating, calcBookingPrice, calcRefund, calcReturnSettlement, canTransition, daysBetween, getBookingRange, isCarFree } from "./booking"
import { FUEL_LEVELS, HIDDEN_CAR_STATUSES, getBookingStatusLabel } from "./constants"
import { formatCurrency, formatDate } from "./helpers"
import { notify } from "./notify"

// Lỗi có `code` để UI điều hướng (vd "license-required" → /profile/license)
const bookingError = (message: string, code?: string) => Object.assign(new Error(message), { code })

// `bookedSlots/{bookingId}` = { carId, userId, pickupDate, returnDate }: khoảng ngày xe đang bị giữ,
// đọc được bởi mọi người dùng (bookings thì chỉ chủ đơn/admin đọc). Có khi đơn Pending | Confirmed |
// Upcoming | Active; xoá khi đơn bị huỷ / từ chối / hoàn thành.
export async function getCarSlots(carId: string) {
  const snap = await getDocs(query(collection(db, "bookedSlots"), where("carId", "==", carId)))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as { pickupDate: any; returnDate: any }) }))
}

// Người dùng chưa có đơn nào đã thanh toán (điều kiện FIRST20 / WELCOME25)
export async function isFirstBooking(uid: string) {
  const snap = await getDocs(query(collection(db, "bookings"), where("userId", "==", uid)))
  return !snap.docs.some((d) => {
    const b = d.data()
    return String(b.payment?.status).toLowerCase() === "completed" || ["upcoming", "active", "completed"].includes(String(b.status).toLowerCase())
  })
}

// GPLX phải đã gửi (chờ duyệt) hoặc đã xác minh mới được đặt xe
async function assertLicense(uid: string) {
  const snap = await getDoc(doc(db, "licenses", uid))
  const status = snap.exists() ? snap.data().status : null
  if (status !== "pending" && status !== "verified")
    throw bookingError(
      status === "rejected"
        ? "GPLX của bạn bị từ chối. Vui lòng cập nhật và gửi lại trước khi đặt xe."
        : "Bạn cần gửi giấy phép lái xe (GPLX) trước khi đặt xe.",
      "license-required",
    )
}

export type CreateBookingInput = {
  uid: string
  car: Car
  pickupDate: Date
  returnDate: Date
  location: string
  returnLocation?: string
  addOns: BookingAddOn[]
  promoCode?: string
}

// Tạo đơn "Pending" (chờ admin xác nhận, D2). Trả về id đơn.
export async function createBooking(input: CreateBookingInput): Promise<string> {
  const { uid, car, pickupDate, returnDate, location, addOns } = input
  if (HIDDEN_CAR_STATUSES.includes(car.status)) throw bookingError("Xe đang tạm ngừng cho thuê.")
  if (pickupDate.getTime() < Date.now()) throw bookingError("Thời gian nhận xe phải sau thời điểm hiện tại.")
  if (returnDate <= pickupDate) throw bookingError("Thời gian trả xe phải sau thời gian nhận xe.")

  await assertLicense(uid)

  const days = daysBetween(pickupDate, returnDate)
  const promoCode = input.promoCode?.trim().toUpperCase() || undefined
  const price = calcBookingPrice({
    pricePerDay: car.pricePerDay,
    days,
    addOns,
    promoCode,
    isFirstBooking: promoCode ? await isFirstBooking(uid) : false,
    pickupDate,
  })
  if (price.promoError) throw bookingError(price.promoError)

  if (!isCarFree(await getCarSlots(car.id), pickupDate, returnDate))
    throw bookingError("Xe đã có người đặt trong khoảng thời gian này. Vui lòng chọn ngày khác.")

  const ref = doc(collection(db, "bookings"))
  const batch = writeBatch(db)
  batch.set(ref, {
    userId: uid,
    carId: car.id,
    carName: car.name,
    pickupDate,
    returnDate,
    duration: days,
    location,
    returnLocation: input.returnLocation || location,
    subtotal: price.subtotal,
    addOnTotal: price.addOnTotal,
    discount: price.discount,
    ...(promoCode ? { promoCode } : {}),
    tax: price.tax,
    deposit: car.deposit,
    price: price.total,
    selectedAddOns: addOns.map(({ id, name, price }) => ({ id, name, price })),
    status: "Pending",
    createdAt: new Date(),
  })
  batch.set(doc(db, "bookedSlots", ref.id), { carId: car.id, userId: uid, pickupDate, returnDate })
  await batch.commit()

  await notify(uid, {
    type: "booking",
    title: "Đã gửi yêu cầu đặt xe",
    message: `Đơn thuê ${car.name} đang chờ RENTO xác nhận.`,
    bookingId: ref.id,
  })
  return ref.id
}

// ===== Sau khi tạo đơn (G3) =====

async function getBooking(bookingId: string): Promise<Booking> {
  const snap = await getDoc(doc(db, "bookings", bookingId))
  if (!snap.exists()) throw bookingError("Không tìm thấy đơn đặt xe.")
  return { id: snap.id, ...snap.data() } as Booking
}

function assertTransition(booking: Booking, to: string, action: string) {
  if (!canTransition(booking.status, to))
    throw bookingError(`Không thể ${action} đơn đang ở trạng thái "${getBookingStatusLabel(booking.status)}".`)
}

// Admin xác nhận đơn Pending → Confirmed (chờ khách thanh toán). Kiểm tra lại trùng lịch (D9) và GPLX.
export async function confirmBooking(bookingId: string) {
  const booking = await getBooking(bookingId)
  assertTransition(booking, "Confirmed", "xác nhận")
  const range = getBookingRange(booking)
  if (!range) throw bookingError("Đơn chưa có ngày nhận xe.")

  const snap = await getDocs(query(collection(db, "bookings"), where("carId", "==", booking.carId)))
  const others = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking)
  if (!isCarFree(others, range.start, range.end, bookingId))
    throw bookingError("Xe đã có đơn khác trùng lịch. Vui lòng từ chối hoặc liên hệ khách đổi lịch.")

  const license = await getDoc(doc(db, "licenses", booking.userId))
  if (!license.exists() || license.data().status !== "verified")
    throw bookingError("GPLX của khách chưa được xác minh. Vui lòng duyệt GPLX trước khi xác nhận đơn.")

  const batch = writeBatch(db)
  batch.update(doc(db, "bookings", bookingId), { status: "Confirmed", confirmedAt: new Date() })
  // Đơn cũ (trước G2) chưa có slot → tạo để chặn trùng lịch phía khách
  batch.set(doc(db, "bookedSlots", bookingId), {
    carId: booking.carId,
    userId: booking.userId,
    pickupDate: range.start,
    returnDate: range.end,
  })
  await batch.commit()
  await notify(booking.userId, {
    type: "booking",
    title: "Đơn đặt xe đã được xác nhận",
    message: `RENTO đã xác nhận đơn ${booking.carName}. Vui lòng thanh toán để giữ xe.`,
    bookingId,
  })
}

// Admin từ chối đơn Pending (bắt buộc có lý do)
export async function rejectBooking(bookingId: string, reason: string) {
  if (!reason.trim()) throw bookingError("Vui lòng nhập lý do từ chối.")
  const booking = await getBooking(bookingId)
  assertTransition(booking, "Rejected", "từ chối")
  const batch = writeBatch(db)
  batch.update(doc(db, "bookings", bookingId), { status: "Rejected", rejectedAt: new Date(), rejectReason: reason.trim() })
  batch.delete(doc(db, "bookedSlots", bookingId))
  await batch.commit()
  await notify(booking.userId, {
    type: "booking",
    title: "Đơn đặt xe bị từ chối",
    message: `Đơn ${booking.carName} bị từ chối. Lý do: ${reason.trim()}`,
    bookingId,
  })
}

const TRANSACTION_PREFIX: Record<string, string> = { "Thẻ ngân hàng": "CARD", MoMo: "MOMO", ZaloPay: "ZALO" }

// Thanh toán giả lập: chỉ đơn Confirmed, đúng số tiền. Thành công → Upcoming. Trả về mã giao dịch.
// `details`: thông tin hiển thị thêm (vd lastFourDigits, cardholderName).
export async function payBooking(bookingId: string, method: string, amount: number, details: Record<string, string> = {}) {
  const booking = await getBooking(bookingId)
  if (booking.status?.toLowerCase() === "pending")
    throw bookingError("Đơn đang chờ RENTO xác nhận, bạn chưa thể thanh toán.")
  assertTransition(booking, "Upcoming", "thanh toán")
  if (Math.round(amount) !== Math.round(Number(booking.price)))
    throw bookingError(`Số tiền thanh toán không khớp với đơn (${formatCurrency(booking.price)}).`)

  const transactionId = `${TRANSACTION_PREFIX[method] ?? "PAY"}-${Date.now().toString(36).toUpperCase()}`
  const batch = writeBatch(db)
  batch.update(doc(db, "bookings", bookingId), {
    status: "Upcoming",
    payment: { ...details, method, amount: booking.price, transactionId, paidAt: new Date(), status: "Completed" },
  })
  await batch.commit()
  await notify(booking.userId, {
    type: "payment",
    title: "Thanh toán thành công",
    message: `Đã thanh toán ${formatCurrency(booking.price)} cho đơn ${booking.carName} qua ${method}.`,
    bookingId,
  })
  return transactionId
}

// Ghi nhận giao dịch thất bại; đơn giữ nguyên Confirmed để khách thử lại
export async function failPayment(bookingId: string, method: string, reason = "Giao dịch không thành công") {
  const booking = await getBooking(bookingId)
  await writeBatch(db)
    .update(doc(db, "bookings", bookingId), {
      payment: { method, amount: booking.price, status: "Failed", failedAt: new Date(), failReason: reason },
    })
    .commit()
  await notify(booking.userId, {
    type: "payment",
    title: "Thanh toán thất bại",
    message: `${reason}. Đơn ${booking.carName} vẫn đang chờ thanh toán, bạn có thể thử lại.`,
    bookingId,
  })
}

// Số tiền sẽ được hoàn nếu huỷ ngay bây giờ (để UI hiện trong hộp thoại xác nhận)
export const previewRefund = (booking: Booking, by: "user" | "admin" = "user") => calcRefund(booking, new Date(), by === "admin")

// Huỷ đơn (D5): Pending | Confirmed | Upcoming; đã trả tiền thì hoàn theo chính sách. Trả về số tiền hoàn.
export async function cancelBooking(bookingId: string, by: "user" | "admin" = "user") {
  const booking = await getBooking(bookingId)
  if (booking.status?.toLowerCase() === "active") throw bookingError("Xe đã được giao, không thể huỷ chuyến.")
  assertTransition(booking, "Cancelled", "huỷ")
  const refund = previewRefund(booking, by)

  const batch = writeBatch(db)
  batch.update(doc(db, "bookings", bookingId), {
    status: "Cancelled",
    cancelledAt: new Date(),
    cancelledBy: by,
    ...(refund.amount > 0
      ? {
          "payment.status": "Refunded",
          "payment.refundAmount": refund.amount,
          "payment.refundPercent": refund.percent,
          "payment.refundedAt": new Date(),
        }
      : {}),
  })
  batch.delete(doc(db, "bookedSlots", bookingId))
  await batch.commit()
  await notify(booking.userId, {
    type: "booking",
    title: by === "admin" ? "RENTO đã huỷ đơn đặt xe" : "Đã huỷ chuyến",
    message:
      `Đơn ${booking.carName} đã được huỷ.` +
      (refund.amount > 0 ? ` Hoàn ${formatCurrency(refund.amount)} (${refund.percent}%) về phương thức đã thanh toán.` : ""),
    bookingId,
  })
  return refund.amount
}

// Đổi lịch (D7). Pending/Confirmed: đổi tự do, tính lại giá, quay về Pending (mã giảm giá không còn hợp lệ
// thì bỏ). Upcoming (đã thanh toán): chỉ dời ngày, giữ nguyên số giờ thuê nên giá không đổi.
export async function rescheduleBooking(bookingId: string, pickupDate: Date, returnDate?: Date) {
  const booking = await getBooking(bookingId)
  const status = booking.status?.toLowerCase()
  if (!["pending", "confirmed", "upcoming"].includes(status))
    throw bookingError(`Không thể đổi lịch đơn đang ở trạng thái "${getBookingStatusLabel(booking.status)}".`)
  if (pickupDate.getTime() < Date.now()) throw bookingError("Thời gian nhận xe phải sau thời điểm hiện tại.")

  const old = getBookingRange(booking)
  const end = status === "upcoming" || !returnDate
    ? new Date(pickupDate.getTime() + (old ? old.end.getTime() - old.start.getTime() : Number(booking.duration || 1) * 86_400_000))
    : returnDate
  if (end <= pickupDate) throw bookingError("Thời gian trả xe phải sau thời gian nhận xe.")

  if (!isCarFree(await getCarSlots(booking.carId), pickupDate, end, bookingId))
    throw bookingError("Xe đã có người đặt trong khoảng thời gian này. Vui lòng chọn ngày khác.")

  const update: Record<string, any> = { pickupDate, returnDate: end, duration: daysBetween(pickupDate, end) }
  if (status !== "upcoming") {
    const carSnap = await getDoc(doc(db, "cars", booking.carId))
    if (!carSnap.exists()) throw bookingError("Xe không còn trên hệ thống.")
    const base = {
      pricePerDay: Number(carSnap.data().pricePerDay) || 0,
      days: update.duration,
      addOns: booking.selectedAddOns ?? [],
      isFirstBooking: booking.promoCode ? await isFirstBooking(booking.userId) : false,
      pickupDate,
    }
    let price = calcBookingPrice({ ...base, promoCode: booking.promoCode })
    if (price.promoError) {
      price = calcBookingPrice(base)
      update.promoCode = deleteField()
    }
    Object.assign(update, {
      subtotal: price.subtotal,
      addOnTotal: price.addOnTotal,
      discount: price.discount,
      tax: price.tax,
      price: price.total,
      status: "Pending",
      confirmedAt: deleteField(),
    })
  }

  const batch = writeBatch(db)
  batch.update(doc(db, "bookings", bookingId), update)
  batch.set(doc(db, "bookedSlots", bookingId), { carId: booking.carId, userId: booking.userId, pickupDate, returnDate: end })
  await batch.commit()
  await notify(booking.userId, {
    type: "booking",
    title: "Đã đổi lịch chuyến đi",
    message:
      `Đơn ${booking.carName}: nhận xe ${formatDate(pickupDate, "datetime")}, trả xe ${formatDate(end, "datetime")}.` +
      (status === "upcoming" ? "" : " Đơn chờ RENTO xác nhận lại."),
    bookingId,
  })
}

// ===== Giao xe / nhận lại xe (G4) =====

export type HandoverInput = {
  documentsChecked: boolean // đã kiểm tra CCCD + GPLX bản gốc
  depositCollected: boolean // đã thu tiền cọc
  conditionNote: string // tình trạng xe lúc giao
  odometer: number // số km
  fuelLevel: string // FUEL_LEVELS
}

// Admin giao xe: Upcoming → Active, xe chuyển "Rented"
export async function handOverBooking(bookingId: string, input: HandoverInput) {
  const booking = await getBooking(bookingId)
  assertTransition(booking, "Active", "giao xe cho")
  if (!input.documentsChecked) throw bookingError("Vui lòng kiểm tra giấy tờ (CCCD, GPLX bản gốc) của khách.")
  if (!input.depositCollected) throw bookingError("Vui lòng thu tiền cọc trước khi giao xe.")
  if (!input.conditionNote.trim()) throw bookingError("Vui lòng ghi tình trạng xe lúc giao.")
  if (!Number.isInteger(input.odometer) || input.odometer < 0) throw bookingError("Số km không hợp lệ.")
  if (!FUEL_LEVELS.includes(input.fuelLevel)) throw bookingError("Vui lòng chọn mức nhiên liệu.")

  const at = new Date()
  const batch = writeBatch(db)
  batch.update(doc(db, "bookings", bookingId), {
    status: "Active",
    handover: { ...input, conditionNote: input.conditionNote.trim(), at },
    handedOverAt: at,
  })
  batch.update(doc(db, "cars", booking.carId), { status: "Rented", updatedAt: at })
  await batch.commit()
  await notify(booking.userId, {
    type: "booking",
    title: "Bạn đã nhận xe",
    message: `Chúc bạn có chuyến đi vui vẻ với ${booking.carName}! Hạn trả xe: ${formatDate(getBookingRange(booking)?.end ?? at, "datetime")}.`,
    bookingId,
  })
}

export type ReturnInput = {
  odometer: number
  fuelLevel: string
  damageNote: string // để trống nếu không hư hỏng
  extraFees: number // phí phát sinh (hư hỏng, vệ sinh, thiếu xăng…)
}

// Tính trước phí trễ / hoàn cọc để UI hiện trong biên bản (cùng công thức returnBooking dùng)
export function previewReturn(booking: Booking, car: { pricePerDay: number; deposit: number } | null, extraFees = 0, actual = new Date()) {
  const range = getBookingRange(booking)
  return calcReturnSettlement({
    deposit: Number(booking.deposit ?? car?.deposit) || 0,
    pricePerDay: car?.pricePerDay ?? (Number(booking.subtotal) || 0) / (Number(booking.duration) || 1),
    returnDate: range?.end ?? actual,
    actual,
    extraFees,
  })
}

// Admin nhận lại xe: Active → Completed, xe "Available", quyết toán cọc. Trả về { lateFee, extraFees, depositRefund }.
export async function returnBooking(bookingId: string, input: ReturnInput) {
  const booking = await getBooking(bookingId)
  assertTransition(booking, "Completed", "nhận lại xe của")
  if (!Number.isInteger(input.odometer) || input.odometer < (booking.handover?.odometer ?? 0))
    throw bookingError(`Số km khi trả phải lớn hơn hoặc bằng lúc giao (${booking.handover?.odometer ?? 0} km).`)
  if (!FUEL_LEVELS.includes(input.fuelLevel)) throw bookingError("Vui lòng chọn mức nhiên liệu.")
  if (!Number.isFinite(input.extraFees) || input.extraFees < 0) throw bookingError("Phí phát sinh không hợp lệ.")

  const carSnap = await getDoc(doc(db, "cars", booking.carId))
  const car = carSnap.exists() ? { pricePerDay: Number(carSnap.data().pricePerDay) || 0, deposit: Number(carSnap.data().deposit) || 0 } : null
  const at = new Date()
  const settlement = previewReturn(booking, car, input.extraFees, at)

  const batch = writeBatch(db)
  batch.update(doc(db, "bookings", bookingId), {
    status: "Completed",
    returnInspection: { ...input, damageNote: input.damageNote.trim(), ...settlement, at },
    returnedAt: at,
  })
  if (car) batch.update(doc(db, "cars", booking.carId), { status: "Available", bookings: increment(1), updatedAt: at })
  batch.delete(doc(db, "bookedSlots", bookingId))
  await batch.commit()
  await notify(booking.userId, {
    type: "booking",
    title: "Chuyến đi đã hoàn tất",
    message:
      `Cảm ơn bạn đã thuê ${booking.carName}. Tiền cọc hoàn lại: ${formatCurrency(settlement.depositRefund)}` +
      (settlement.lateFee + settlement.extraFees > 0 ? ` (đã trừ phí ${formatCurrency(settlement.lateFee + settlement.extraFees)}).` : ".") +
      " Hãy đánh giá chuyến đi nhé!",
    bookingId,
  })
  return settlement
}

// ===== Đánh giá (G5) =====

// Khách đánh giá đơn Completed của chính mình, mỗi đơn một lần (`reviews/{bookingId}`)
export async function submitReview(bookingId: string, rating: number, comment: string) {
  const uid = auth.currentUser?.uid
  if (!uid) throw bookingError("Vui lòng đăng nhập để đánh giá.")
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw bookingError("Vui lòng chọn từ 1 đến 5 sao.")
  if (comment.trim().length > 500) throw bookingError("Nhận xét tối đa 500 ký tự.")

  const userSnap = await getDoc(doc(db, "users", uid))
  const userName = userSnap.data()?.fullName || auth.currentUser?.displayName || "Khách hàng RENTO"

  await runTransaction(db, async (tx) => {
    const bookingRef = doc(db, "bookings", bookingId)
    const bookingSnap = await tx.get(bookingRef)
    const booking = bookingSnap.data()
    if (!booking || booking.userId !== uid) throw bookingError("Không tìm thấy chuyến đi của bạn.")
    if (String(booking.status).toLowerCase() !== "completed") throw bookingError("Chỉ đánh giá được chuyến đã hoàn thành.")
    if (booking.reviewed) throw bookingError("Bạn đã đánh giá chuyến đi này.")

    const carRef = doc(db, "cars", booking.carId)
    const carSnap = await tx.get(carRef)
    tx.set(doc(db, "reviews", bookingId), {
      carId: booking.carId,
      userId: uid,
      userName,
      rating,
      comment: comment.trim(),
      createdAt: serverTimestamp(),
    })
    if (carSnap.exists()) {
      const car = carSnap.data()
      tx.update(carRef, applyRating(Number(car.rating) || 0, Number(car.reviewCount) || 0, rating, "add"))
    }
    tx.update(bookingRef, { reviewed: true })
  })
}

// Admin xoá đánh giá, tính lại điểm xe
export async function deleteReview(reviewId: string) {
  await runTransaction(db, async (tx) => {
    const reviewRef = doc(db, "reviews", reviewId)
    const review = (await tx.get(reviewRef)).data()
    if (!review) throw bookingError("Đánh giá không còn tồn tại.")
    const carRef = doc(db, "cars", review.carId)
    const carSnap = await tx.get(carRef)
    if (carSnap.exists()) {
      const car = carSnap.data()
      tx.update(carRef, applyRating(Number(car.rating) || 0, Number(car.reviewCount) || 0, Number(review.rating) || 0, "remove"))
    }
    tx.delete(reviewRef)
  })
}
