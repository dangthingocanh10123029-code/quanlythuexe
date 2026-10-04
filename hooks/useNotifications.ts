"use client"

import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore"
import { db } from "../config/firebase"
import type { Notification } from "../types"
import { useAuth } from "./useAuth"

const createdAtMs = (value: any): number =>
  value?.toDate ? value.toDate().getTime() : value ? new Date(value).getTime() || 0 : 0

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.id),
    )

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[]
        notificationsData.sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt))

        setNotifications(notificationsData)
        setLoading(false)
        setError(null)
      },
      (error) => {
        console.error("Error fetching notifications:", error)
        setError("Failed to fetch notifications")
        setLoading(false)
      },
    )

    return unsubscribe
  }, [user])

  const unreadCount = notifications.filter((notification) => !notification.read).length

  const markAsRead = async (notificationId: string) => {
    await updateDoc(doc(db, "notifications", notificationId), { read: true })
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter((notification) => !notification.read)
    if (unread.length === 0) return
    const batch = writeBatch(db)
    unread.forEach((notification) => batch.update(doc(db, "notifications", notification.id), { read: true }))
    await batch.commit()
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
  }
}
