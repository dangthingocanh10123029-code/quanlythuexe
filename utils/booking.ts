// Nghiệp vụ đặt xe dạng hàm thuần (không gọi Firestore) — có test trong utils/__tests__/booking.test.ts
import { OPEN_BOOKING_STATUSES, PROMO_CODES, VAT_RATE } from "./constants"

const HOUR = 3_600_000
const DAY = 24 * HOUR

// Firestore Timestamp / Date / chuỗi / số → Date (null nếu không hợp lệ)
export const toDate = (value: any): Date | null => {
  if (!value) return null
  if (typeof value.toDate === "function") return value.toDate()
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000)
  const d = value instanceof Date ? value : new Date(value)
  return isNaN(d.getTime()) ? null : d
}

const lower = (status?: string) => (status || "").toLowerCase().replace("canceled", "cancelled")

type RangeSource = { pickupDate?: any; returnDate?: any; createdAt?: any; duration?: number }

// Khoảng thuê [start, end). Đơn cũ không có returnDate: (pickupDate ?? createdAt) + duration ngày
export function getBookingRange(b: RangeSource): { start: Date; end: Date } | null {
  const start = toDate(b.pickupDate) ?? toDate(b.createdAt)
  if (!start) return null
  const end = toDate(b.returnDate) ?? new Date(start.getTime() + (Number(b.duration) || 1) * DAY)
  return { start, end }
}

// Số ngày tính tiền: làm tròn lên theo từng 24 giờ, tối thiểu 1 ngày
export const daysBetween = (start: Date, end: Date) => Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY))

export const rangesOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && bStart < aEnd

// Xe trống trong [start, end) nếu không đơn/lịch giữ xe nào chồng lấn.
// Phần tử không có `status` (vd doc bookedSlots) luôn được coi là đang giữ xe.
export function isCarFree(
  items: (RangeSource & { id: string; status?: string })[],
  start: Date,
  end: Date,
  ignoreId?: string,
) {
  const open = OPEN_BOOKING_STATUSES.map(lower)
  return !items.some((b) => {
    if (b.id === ignoreId) return false
    if (b.status !== undefined && !open.includes(lower(b.status))) return false
    const range = getBookingRange(b)
    return !!range && rangesOverlap(range.start, range.end, start, end)
  })
}

export type PriceInput = {
  pricePerDay: number
  days: number
  addOns?: { price: number }[]
  promoCode?: string
  isFirstBooking?: boolean
  pickupDate?: Date
}

export type PriceBreakdown = {
  subtotal: number
  addOnTotal: number
  discount: number
  tax: number
  total: number
  promoError?: string // mã không hợp lệ / không đủ điều kiện → discount = 0
}

// Tiền thuê + dịch vụ thêm − giảm giá (chỉ trên tiền thuê) + VAT. Dịch vụ thêm tính một lần mỗi đơn.
export function calcBookingPrice({
  pricePerDay,
  days,
  addOns = [],
  promoCode,
  isFirstBooking = false,
  pickupDate,
}: PriceInput): PriceBreakdown {
  const subtotal = pricePerDay * days
  const addOnTotal = addOns.reduce((sum, a) => sum + a.price, 0)

  let discount = 0
  let promoError: string | undefined
  const code = promoCode?.trim().toUpperCase()
  if (code) {
    const promo = PROMO_CODES[code]
    const day = pickupDate?.getDay()
    if (!promo) promoError = "Mã giảm giá không tồn tại."
    else if (promo.firstBookingOnly && !isFirstBooking) promoError = "Mã này chỉ áp dụng cho chuyến thuê đầu tiên."
    else if (promo.weekendOnly && day !== 0 && day !== 6) promoError = "Mã này chỉ áp dụng khi nhận xe vào Thứ 7 hoặc Chủ nhật."
    else discount = Math.round((subtotal * promo.percent) / 100)
  }

  const tax = Math.round((subtotal + addOnTotal - discount) * VAT_RATE)
  return { subtotal, addOnTotal, discount, tax, total: subtotal + addOnTotal - discount + tax, promoError }
}

// Luồng trạng thái đơn (docs/PLAN.md D2, D7). So sánh không phân biệt hoa thường.
const TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["upcoming", "cancelled", "pending"], // về pending khi đổi lịch đơn chưa thanh toán
  upcoming: ["active", "cancelled"],
  active: ["completed"],
}

export const canTransition = (from?: string, to?: string) => (TRANSITIONS[lower(from)] ?? []).includes(lower(to))

type RefundSource = RangeSource & { price?: number; payment?: { status?: string; amount?: number } | null }

// Chính sách huỷ (D5): đã thanh toán, huỷ ≥ 24h trước giờ nhận → 100%, < 24h → 70%; admin huỷ → 100%.
export function calcRefund(booking: RefundSource, now = new Date(), byAdmin = false) {
  if (lower(booking.payment?.status) !== "completed") return { percent: 0, amount: 0 }
  const paid = Number(booking.payment?.amount ?? booking.price) || 0
  const start = getBookingRange(booking)?.start
  const percent = byAdmin || (start && start.getTime() - now.getTime() >= DAY) ? 100 : 70
  return { percent, amount: Math.round((paid * percent) / 100) }
}

// Phí trả xe trễ: mỗi giờ (làm tròn lên) = 10% giá ngày, tối đa bằng 1 ngày thuê
export function calcLateFee(returnDate: Date, actual: Date, pricePerDay: number) {
  const hours = Math.ceil((actual.getTime() - returnDate.getTime()) / HOUR)
  return hours <= 0 ? 0 : Math.min(Math.round(hours * pricePerDay * 0.1), pricePerDay)
}

export const calcDepositRefund = (deposit: number, fees: number) => Math.max(0, deposit - fees)
