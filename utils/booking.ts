// Nghiệp vụ đặt xe dạng hàm thuần (không gọi Firestore) — có test trong utils/__tests__/booking.test.ts
import { COMPENSATION_POLICY, OPEN_BOOKING_STATUSES, PROMO_CODES, VAT_RATE } from "./constants"

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

// Quyết toán khi nhận lại xe (D4): phí trễ + phí phát sinh trừ vào tiền cọc
export function calcReturnSettlement(input: {
  deposit: number
  pricePerDay: number
  returnDate: Date // giờ trả theo đơn
  actual: Date // giờ trả thực tế
  extraFees?: number
}) {
  const lateFee = calcLateFee(input.returnDate, input.actual, input.pricePerDay)
  const extraFees = Math.max(0, Math.round(input.extraFees ?? 0))
  const fees = lateFee + extraFees
  // extraDue: phần phí vượt tiền cọc khách phải trả thêm
  return { lateFee, extraFees, depositRefund: calcDepositRefund(input.deposit, fees), extraDue: Math.max(0, fees - input.deposit) }
}

type RevenueSource = {
  payment?: { status?: string; amount?: number; refundAmount?: number } | null
  returnInspection?: { lateFee?: number; extraFees?: number } | null
}

// Doanh thu một đơn (L4.3) = tiền thuê đã thanh toán − tiền hoàn + phí phát sinh khi trả xe
export function bookingRevenue(b: RevenueSource) {
  const status = lower(b.payment?.status)
  const paid = status === "completed" || status === "refunded" ? Number(b.payment?.amount) || 0 : 0
  const refund = status === "refunded" ? Number(b.payment?.refundAmount) || 0 : 0
  const fees = (Number(b.returnInspection?.lateFee) || 0) + (Number(b.returnInspection?.extraFees) || 0)
  return paid - refund + fees
}

// Điểm trung bình mới khi thêm (+) hoặc bớt (−) một đánh giá; làm tròn 1 chữ số thập phân
export function applyRating(avg: number, count: number, rating: number, op: "add" | "remove") {
  const total = avg * count + (op === "add" ? rating : -rating)
  const nextCount = Math.max(0, count + (op === "add" ? 1 : -1))
  return { rating: nextCount ? Math.round((total / nextCount) * 10) / 10 : 0, reviewCount: nextCount }
}

// Đơn "Sắp nhận xe" có giờ nhận trong 24 giờ tới (nhắc trên Trang chủ), gần nhất trước; null nếu không có
export function findPickupReminder<T extends RangeSource & { status?: string }>(bookings: T[], now = new Date()): T | null {
  const soon = bookings
    .filter((b) => lower(b.status) === "upcoming")
    .map((b) => ({ b, start: getBookingRange(b)?.start.getTime() ?? 0 }))
    .filter(({ start }) => start >= now.getTime() && start - now.getTime() <= DAY)
    .sort((x, y) => x.start - y.start)
  return soon[0]?.b ?? null
}

export type PaymentRow = {
  bookingId: string
  userId: string
  carName: string
  method: string
  amount: number
  status: string // Completed | Failed | Refunded | Pending (tiền mặt chưa thu)
  at: Date | null // thời điểm thanh toán / thất bại
  refundAmount: number
  refundedAt: Date | null
}

type PaymentSource = {
  id: string
  userId?: string
  carName?: string
  payment?: {
    method?: string
    amount?: number
    status?: string
    paidAt?: any
    failedAt?: any
    refundAmount?: number
    refundedAt?: any
  } | null
}

// Danh sách thanh toán suy ra từ bookings (L7.5), mới nhất trước
export function listPayments(bookings: PaymentSource[]): PaymentRow[] {
  return bookings
    .filter((b) => b.payment)
    .map((b) => {
      const p = b.payment!
      return {
        bookingId: b.id,
        userId: b.userId ?? "",
        carName: b.carName ?? "",
        method: p.method ?? "",
        amount: Number(p.amount) || 0,
        status: p.status ?? "",
        at: toDate(p.paidAt) ?? toDate(p.failedAt),
        refundAmount: Number(p.refundAmount) || 0,
        refundedAt: toDate(p.refundedAt),
      }
    })
    .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
}

// Tổng hợp: đã thu (gồm đơn đã hoàn), đã hoàn, chờ thu tiền mặt, số giao dịch lỗi, đã thu theo phương thức
export function summarizePayments(rows: PaymentRow[]) {
  const collected = rows.filter((r) => ["completed", "refunded"].includes(lower(r.status)))
  const byMethod: Record<string, number> = {}
  for (const r of collected) byMethod[r.method] = (byMethod[r.method] ?? 0) + r.amount
  return {
    totalPaid: collected.reduce((sum, r) => sum + r.amount, 0),
    totalRefunded: rows.reduce((sum, r) => sum + (lower(r.status) === "refunded" ? r.refundAmount : 0), 0),
    pendingCash: rows.filter((r) => lower(r.status) === "pending").reduce((sum, r) => sum + r.amount, 0),
    failedCount: rows.filter((r) => lower(r.status) === "failed").length,
    byMethod,
  }
}

export type CompensationInput = { id: string; qty?: number; amount?: number }

// Tiền đền bù theo COMPENSATION_POLICY (G9): hạng mục có đơn giá = đơn giá × số lượng; hạng mục "custom" dùng amount nhập tay.
// Hạng mục không có trong chính sách hoặc số tiền ≤ 0 bị bỏ qua.
export function calcCompensation(items: CompensationInput[]) {
  const lines = items
    .map((item) => {
      const policy = COMPENSATION_POLICY.find((p) => p.id === item.id)
      if (!policy) return null
      const qty = Math.max(1, Math.round(item.qty ?? 1))
      const amount = policy.custom ? Math.max(0, Math.round(item.amount ?? 0)) : (policy.unit ?? 0) * qty
      return amount > 0 ? { id: policy.id, label: policy.label, qty: policy.custom ? 1 : qty, amount } : null
    })
    .filter((l): l is { id: string; label: string; qty: number; amount: number } => l !== null)
  return { lines, total: lines.reduce((sum, l) => sum + l.amount, 0) }
}
