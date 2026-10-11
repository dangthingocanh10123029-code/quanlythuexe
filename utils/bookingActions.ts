// Ghi Firestore cho nghiệp vụ đặt xe. Mỗi hàm tự kiểm tra điều kiện và gửi thông báo;
// lỗi nghiệp vụ ném Error có message tiếng Việt để UI hiện thẳng.
import { collection, doc, getDoc, getDocs, query, where, writeBatch } from "firebase/firestore"
import { db } from "../config/firebase"
import type { Car } from "../types/car"
import type { BookingAddOn } from "../types/booking"
import { calcBookingPrice, daysBetween, isCarFree } from "./booking"
import { HIDDEN_CAR_STATUSES } from "./constants"
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
