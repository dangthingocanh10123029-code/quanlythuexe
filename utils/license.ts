// Kiểm tra GPLX (hàm thuần, có test trong utils/__tests__/license.test.ts)
import { LICENSE_CLASSES } from "./constants"

export type LicenseInput = {
  licenseNumber: string
  licenseClass: string
  expiryDate: string // dd/mm/yyyy
  issuingAuthority: string
  frontImage?: string
  backImage?: string
}

// "dd/mm/yyyy" → Date (null nếu sai định dạng hoặc ngày không tồn tại, vd 31/02)
export function parseVnDate(value: string): Date | null {
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day ? d : null
}

// Ảnh mẫu SVG / rỗng không tính là đã tải ảnh
const isPhoto = (uri?: string) => !!uri && uri.startsWith("data:image/") && !uri.startsWith("data:image/svg+xml")

// Trả về lỗi theo từng trường (rỗng = hợp lệ)
export function validateLicense(input: LicenseInput, today = new Date()): Partial<Record<keyof LicenseInput, string>> {
  const errors: Partial<Record<keyof LicenseInput, string>> = {}
  if (!/^\d{12}$/.test(input.licenseNumber.replace(/\s/g, ""))) errors.licenseNumber = "Số GPLX gồm 12 chữ số."
  if (!LICENSE_CLASSES.includes(input.licenseClass)) errors.licenseClass = "Vui lòng chọn hạng GPLX được phép lái ô tô."
  const expiry = parseVnDate(input.expiryDate)
  if (!expiry) errors.expiryDate = "Ngày hết hạn có dạng dd/mm/yyyy."
  else if (expiry.getTime() <= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime())
    errors.expiryDate = "GPLX đã hết hạn."
  if (!input.issuingAuthority.trim()) errors.issuingAuthority = "Vui lòng nhập nơi cấp."
  if (!isPhoto(input.frontImage)) errors.frontImage = "Vui lòng tải ảnh mặt trước GPLX."
  if (!isPhoto(input.backImage)) errors.backImage = "Vui lòng tải ảnh mặt sau GPLX."
  return errors
}
