"use client"

import { useState, useEffect } from "react"
import { collection, doc, onSnapshot } from "firebase/firestore"
import { db } from "../config/firebase"
import type { DriverLicense } from "../types"
import { useUid } from "./useUid"

// GPLX của người đang đăng nhập (`licenses/{uid}`), null nếu chưa gửi
export function useLicense() {
  const uid = useUid()
  const [license, setLicense] = useState<DriverLicense | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setLicense(null)
      setLoading(false)
      return
    }
    setLoading(true)
    return onSnapshot(
      doc(db, "licenses", uid),
      (snap) => {
        setLicense(snap.exists() ? ({ userId: uid, ...snap.data() } as DriverLicense) : null)
        setLoading(false)
      },
      (err) => {
        console.error("Error fetching license:", err)
        setLoading(false)
      },
    )
  }, [uid])

  return { license, loading }
}

// Tất cả GPLX (trang quản trị). Lọc theo status phía client.
export function useAllLicenses(enabled = true) {
  const [licenses, setLicenses] = useState<DriverLicense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) return
    return onSnapshot(
      collection(db, "licenses"),
      (snap) => {
        setLicenses(snap.docs.map((d) => ({ ...d.data(), userId: d.id }) as DriverLicense))
        setLoading(false)
      },
      (err) => {
        console.error("Error fetching licenses:", err)
        setLoading(false)
      },
    )
  }, [enabled])

  return { licenses, loading }
}
