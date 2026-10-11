import { describe, expect, it } from "@jest/globals"
import { parseVnDate, validateLicense } from "../license"

const photo = "data:image/jpeg;base64,AAAA"
const valid = {
  licenseNumber: "790123456789",
  licenseClass: "B2",
  expiryDate: "15/12/2030",
  issuingAuthority: "Sở GTVT TP. Hồ Chí Minh",
  frontImage: photo,
  backImage: photo,
}
const today = new Date(2026, 9, 11)

describe("parseVnDate", () => {
  it("đọc dd/mm/yyyy", () => expect(parseVnDate("05/01/2027")).toEqual(new Date(2027, 0, 5)))
  it("ngày không tồn tại → null", () => expect(parseVnDate("31/02/2027")).toBeNull())
  it("sai định dạng → null", () => expect(parseVnDate("2027-01-05")).toBeNull())
})

describe("validateLicense", () => {
  it("hợp lệ", () => expect(validateLicense(valid, today)).toEqual({}))
  it("số GPLX phải 12 chữ số", () => expect(validateLicense({ ...valid, licenseNumber: "12345" }, today).licenseNumber).toBeTruthy())
  it("hạng không lái ô tô", () => expect(validateLicense({ ...valid, licenseClass: "A1" }, today).licenseClass).toBeTruthy())
  it("hết hạn hôm nay coi như hết hạn", () =>
    expect(validateLicense({ ...valid, expiryDate: "11/10/2026" }, today).expiryDate).toBe("GPLX đã hết hạn."))
  it("ảnh SVG mẫu không tính", () =>
    expect(validateLicense({ ...valid, frontImage: "data:image/svg+xml;base64,AA" }, today).frontImage).toBeTruthy())
})
