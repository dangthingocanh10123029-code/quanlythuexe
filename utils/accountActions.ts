// Ghi Firestore / Auth cho tài khoản (G6). Lỗi nghiệp vụ ném Error tiếng Việt; lỗi Firebase giữ nguyên `code`.
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth"
import { doc, runTransaction } from "firebase/firestore"
import { auth, db } from "../config/firebase"
import { normalizePhone, validateIdNumber, validatePhone } from "./helpers"

const accountError = (message: string, code?: string) => Object.assign(new Error(message), { code })

const PHONE_TAKEN = "Số điện thoại này đã được dùng cho tài khoản khác."

export type RegisterInput = {
  fullName: string
  email: string
  password: string
  phone: string
  address: string
  idNumber: string // CCCD 12 số
}

// Kiểm tra trước khi gọi Firebase (UI dùng để hiện lỗi từng ô)
export function validateRegister(input: RegisterInput): Partial<Record<keyof RegisterInput, string>> {
  const errors: Partial<Record<keyof RegisterInput, string>> = {}
  if (!input.fullName.trim()) errors.fullName = "Vui lòng nhập họ và tên."
  if (!input.email.trim()) errors.email = "Vui lòng nhập email."
  if (input.password.length < 6) errors.password = "Mật khẩu cần có ít nhất 6 ký tự."
  if (!validatePhone(input.phone)) errors.phone = "Số điện thoại không hợp lệ (vd 0912 345 678)."
  if (!input.address.trim()) errors.address = "Vui lòng nhập địa chỉ."
  if (!validateIdNumber(input.idNumber)) errors.idNumber = "Số CCCD gồm 12 chữ số."
  return errors
}

// Tạo tài khoản + doc `users/{uid}` + giữ chỗ `phones/{phone}` (transaction). SĐT trùng → xoá tài khoản
// vừa tạo và ném Error code "phone-taken".
export async function registerAccount(input: RegisterInput) {
  const errors = Object.values(validateRegister(input))
  if (errors.length > 0) throw accountError(errors[0])

  const phone = normalizePhone(input.phone)
  const { user } = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password)
  try {
    await runTransaction(db, async (tx) => {
      const phoneRef = doc(db, "phones", phone)
      if ((await tx.get(phoneRef)).exists()) throw accountError(PHONE_TAKEN, "phone-taken")
      tx.set(phoneRef, { uid: user.uid })
      tx.set(doc(db, "users", user.uid), {
        id: user.uid,
        email: input.email.trim(),
        fullName: input.fullName.trim(),
        phone,
        address: input.address.trim(),
        idNumber: input.idNumber.replace(/\s/g, ""),
        avatar: null,
        isAdmin: false,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        dateOfBirth: "",
        emergencyContact: "",
      })
    })
  } catch (error) {
    await deleteUser(user).catch((e) => console.error("Không xoá được tài khoản dở dang:", e))
    throw error
  }
  await updateProfile(user, { displayName: input.fullName.trim() })
  return user.uid
}

export type PersonalInfoInput = {
  fullName: string
  phone: string
  dateOfBirth: string
  address: string
  emergencyContact: string
  avatar: string
  idNumber: string
}

// Lưu thông tin cá nhân; đổi SĐT thì chuyển chỗ giữ `phones/{phone}` (chặn trùng)
export async function updatePersonalInfo(uid: string, info: PersonalInfoInput) {
  if (!info.fullName.trim()) throw accountError("Vui lòng nhập họ và tên.")
  if (info.phone && !validatePhone(info.phone)) throw accountError("Số điện thoại không hợp lệ.")
  if (info.idNumber && !validateIdNumber(info.idNumber)) throw accountError("Số CCCD gồm 12 chữ số.")
  const phone = info.phone ? normalizePhone(info.phone) : ""

  await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", uid)
    const oldPhone = String((await tx.get(userRef)).data()?.phone || "")
    if (phone && phone !== normalizePhone(oldPhone)) {
      const newRef = doc(db, "phones", phone)
      const taken = await tx.get(newRef)
      if (taken.exists() && taken.data().uid !== uid) throw accountError(PHONE_TAKEN, "phone-taken")
      const oldRef = oldPhone ? doc(db, "phones", normalizePhone(oldPhone)) : null
      const old = oldRef ? await tx.get(oldRef) : null
      tx.set(newRef, { uid })
      if (oldRef && old?.exists() && old.data().uid === uid) tx.delete(oldRef)
    }
    tx.update(userRef, {
      ...info,
      fullName: info.fullName.trim(),
      phone,
      idNumber: info.idNumber.replace(/\s/g, ""),
      updatedAt: new Date().toISOString(),
    })
  })
}

const PASSWORD_ERRORS: Record<string, string> = {
  "auth/wrong-password": "Mật khẩu hiện tại không đúng.",
  "auth/invalid-credential": "Mật khẩu hiện tại không đúng.",
  "auth/weak-password": "Mật khẩu mới quá yếu, vui lòng dùng ít nhất 6 ký tự.",
  "auth/too-many-requests": "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.",
  "auth/network-request-failed": "Không có kết nối mạng. Vui lòng kiểm tra Internet và thử lại.",
  "auth/requires-recent-login": "Phiên đăng nhập đã cũ. Vui lòng đăng nhập lại rồi đổi mật khẩu.",
}

// Đổi mật khẩu: xác thực lại bằng mật khẩu hiện tại rồi cập nhật
export async function changePassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser
  if (!user?.email) throw accountError("Vui lòng đăng nhập lại.")
  if (!currentPassword) throw accountError("Vui lòng nhập mật khẩu hiện tại.")
  if (newPassword.length < 6) throw accountError("Mật khẩu mới cần có ít nhất 6 ký tự.")
  if (newPassword === currentPassword) throw accountError("Mật khẩu mới phải khác mật khẩu hiện tại.")
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword))
    await updatePassword(user, newPassword)
  } catch (error: any) {
    throw accountError(PASSWORD_ERRORS[error?.code] ?? "Không đổi được mật khẩu. Vui lòng thử lại.", error?.code)
  }
}
