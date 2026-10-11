"use client"

import { useState, useEffect } from "react"
import type { ImageSourcePropType } from "react-native"
import { collection, doc, onSnapshot } from "firebase/firestore"
import { db } from "../config/firebase"
import { CAR_IMAGES } from "../data/assets"
import type { Car } from "../types/car"

const toMillis = (v: any): number => (v?.toDate ? v.toDate().getTime() : v ? new Date(v).getTime() || 0 : 0)

// Xe admin tạo trước khi có hợp đồng dữ liệu có thể thiếu field → điền mặc định
const toCar = (id: string, data: any): Car => ({
  name: "",
  brand: "",
  model: "",
  year: 0,
  type: "",
  fuel: "Xăng",
  transmission: "Số tự động",
  location: "",
  licensePlate: "",
  description: "",
  amenities: [],
  status: "Available",
  rating: 0,
  reviewCount: 0,
  bookings: 0,
  ...data,
  id,
  pricePerDay: Number(data.pricePerDay) || 0,
  deposit: Number(data.deposit) || 0,
  seats: Number(data.seats) || 0,
})

// Ảnh xe: ảnh có sẵn theo imageKey, nếu không thì data URI admin tải lên
export const getCarImage = (car?: Pick<Car, "imageKey" | "image"> | null): ImageSourcePropType =>
  (car?.imageKey && CAR_IMAGES[car.imageKey]) || (car?.image ? { uri: car.image } : {})

// Toàn bộ xe trên Firestore `cars` (realtime). Xe mới thêm lên đầu, xe mẫu theo thứ tự id.
export function useCars() {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () =>
      onSnapshot(
        collection(db, "cars"),
        (snapshot) => {
          const list = snapshot.docs.map((d) => toCar(d.id, d.data()))
          list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt) || Number(a.id) - Number(b.id))
          setCars(list)
          setLoading(false)
          setError(null)
        },
        (err) => {
          console.error("Error fetching cars:", err)
          setError("Không tải được danh sách xe")
          setLoading(false)
        },
      ),
    [],
  )

  return { cars, loading, error }
}

export function useCar(id?: string) {
  const [car, setCar] = useState<Car | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setCar(null)
      setLoading(false)
      return
    }
    setLoading(true)
    return onSnapshot(
      doc(db, "cars", id),
      (snap) => {
        setCar(snap.exists() ? toCar(snap.id, snap.data()) : null)
        setLoading(false)
      },
      (err) => {
        console.error("Error fetching car:", err)
        setLoading(false)
      },
    )
  }, [id])

  return { car, loading }
}
