export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: any
  read: boolean
  createdAt: Date
  expiresAt?: Date
}

export type NotificationType =
  | "booking_confirmed"
  | "booking_reminder"
  | "payment_successful"
  | "payment_failed"
  | "car_returned"
  | "review_request"
  | "promotion"
  | "system_update"
  | "emergency"

export interface NotificationPreferences {
  push: boolean
  email: boolean
  sms: boolean
  types: {
    [key in NotificationType]: boolean
  }
}
