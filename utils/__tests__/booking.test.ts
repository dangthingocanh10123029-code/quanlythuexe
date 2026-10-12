import { describe, expect, it } from "@jest/globals"
import {
  applyRating,
  bookingRevenue,
  calcReturnSettlement,
  calcCompensation,
  findPickupReminder,
  listPayments,
  summarizePayments,
  calcBookingPrice,
  calcDepositRefund,
  calcLateFee,
  calcRefund,
  canTransition,
  daysBetween,
  getBookingRange,
  isCarFree,
  rangesOverlap,
} from "../booking"

const d = (s: string) => new Date(s)
const HOUR = 3_600_000

describe("getBookingRange", () => {
  it("dùng returnDate khi có", () => {
    expect(getBookingRange({ pickupDate: d("2026-10-10T09:00"), returnDate: d("2026-10-12T09:00") })).toEqual({
      start: d("2026-10-10T09:00"),
      end: d("2026-10-12T09:00"),
    })
  })
  it("đơn cũ: (pickupDate ?? createdAt) + duration", () => {
    expect(getBookingRange({ createdAt: { seconds: d("2026-10-10T00:00").getTime() / 1000 }, duration: 3 })?.end).toEqual(
      d("2026-10-13T00:00"),
    )
  })
  it("không có ngày → null", () => expect(getBookingRange({})).toBeNull())
})

describe("daysBetween / rangesOverlap", () => {
  it("làm tròn lên, tối thiểu 1", () => {
    expect(daysBetween(d("2026-10-10T09:00"), d("2026-10-11T09:00"))).toBe(1)
    expect(daysBetween(d("2026-10-10T09:00"), d("2026-10-11T10:00"))).toBe(2)
    expect(daysBetween(d("2026-10-10T09:00"), d("2026-10-10T10:00"))).toBe(1)
  })
  it("khoảng nửa mở: trả lúc 9h, nhận lúc 9h không trùng", () => {
    expect(rangesOverlap(d("2026-10-10"), d("2026-10-12"), d("2026-10-12"), d("2026-10-13"))).toBe(false)
    expect(rangesOverlap(d("2026-10-10"), d("2026-10-12"), d("2026-10-11"), d("2026-10-13"))).toBe(true)
  })
})

describe("isCarFree", () => {
  const bookings = [
    { id: "a", status: "Upcoming", pickupDate: d("2026-10-10"), returnDate: d("2026-10-12") },
    { id: "b", status: "Cancelled", pickupDate: d("2026-10-20"), returnDate: d("2026-10-22") },
    { id: "slot", pickupDate: d("2026-11-01"), returnDate: d("2026-11-03") }, // bookedSlots: không có status
  ]
  it("trùng đơn còn hiệu lực → bận", () => expect(isCarFree(bookings, d("2026-10-11"), d("2026-10-13"))).toBe(false))
  it("bỏ qua đơn đã huỷ", () => expect(isCarFree(bookings, d("2026-10-20"), d("2026-10-21"))).toBe(true))
  it("slot không status luôn giữ xe", () => expect(isCarFree(bookings, d("2026-11-02"), d("2026-11-04"))).toBe(false))
  it("bỏ qua chính đơn đang đổi lịch", () => expect(isCarFree(bookings, d("2026-10-11"), d("2026-10-13"), "a")).toBe(true))
})

