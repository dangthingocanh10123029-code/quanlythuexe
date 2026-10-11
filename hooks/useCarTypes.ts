"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "../config/firebase"

// Doc `carTypes/{id}` = { name, createdAt } (G7). Sắp xếp theo tên.
export interface CarType {
  id: string
  name: string
}

export function useCarTypes() {
  const [carTypes, setCarTypes] = useState<CarType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(
    () =>
      onSnapshot(
        collection(db, "carTypes"),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, name: String(d.data().name ?? "") }))
          setCarTypes(list.sort((a, b) => a.name.localeCompare(b.name, "vi")))
          setLoading(false)
        },
        (err) => {
          console.error("Error fetching car types:", err)
          setLoading(false)
        },
      ),
    [],
  )

  return { carTypes, loading }
}
