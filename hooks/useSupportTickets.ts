"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "../config/firebase"
import { toDate } from "../utils/booking"
import { useUid } from "./useUid"

// Doc `supportTickets/{id}` (G7: thêm reply, repliedAt khi RENTO phản hồi)
export interface SupportTicket {
  id: string
  userId: string
  userEmail: string
  subject: string
  message: string
  priority: string
  status: "open" | "resolved"
  reply?: string
  repliedAt?: any
  createdAt: any
}

const newestFirst = (list: SupportTicket[]) =>
  list.sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0))

function useTickets(uid: string | null | undefined, enabled: boolean) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) {
      setTickets([])
      setLoading(false)
      return
    }
    setLoading(true)
    const ref = collection(db, "supportTickets")
    return onSnapshot(
      uid ? query(ref, where("userId", "==", uid)) : ref,
      (snap) => {
        setTickets(newestFirst(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SupportTicket)))
        setLoading(false)
      },
      (err) => {
        console.error("Error fetching support tickets:", err)
        setLoading(false)
      },
    )
  }, [uid, enabled])

  return { tickets, loading }
}

// Phiếu hỗ trợ của người đang đăng nhập
export function useMyTickets() {
  const uid = useUid()
  return useTickets(uid, !!uid)
}

// Tất cả phiếu (trang quản trị)
export function useAllTickets(enabled = true) {
  return useTickets(null, enabled)
}
