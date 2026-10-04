"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore"
import { db } from "../config/firebase"
import type { Car, CarFilter } from "../types/car"

export function useCars(filter?: CarFilter) {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let carsQuery = query(collection(db, "cars"), orderBy("createdAt", "desc"))

    // Apply filters
    if (filter?.brand) {
      carsQuery = query(carsQuery, where("brand", "==", filter.brand))
    }
    if (filter?.type) {
      carsQuery = query(carsQuery, where("type", "==", filter.type))
    }
    if (filter?.location) {
      carsQuery = query(carsQuery, where("location", "==", filter.location))
    }

    const unsubscribe = onSnapshot(
      carsQuery,
      (snapshot) => {
        let carsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Car[]

        // Apply client-side filters
        if (filter?.priceRange) {
          carsData = carsData.filter(
            (car) => car.pricePerDay >= filter.priceRange!.min && car.pricePerDay <= filter.priceRange!.max,
          )
        }

        if (filter?.seats) {
          carsData = carsData.filter((car) => car.seats >= filter.seats!)
        }

        setCars(carsData)
        setLoading(false)
        setError(null)
      },
      (error) => {
        console.error("Error fetching cars:", error)
        setError("Failed to fetch cars")
        setLoading(false)
      },
    )

    return unsubscribe
  }, [filter])

  const featuredCars = useMemo(() => cars.filter((car) => car.rating >= 4.5).slice(0, 5), [cars])

  const availableCars = useMemo(() => cars.filter((car) => car.availability), [cars])

  return {
    cars,
    featuredCars,
    availableCars,
    loading,
    error,
  }
}