describe("calcBookingPrice", () => {
  const base = { pricePerDay: 1_000_000, days: 2, addOns: [{ price: 100_000 }] }
  it("không mã: tạm tính + dịch vụ + VAT 10%", () => {
    expect(calcBookingPrice(base)).toEqual({ subtotal: 2_000_000, addOnTotal: 100_000, discount: 0, tax: 210_000, total: 2_310_000, promoError: undefined })
  })
  it("FIRST20 giảm trên tiền thuê, trước VAT", () => {
    const p = calcBookingPrice({ ...base, promoCode: "first20", isFirstBooking: true })
    expect(p.discount).toBe(400_000)
    expect(p.tax).toBe(170_000)
    expect(p.total).toBe(1_870_000)
  })
  it("FIRST20 khi đã có đơn → lỗi, không giảm", () => {
    const p = calcBookingPrice({ ...base, promoCode: "FIRST20", isFirstBooking: false })
    expect(p.discount).toBe(0)
    expect(p.promoError).toBeTruthy()
  })
  it("WEEKEND50 chỉ khi nhận xe T7/CN", () => {
    expect(calcBookingPrice({ ...base, promoCode: "WEEKEND50", pickupDate: d("2026-10-10T09:00") }).discount).toBe(1_000_000) // Thứ 7
    expect(calcBookingPrice({ ...base, promoCode: "WEEKEND50", pickupDate: d("2026-10-12T09:00") }).promoError).toBeTruthy() // Thứ 2
  })
  it("mã không tồn tại", () => expect(calcBookingPrice({ ...base, promoCode: "ABC" }).promoError).toBe("Mã giảm giá không tồn tại."))
})

describe("canTransition", () => {
  it.each([
    ["Pending", "Confirmed", true],
    ["Pending", "Rejected", true],
    ["Confirmed", "Upcoming", true],
    ["Confirmed", "Pending", true],
    ["Upcoming", "Active", true],
    ["Active", "Completed", true],
    ["Active", "Cancelled", false],
    ["Pending", "Upcoming", false],
    ["Completed", "Cancelled", false],
    ["pending", "CANCELLED", true],
  ])("%s → %s = %s", (from, to, ok) => expect(canTransition(from, to)).toBe(ok))
})

describe("calcRefund", () => {
  const now = d("2026-10-10T09:00")
  const paid = { price: 1_000_000, payment: { status: "Completed", amount: 1_000_000 } }
  it("chưa thanh toán → 0", () => expect(calcRefund({ price: 1_000_000, pickupDate: d("2026-10-20") }, now)).toEqual({ percent: 0, amount: 0 }))
  it("≥ 24h → 100%", () => expect(calcRefund({ ...paid, pickupDate: new Date(now.getTime() + 24 * HOUR) }, now)).toEqual({ percent: 100, amount: 1_000_000 }))
  it("< 24h → 70%", () => expect(calcRefund({ ...paid, pickupDate: new Date(now.getTime() + 23 * HOUR) }, now)).toEqual({ percent: 70, amount: 700_000 }))
  it("admin huỷ → 100%", () => expect(calcRefund({ ...paid, pickupDate: new Date(now.getTime() + HOUR) }, now, true).percent).toBe(100))
})

describe("calcLateFee / calcDepositRefund", () => {
  const due = d("2026-10-12T09:00")
  it("đúng giờ → 0", () => expect(calcLateFee(due, d("2026-10-12T08:30"), 1_000_000)).toBe(0))
  it("trễ 1 phút tính 1 giờ = 10%", () => expect(calcLateFee(due, d("2026-10-12T09:01"), 1_000_000)).toBe(100_000))
  it("tối đa 1 ngày", () => expect(calcLateFee(due, d("2026-10-13T09:00"), 1_000_000)).toBe(1_000_000))
  it("hoàn cọc không âm", () => {
    expect(calcDepositRefund(5_000_000, 1_200_000)).toBe(3_800_000)
    expect(calcDepositRefund(5_000_000, 9_000_000)).toBe(0)
  })
})

describe("calcReturnSettlement", () => {
  it("trễ 2 giờ + phí phát sinh trừ vào cọc", () => {
    expect(
      calcReturnSettlement({
        deposit: 5_000_000,
        pricePerDay: 1_000_000,
        returnDate: d("2026-10-12T09:00"),
        actual: d("2026-10-12T10:30"),
        extraFees: 300_000,
      }),
    ).toEqual({ lateFee: 200_000, extraFees: 300_000, depositRefund: 4_500_000, extraDue: 0 })
  })
})

