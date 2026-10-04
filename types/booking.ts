export interface Booking {
  id: string
  userId: string
  carId: string
  carName: string
  carImage: string
  startDate: Date
  endDate: Date
  pickupLocation: string
  dropoffLocation: string
  status: BookingStatus
  totalCost: number
  addOns: BookingAddOn[]
  paymentMethod: string
  paymentStatus: PaymentStatus
  createdAt: Date
  updatedAt?: Date
}

export interface BookingAddOn {
  id: string
  name: string
  price: number
  selected: boolean
}

export type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled"
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"

export interface BookingRequest {
  carId: string
  startDate: Date
  endDate: Date
  pickupLocation: string
  dropoffLocation?: string
  addOns: string[]
  paymentMethodId: string
}

export interface BookingHistory {
  bookings: Booking[]
  totalBookings: number
  totalSpent: number
  averageRating: number
}
