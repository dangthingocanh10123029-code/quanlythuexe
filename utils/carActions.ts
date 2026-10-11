import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore"
import { db } from "../config/firebase"
import { cars as SEED_CARS } from "../data/cars"
import { OPEN_BOOKING_STATUSES } from "./constants"

// Ghi 24 xe mẫu vào `cars` với id "1"…"24" (giữ khớp booking.carId cũ). Xe đã có thì bỏ qua.
// Trả về số xe vừa thêm.
export async function seedCars(): Promise<number> {
  const createdAt = new Date() // cùng mốc để useCars giữ thứ tự theo id
  const added = await Promise.all(
    SEED_CARS.map(async ({ id, ...car }) => {
      const ref = doc(db, "cars", id)
      if ((await getDoc(ref)).exists()) return 0
      await setDoc(ref, { ...car, createdAt, updatedAt: createdAt })
      return 1
    }),
  )
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
