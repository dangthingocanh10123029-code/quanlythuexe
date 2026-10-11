// Doc `bookings/{id}` trên Firestore (docs/PLAN.md mục 4). Đơn cũ có thể thiếu các field mới.
export type BookingStatus = "Pending" | "Confirmed" | "Upcoming" | "Active" | "Completed" | "Cancelled" | "Rejected"
export type PaymentStatus = "Completed" | "Failed" | "Refunded" | "Pending" | "Cancelled" // Pending: tiền mặt chưa thu

export interface BookingAddOn {
  id: number
  name: string
  price: number
  selected?: boolean
}

export interface BookingPayment {
  method: string
  amount: number
  transactionId?: string
  paidAt?: any
  status: PaymentStatus
  refundAmount?: number
  refundPercent?: number
  refundedAt?: any
  failedAt?: any // giao dịch thất bại (failPayment)
  failReason?: string
  lastFourDigits?: string // thẻ ngân hàng
  cardholderName?: string
  phone?: string // ZaloPay
}

export interface Handover {
  at: any
  documentsChecked: boolean
  depositCollected: boolean
  conditionNote: string
  odometer: number
  fuelLevel: string
}

export interface ReturnInspection {
  at: any
  odometer: number
  fuelLevel: string
  damageNote: string
  lateFee: number
  extraFees: number
  depositRefund: number
}

export interface Booking {
  id: string
  userId: string
  carId: string
  carName: string
  pickupDate?: any // Timestamp
  returnDate?: any // Timestamp
  duration: number // số ngày
  location: string // điểm nhận
  returnLocation?: string
  subtotal?: number
  addOnTotal?: number
  discount?: number
  promoCode?: string
  tax?: number
  deposit?: number
  price: number // tổng thanh toán online
  selectedAddOns: BookingAddOn[]
  status: BookingStatus
  createdAt: any
  confirmedAt?: any
  rejectedAt?: any
  rejectReason?: string
  cancelledAt?: any
  cancelledBy?: "user" | "admin"
  payment?: BookingPayment
  handover?: Handover
  returnInspection?: ReturnInspection
  handedOverAt?: any
  returnedAt?: any
  reviewed?: boolean
}
