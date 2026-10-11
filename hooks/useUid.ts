"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../config/firebase"

// uid người đang đăng nhập (null nếu chưa). Nhẹ hơn useAuth vì không đọc doc `users`.
export function useUid() {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null)
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), [])
  return uid
}
