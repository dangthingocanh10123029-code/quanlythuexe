import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "../config/firebase"
import type { NotificationType } from "../types/notification"

type NotifyInput = { type: NotificationType; title: string; message: string; bookingId?: string }

// Thông báo trong app (không push). Lỗi ghi thông báo không được làm hỏng thao tác chính.
export async function notify(userId: string, { bookingId, ...rest }: NotifyInput) {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      ...rest,
      ...(bookingId ? { bookingId } : {}),
      read: false,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Không gửi được thông báo:", error)
  }
}
