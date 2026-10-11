export type CarStatus = "Available" | "Rented" | "Maintenance" | "Inactive"
export type FuelType = "Xăng" | "Dầu diesel" | "Điện" | "Hybrid"
export type Transmission = "Số tự động" | "Số sàn"

// Doc `cars/{id}` trên Firestore (docs/PLAN.md mục 4)
export interface Car {
  id: string
  name: string
  brand: string
  model: string
  year: number
  type: string
  seats: number
  fuel: FuelType
  transmission: Transmission
  pricePerDay: number
  deposit: number
  location: string
  licensePlate: string
  description: string
  amenities: string[]
  imageKey?: string // ảnh có sẵn trong assets/cars (CAR_IMAGES)
  image?: string // data URI do admin tải lên
  status: CarStatus
  rating: number
  reviewCount: number
  bookings: number
  createdAt?: any
  updatedAt?: any
}
