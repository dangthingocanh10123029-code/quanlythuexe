"use client"

import { useState, useEffect } from "react"
import { collection, doc, onSnapshot, query, where } from "firebase/firestore"
import { db } from "../config/firebase"
import type { Booking } from "../types/booking"
import { toDate } from "../utils/booking"
import { useUid } from "./useUid"

// Đơn của người đang đăng nhập, mới nhất trước. Không dùng orderBy (where + orderBy cần composite index).
export function useUserBookings() {
  const uid = useUid()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setBookings([])
      setLoading(false)
      return
    }
    setLoading(true)
    return onSnapshot(
      query(collection(db, "bookings"), where("userId", "==", uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking)
        list.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0))
        setBookings(list)
        setLoading(false)
      },
      (err) => {
        console.error("Error fetching bookings:", err)
        setLoading(false)
      },
    )
  }, [uid])

  return { bookings, loading }
}

// Một đơn theo id (realtime), null nếu không có / không có quyền đọc
export function useBooking(id?: string) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setBooking(null)
      setLoading(false)
      return
    }
    setLoading(true)
    return onSnapshot(
      doc(db, "bookings", id),
      (snap) => {
        setBooking(snap.exists() ? ({ id: snap.id, ...snap.data() } as Booking) : null)
        setLoading(false)
      },
      (err) => {
        console.error("Error fetching booking:", err)
        setBooking(null)
        setLoading(false)
      },
    )
  }, [id])

  return { booking, loading }
}
