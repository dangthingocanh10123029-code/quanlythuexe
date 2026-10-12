import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore"
import { db } from "../config/firebase"
import { cars as SEED_CARS } from "../data/cars"
import { OPEN_BOOKING_STATUSES } from "./constants"

const SPEC_FIELDS = ["engine", "power", "fuelConsumption", "airbags", "color", "odometer", "trunkCapacity"] as const

// Ghi 24 xe mẫu vào `cars` với id "1"…"24" (giữ khớp booking.carId cũ) và các loại xe vào `carTypes`.
// Xe đã có thì bỏ qua. Trả về số xe vừa thêm.
export async function seedCars(): Promise<number> {
  const createdAt = new Date() // cùng mốc để useCars giữ thứ tự theo id
  const added = await Promise.all(
    SEED_CARS.map(async ({ id, ...car }) => {
      const ref = doc(db, "cars", id)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        // Xe đã có (nạp trước G9): chỉ bổ sung thông số còn thiếu, không ghi đè field admin đã sửa
        const missing = Object.fromEntries(SPEC_FIELDS.filter((k) => snap.data()[k] === undefined && car[k] !== undefined).map((k) => [k, car[k]]))
        if (Object.keys(missing).length) await setDoc(ref, missing, { merge: true })
        return 0
      }
      await setDoc(ref, { ...car, createdAt, updatedAt: createdAt })
      return 1
    }),
  )
  // Loại xe (G7): thêm các loại của xe mẫu nếu chưa có
  const existing = new Set((await getDocs(collection(db, "carTypes"))).docs.map((d) => String(d.data().name)))
  const missing = [...new Set(SEED_CARS.map((c) => c.type))].filter((t) => !existing.has(t))
  await Promise.all(missing.map((name) => addDoc(collection(db, "carTypes"), { name, createdAt })))
  return added.reduce<number>((sum, n) => sum + n, 0)
}

// Xoá xe; chặn nếu xe còn đơn chưa kết thúc
export async function deleteCar(carId: string) {
  const snap = await getDocs(query(collection(db, "bookings"), where("carId", "==", carId)))
  const open = OPEN_BOOKING_STATUSES.map((s) => s.toLowerCase())
  const openCount = snap.docs.filter((d) => open.includes(String(d.data().status ?? "").toLowerCase())).length
  if (openCount > 0) throw new Error(`Xe đang có ${openCount} đơn chưa kết thúc, không thể xoá.`)
  await deleteDoc(doc(db, "cars", carId))
}