describe("bookingRevenue", () => {
  it("đã thanh toán + phí phát sinh", () =>
    expect(bookingRevenue({ payment: { status: "Completed", amount: 2_000_000 }, returnInspection: { lateFee: 100_000, extraFees: 50_000 } })).toBe(2_150_000))
  it("đã hoàn tiền một phần", () =>
    expect(bookingRevenue({ payment: { status: "Refunded", amount: 1_000_000, refundAmount: 700_000 } })).toBe(300_000))
  it("thanh toán thất bại / chưa thanh toán → 0", () => {
    expect(bookingRevenue({ payment: { status: "Failed", amount: 1_000_000 } })).toBe(0)
    expect(bookingRevenue({})).toBe(0)
  })
})

describe("applyRating", () => {
  it("đánh giá đầu tiên", () => expect(applyRating(4.8, 0, 5, "add")).toEqual({ rating: 5, reviewCount: 1 }))
  it("thêm vào trung bình", () => expect(applyRating(4, 2, 5, "add")).toEqual({ rating: 4.3, reviewCount: 3 }))
  it("xoá đánh giá", () => expect(applyRating(4.5, 2, 5, "remove")).toEqual({ rating: 4, reviewCount: 1 }))
  it("xoá đánh giá cuối", () => expect(applyRating(5, 1, 5, "remove")).toEqual({ rating: 0, reviewCount: 0 }))
})

describe("findPickupReminder", () => {
  const now = d("2026-10-10T09:00")
  it("chỉ đơn Upcoming trong 24h tới, gần nhất trước", () => {
    const list = [
      { id: "far", status: "Upcoming", pickupDate: d("2026-10-12T09:00") },
      { id: "soon", status: "Upcoming", pickupDate: d("2026-10-10T20:00") },
      { id: "sooner", status: "Upcoming", pickupDate: d("2026-10-10T12:00") },
      { id: "unpaid", status: "Confirmed", pickupDate: d("2026-10-10T10:00") },
      { id: "past", status: "Upcoming", pickupDate: d("2026-10-10T08:00") },
    ]
    expect(findPickupReminder(list, now)?.id).toBe("sooner")
  })
  it("không có → null", () => expect(findPickupReminder([], now)).toBeNull())
})

describe("listPayments / summarizePayments", () => {
  const bookings = [
    { id: "a", carName: "X", payment: { method: "MoMo", amount: 1_000_000, status: "Completed", paidAt: d("2026-10-01") } },
    { id: "b", carName: "Y", payment: { method: "Thẻ ngân hàng", amount: 2_000_000, status: "Refunded", paidAt: d("2026-10-03"), refundAmount: 1_400_000 } },
    { id: "c", carName: "Z", payment: { method: "Tiền mặt", amount: 500_000, status: "Pending" } },
    { id: "d", carName: "W", payment: { method: "ZaloPay", amount: 800_000, status: "Failed", failedAt: d("2026-10-02") } },
    { id: "e", carName: "V" },
  ]
  const rows = listPayments(bookings)
  it("bỏ đơn chưa có payment, mới nhất trước", () => expect(rows.map((r) => r.bookingId)).toEqual(["b", "d", "a", "c"]))
  it("tổng hợp", () =>
    expect(summarizePayments(rows)).toEqual({
      totalPaid: 3_000_000,
      totalRefunded: 1_400_000,
      pendingCash: 500_000,
      failedCount: 1,
      byMethod: { MoMo: 1_000_000, "Thẻ ngân hàng": 2_000_000 },
    }))
})

describe("calcCompensation / vượt cọc", () => {
  it("đơn giá × số lượng, hạng mục nhập tay, bỏ hạng mục lạ", () => {
    const r = calcCompensation([{ id: "scratch", qty: 2 }, { id: "traffic_fine", amount: 800_000 }, { id: "unknown", qty: 1 }, { id: "accident", amount: 0 }])
    expect(r.total).toBe(1_800_000)
    expect(r.lines.map((l) => l.id)).toEqual(["scratch", "traffic_fine"])
  })
  it("phí vượt cọc → khách trả thêm", () =>
    expect(calcReturnSettlement({ deposit: 5_000_000, pricePerDay: 1_000_000, returnDate: d("2026-10-12T09:00"), actual: d("2026-10-12T09:00"), extraFees: 7_000_000 })).toEqual({
      lateFee: 0, extraFees: 7_000_000, depositRefund: 0, extraDue: 2_000_000,
    }))
})
