"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "../config/firebase"
import { toDate } from "../utils/booking"

// Doc `reviews/{bookingId}` (đánh giá cũ trước G5 có id tự sinh, userName có thể là email)
export interface Review {
  id: string
  carId: string
  userId: string
  userName: string
  rating: number
  comment: string
  createdAt: any
}

const sortNewest = (list: Review[]) =>
  list.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0))

// Đánh giá của một xe, mới nhất trước
export function useCarReviews(carId?: string) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!carId) return
    setLoading(true)
    return onSnapshot(
      query(collection(db, "reviews"), where("carId", "==", carId)),
      (snap) => {
        setReviews(sortNewest(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review)))
        setLoading(false)
      },
      (err) => {
        console.error("Error fetching reviews:", err)
        setLoading(false)
      },
    )
  }, [carId])

  return { reviews, loading }
}

// Tất cả đánh giá (trang quản trị)
export function useAllReviews(enabled = true) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) return
    return onSnapshot(
      collection(db, "reviews"),
      (snap) => {
        setReviews(sortNewest(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review)))
        setLoading(false)
      },
      (err) => {
        console.error("Error fetching reviews:", err)
        setLoading(false)
      },
    )
  }, [enabled])

  return { reviews, loading }
}
