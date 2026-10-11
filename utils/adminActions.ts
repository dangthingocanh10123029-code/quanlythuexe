// Ghi Firestore cho chức năng quản trị mở rộng (G7). Lỗi nghiệp vụ ném Error tiếng Việt.
import { addDoc, collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore"
import { db } from "../config/firebase"
import { notify } from "./notify"

// ===== Phiếu hỗ trợ =====

// RENTO phản hồi phiếu → "resolved" + thông báo cho khách
export async function replyTicket(ticketId: string, reply: string) {
  if (!reply.trim()) throw new Error("Vui lòng nhập nội dung phản hồi.")
  const snap = await getDoc(doc(db, "supportTickets", ticketId))
  if (!snap.exists()) throw new Error("Không tìm thấy phiếu hỗ trợ.")
  const ticket = snap.data()
  await updateDoc(snap.ref, { reply: reply.trim(), status: "resolved", repliedAt: new Date() })
  await notify(ticket.userId, {
    type: "support",
    title: "RENTO đã phản hồi yêu cầu hỗ trợ",
    message: `${ticket.subject}: ${reply.trim()}`,
  })
}

// ===== Loại xe (`carTypes`) =====

export async function addCarType(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Vui lòng nhập tên loại xe.")
  if (trimmed.length > 30) throw new Error("Tên loại xe tối đa 30 ký tự.")
  const all = await getDocs(collection(db, "carTypes"))
  if (all.docs.some((d) => String(d.data().name).toLowerCase() === trimmed.toLowerCase()))
    throw new Error("Loại xe này đã có.")
  await addDoc(collection(db, "carTypes"), { name: trimmed, createdAt: new Date() })
}

// Xoá loại xe; chặn nếu còn xe thuộc loại này
export async function deleteCarType(id: string) {
  const snap = await getDoc(doc(db, "carTypes", id))
  if (!snap.exists()) return
  const used = await getDocs(query(collection(db, "cars"), where("type", "==", snap.data().name)))
  if (!used.empty) throw new Error(`Còn ${used.size} xe thuộc loại này, hãy đổi loại cho các xe đó trước.`)
  await deleteDoc(snap.ref)
}

// ===== Vai trò =====

// Admin gán / bỏ vai trò nhân viên (chủ xe). Nhân viên vào được trang quản trị nhưng không quản lý người dùng.
export async function setUserRole(uid: string, role: "staff" | null) {
  await updateDoc(doc(db, "users", uid), { role: role ?? deleteField(), updatedAt: new Date() })
}
