import { describe, expect, it } from "@jest/globals"
import { normalizePhone, validateIdNumber, validatePhone } from "../helpers"

describe("normalizePhone / validatePhone", () => {
  it("+84 → 0", () => expect(normalizePhone("+84 912.345.678")).toBe("0912345678"))
  it("giữ dạng 0xxxxxxxxx", () => expect(normalizePhone("0912-345-678")).toBe("0912345678"))
  it("SĐT hợp lệ sau chuẩn hoá", () => expect(validatePhone(normalizePhone("+84912345678"))).toBe(true))
})

describe("validateIdNumber", () => {
  it("12 chữ số", () => expect(validateIdNumber("079 123 456 789")).toBe(true))
  it("sai độ dài", () => expect(validateIdNumber("12345678901")).toBe(false))
})
