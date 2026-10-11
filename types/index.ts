export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface Location {
  latitude: number
  longitude: number
  address: string
  city: string
  country: string
}

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatar?: string | null;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt?: Date;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
}

export interface UserProfile extends User {
  licenseInfo?: DriverLicense
  paymentMethods?: PaymentMethod[]
  preferences?: UserPreferences
}

export type LicenseStatus = "pending" | "verified" | "rejected"

// Doc `licenses/{uid}` (ảnh base64 tách khỏi `users`)
export interface DriverLicense {
  userId: string
  licenseNumber: string // 12 chữ số
  expiryDate: string // dd/mm/yyyy
  issuingAuthority: string
  licenseClass: string
  frontImage: string
  backImage: string
  status: LicenseStatus
  submittedAt?: any
  reviewedAt?: any
  rejectReason?: string
}

export interface PaymentMethod {
  id: string
  type: "card" | "momo" | "zalopay"
  name: string
  isDefault: boolean
  details: {
    cardNumber?: string
    expiryDate?: string
    cardholderName?: string
    email?: string
    phone?: string
  }
}

export interface UserPreferences {
  pushNotifications: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  locationServices: boolean
  biometricAuth: boolean
  darkMode: boolean
  autoBackup: boolean
  marketingEmails: boolean
  language: string
  currency: string
}

export type { Notification, NotificationType } from "./notification"
