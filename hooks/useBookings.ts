"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "../config/firebase"
import { useAuth } from "./useAuth"
import type { Booking } from "../types/booking"

const createdAtMs = (value: any): number =>
  value?.toDate ? value.toDate().getTime() : value ? new Date(value).getTime() || 0 : 0

export function useBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setBookings([])
      setLoading(false)
      return
    }

    const bookingsQuery = query(
      collection(db, "bookings"),
      where("userId", "==", user.id),
    )

    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Booking[]
        data.sort((a, b) => createdAtMs((b as any).createdAt) - createdAtMs((a as any).createdAt))
        setBookings(data)
        setLoading(false)
        setError(null)
      },
      (error) => {
        console.error("Error fetching bookings:", error)
        setError("Failed to fetch bookings")
        setLoading(false)
      },
    )

    return unsubscribe
  }, [user])

  const activeBookings = useMemo(
    () => bookings.filter((booking) => ["active", "confirmed"].includes(booking.status)),
    [bookings],
  )

  const pastBookings = useMemo(
    () => bookings.filter((booking) => ["completed", "cancelled"].includes(booking.status)),
    [bookings],
  )

  const totalSpent = useMemo(() => pastBookings.reduce((sum, booking) => sum + booking.totalCost, 0), [pastBookings])

  return {
    bookings,
    activeBookings,
    pastBookings,
    totalSpent,
    totalBookings: pastBookings.length,
    loading,
    error,
  }
}
