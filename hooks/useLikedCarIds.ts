"use client"

import { useState, useEffect } from "react"
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore"
import { db } from "../config/firebase"
import { useUid } from "./useUid"

// Id các xe người dùng đã thả tim. Doc `likedCars/${uid}_${carId}` nên không bị trùng.
export function useLikedCarIds() {
  const uid = useUid()
  const [likedIds, setLikedIds] = useState<string[]>([])

  useEffect(() => {
    if (!uid) {
      setLikedIds([])
      return
    }
    return onSnapshot(
      query(collection(db, "likedCars"), where("userId", "==", uid)),
      (snap) => setLikedIds([...new Set(snap.docs.map((d) => String(d.data().carId)))]),
      (err) => console.error("Error fetching liked cars:", err),
    )
  }, [uid])

  // Trả về true nếu vừa thích, false nếu vừa bỏ thích
  const toggleLike = async (carId: string): Promise<boolean> => {
    if (!uid) throw new Error("Vui lòng đăng nhập để lưu xe yêu thích.")
    if (likedIds.includes(carId)) {
      // Xoá cả doc cũ (id tự sinh, có thể trùng) lẫn doc theo id mới
      const snap = await getDocs(
        query(collection(db, "likedCars"), where("userId", "==", uid), where("carId", "==", carId)),
      )
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
      return false
    }
    await setDoc(doc(db, "likedCars", `${uid}_${carId}`), { userId: uid, carId, createdAt: serverTimestamp() })
    return true
  }

  return { likedIds, toggleLike }
}
