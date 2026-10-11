import { deleteField, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore"
import { db } from "../config/firebase"
import { validateLicense, type LicenseInput } from "./license"
import { notify } from "./notify"

// Khách gửi / gửi lại GPLX → "pending". Ném Error (lỗi đầu tiên) nếu dữ liệu không hợp lệ;
// muốn hiện lỗi từng ô thì gọi validateLicense trước.
export async function submitLicense(uid: string, input: LicenseInput) {
  const errors = Object.values(validateLicense(input))
  if (errors.length > 0) throw new Error(errors[0])
  await setDoc(
    doc(db, "licenses", uid),
    {
      userId: uid,
      licenseNumber: input.licenseNumber.replace(/\s/g, ""),
      licenseClass: input.licenseClass,
      expiryDate: input.expiryDate.trim(),
      issuingAuthority: input.issuingAuthority.trim(),
      frontImage: input.frontImage,
      backImage: input.backImage,
      status: "pending",
      submittedAt: serverTimestamp(),
      reviewedAt: deleteField(),
      rejectReason: deleteField(),
    },
    { merge: true },
  )
}

// Admin duyệt GPLX
export async function verifyLicense(uid: string) {
  await updateDoc(doc(db, "licenses", uid), { status: "verified", reviewedAt: serverTimestamp(), rejectReason: deleteField() })
  await notify(uid, { type: "license", title: "GPLX đã được xác minh", message: "Giấy phép lái xe của bạn đã được duyệt. Bạn có thể đặt xe ngay." })
}

// Admin từ chối GPLX (bắt buộc có lý do)
export async function rejectLicense(uid: string, reason: string) {
  if (!reason.trim()) throw new Error("Vui lòng nhập lý do từ chối.")
  await updateDoc(doc(db, "licenses", uid), { status: "rejected", rejectReason: reason.trim(), reviewedAt: serverTimestamp() })
  await notify(uid, { type: "license", title: "GPLX bị từ chối", message: `Lý do: ${reason.trim()}. Vui lòng cập nhật và gửi lại.` })
}
