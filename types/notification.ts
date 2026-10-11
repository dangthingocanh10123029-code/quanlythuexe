// Doc `notifications/{auto}` trên Firestore (docs/PLAN.md mục 4)
export type NotificationType = "booking" | "payment" | "license" | "support" | "system"

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  bookingId?: string
  read: boolean
  createdAt: any
}
