# Kế hoạch hoàn thiện RENTO — Claude · Codex · Antigravity

Lập ngày 11/10/2026. Đối chiếu **đặc tả nghiệp vụ** (README phân tích nghiệp vụ, `git show 5e92f89:README.md`) với **mã nguồn hiện tại**.

| Ký hiệu | Agent | Phụ trách |
|---|---|---|
| **L** | Claude | Logic: dữ liệu, nghiệp vụ, Firestore, nối dây vào màn hình, rules, test |
| **U** | Codex | Giao diện: màn mới, bố cục, điều khiển nhập liệu, trạng thái loading/rỗng/lỗi |
| **A** | Antigravity | Hình ảnh: icon, splash, banner, minh hoạ, tối ưu ảnh xe, ảnh chụp màn hình, sơ đồ |

Mỗi task có mã (`L2.1`, `U3.2`, `A5`…) và ô `[ ]`. Agent làm xong thì tick `[x]` và ghi vào **Ghi chú bàn giao** của giai đoạn.

---

## 1. Cách phối hợp

### Quyền sở hữu file (không sửa file của agent khác)

| Agent | Được sửa |
|---|---|
| Claude (L) | `types/`, `utils/`, `hooks/`, `config/`, `data/`, `firestore.rules`, `firebase.json`, `app.json`, test, `CLAUDE.md`, `README.md`. Trong `app/`: chỉ phần **nối dây** (đổi nguồn dữ liệu, gọi hàm nghiệp vụ trong handler) |
| Codex (U) | `app/**`, `components/**` — JSX, style, state hiển thị. **Không** tự ghi Firestore; chỉ gọi hàm/hook Claude đã viết |
| Antigravity (A) | `assets/**`, `docs/screenshots/`, `docs/diagrams/`. Không sửa mã nguồn |

### Quy trình mỗi giai đoạn

```
L  (Claude: hợp đồng dữ liệu + logic + nối dây tối thiểu, giao diện tạm)  → commit "[L<n>] …"
 ↓
U  (Codex: làm giao diện hoàn chỉnh trên hàm/hook đã có)                    → commit "[U<n>] …"
 ↓
V  (Claude: tsc + jest + chạy lại luồng của giai đoạn, sửa lỗi tích hợp)   → commit "[V<n>] …"

A  (Antigravity) chạy song song bất cứ lúc nào, giao file đúng đường dẫn đã hẹn.
```

- Hai agent không sửa cùng một file cùng lúc. Bước sau bắt đầu khi bước trước đã commit.
- **Một ngoại lệ có chủ đích** so với quy ước "màn hình gọi Firestore trực tiếp": nghiệp vụ mới nằm ở `utils/booking.ts` (hàm thuần, có test) và `utils/bookingActions.ts` (ghi Firestore) để Codex chỉ cần gọi hàm. Code cũ không đụng tới nghiệp vụ thì giữ nguyên.
- Điều kiện xong của mọi task code: `./node_modules/.bin/tsc --noEmit -p .` sạch, chuỗi hiển thị tiếng Việt có dấu, tiền qua `formatCurrency`, ngày qua `formatDate`, style dùng token `theme/` (xem CLAUDE.md › Hệ thống thiết kế).
- Codex và Antigravity **không tự đọc CLAUDE.md** → prompt luôn bắt đầu bằng "Đọc CLAUDE.md và docs/PLAN.md" (mẫu ở mục 7).

---

## 2. Hiện trạng: còn thiếu gì

| Nghiệp vụ trong đặc tả | Hiện trạng trong code | Giai đoạn |
|---|---|---|
| Nguồn dữ liệu xe | Màn khách đọc `data/cars.ts` tĩnh; xe admin thêm vào `cars` không bao giờ đặt được; `useCars` không ai dùng | G1 |
| Thông tin xe | Thiếu biển số, hộp số, tiền cọc, mô tả, tiện nghi, trạng thái | G1 |
| Trạng thái xe | Chỉ ghi `"Available"`, không đổi khi giao/nhận xe; xoá xe không kiểm tra đơn đang chạy | G1, G4 |
| Bảo vệ trang quản trị | Mật khẩu cứng `ADMIN123`; `/admin` không kiểm tra quyền | G1 |
| Tìm xe theo ngày, xe còn trống | Không có; lọc hộp số không có (`TRANSMISSION_TYPES` khai báo nhưng chưa dùng); state chọn ngày ở Home là code chết | G2 |
| Đặt xe theo ngày | Chỉ chọn 1–4 ngày; ngày nhận cứng `25/12/2024`, không lưu; không có điểm trả xe; không kiểm tra trùng lịch | G2 |
| Mã giảm giá | `FIRST20`, `WEEKEND50`, `WELCOME25` chỉ hiển thị, checkout không áp dụng | G2 |
| GPLX | Các trường cứng, không sửa được; mặc định hiện "Đã xác minh" (`verified: true`); không ai duyệt; không bắt buộc khi đặt xe | G2 |
| Chủ xe xác nhận/từ chối đơn | Không có; đơn thành "Sắp nhận xe" ngay khi thanh toán | G3 |
| Thanh toán | Không đọc lại đơn (trả được cả đơn đã huỷ), không so số tiền; không có trạng thái thất bại; không có màn thành công | G3 |
| Huỷ & hoàn tiền | Chính sách 24h chỉ là chữ trong hộp thoại; không ghi hoàn tiền | G3 |
| Đổi lịch | Giá chia tỷ lệ (gộp cả VAT, dịch vụ); không kiểm tra trùng; `payment.amount` không cập nhật | G3 |
| Chi tiết đơn thuê | Không có màn riêng (bấm thẻ chỉ mở trang xe) | G3 |
| Nhận/trả xe | Chỉ một hộp thoại xác nhận; không có biên bản km/xăng/hư hỏng/phí phát sinh/hoàn cọc | G4 |
| Đánh giá | Ai đăng nhập cũng đánh giá được, không cần đã thuê; tên hiển thị là email; điểm sao tĩnh; admin không quản lý | G5 |
| Thông báo | 7 thông báo mẫu cố định; không chỗ nào tạo doc `notifications`; chấm đỏ chuông Home không bao giờ bật | G5 |
| Đăng ký | Thiếu SĐT, địa chỉ, CCCD; không kiểm tra trùng SĐT; OTP xong về `/login` nhưng vẫn đang đăng nhập | G6 |
| Đổi mật khẩu | Không có | G6 |
| Hỗ trợ | Phiếu hỗ trợ ghi vào DB nhưng không ai xem/trả lời | G7 |
| Loại xe, vai trò chủ xe/nhân viên, quản lý thanh toán, tiền mặt khi nhận xe | Không có | G7 |
| Bảo mật dữ liệu | Repo không có `firestore.rules` | G8 |
| Hình ảnh | Icon/splash dùng `assets/rento.png` — ảnh quảng cáo cũ tiếng Anh, giá `$`, 2879×1872, không vuông; banner KM `coup1/coup2` có logo Tesla Cybertruck + chữ Anh; `assets/cars` nặng 31 MB; asset thừa (`gcash-logo`, `paypal-logo`, `developers/*`) | A |

Lỗi nhỏ sửa kèm: `app/chats.tsx` rỗng (Expo Router cảnh báo), `likedCars` thả tim trùng doc, booking lưu `carImage` là số `require()` (đổi giữa các bản build), `featuredCars` khai báo riêng trong Home.

**Ngoài phạm vi** (ghi vào báo cáo là hướng phát triển): cổng thanh toán thật, push notification, Firebase Phone Auth (cần native build), chế độ tối, Firebase Storage, chat, backend riêng.

---

## 3. Quyết định thiết kế

Đây là các mặc định đề xuất. **Chốt trước khi bắt đầu G1**; muốn đổi thì sửa mục này rồi mới giao việc.

- **D1 – Nguồn dữ liệu xe:** Firestore `cars` là nguồn duy nhất. Admin bấm "Nạp dữ liệu xe mẫu" để ghi 24 xe tĩnh với **id giữ nguyên "1"…"24"**, nên `booking.carId` cũ vẫn khớp. Ảnh xe có sẵn tra qua `imageKey`; ảnh admin tải lên là data URI trong `image`.
- **D2 – Luồng đơn theo đặc tả:** chủ xe xác nhận trước, khách thanh toán sau.
  ```
  Pending ──admin xác nhận──▶ Confirmed ──khách thanh toán──▶ Upcoming ──giao xe──▶ Active ──nhận lại xe──▶ Completed
  (Chờ xác nhận)              (Chờ thanh toán)                 (Sắp nhận xe)          (Đang thuê)              (Hoàn thành)
     ├─admin từ chối──▶ Rejected (Bị từ chối)
     └─huỷ (Pending | Confirmed | Upcoming)──▶ Cancelled (Đã huỷ, hoàn tiền theo D5 nếu đã trả)
  ```
  Đơn `Pending` cũ trong DB sẽ hiển thị "Chờ xác nhận".
- **D3 – Trạng thái xe:** `Available | Rented | Maintenance | Inactive`. Bỏ `Booked` vì một xe có nhiều đơn ở nhiều khoảng ngày; "còn trống" tính theo khoảng ngày (D2 + kiểm tra trùng lịch).
- **D4 – Tiền cọc:** trả khi nhận xe (khớp FAQ hiện có), không cộng vào tiền thanh toán online. Khi trả xe, hoàn cọc = cọc − phí phát sinh.
- **D5 – Chính sách huỷ:** huỷ ≥ 24h trước giờ nhận xe được hoàn 100%; < 24h hoàn 70% (khớp chữ đang hiển thị). Đã nhận xe thì không huỷ được. Admin huỷ thì hoàn 100%.
- **D6 – Quản trị:** bỏ mật khẩu cứng `ADMIN123`; vào `/admin` bằng tài khoản có `users.isAdmin = true` (bật tay trên Firebase Console). Bắt buộc cho Firestore rules (G8).
- **D7 – Đổi lịch:** đơn chưa thanh toán (`Pending`, `Confirmed`) đổi tự do, tính lại giá, quay về `Pending`. Đơn `Upcoming` chỉ được đổi ngày, giữ nguyên số ngày nên giá không đổi.
- **D8 – OTP** giữ giả lập (Phone Auth không chạy trên Expo Go). **Thông báo** chỉ trong app, không push. **Đăng nhập bằng SĐT** không làm (phải mở quyền đọc `users` khi chưa đăng nhập).
- **D9 – Kiểm tra trùng lịch phía client:** đọc đơn của xe rồi lọc. Hai người đặt cùng lúc vẫn có thể lọt, nên admin **kiểm tra lại** khi bấm Xác nhận.

---

## 4. Hợp đồng dữ liệu (Claude tạo ở L1.1, mọi agent tuân theo)

### `cars/{id}`
```ts
{ id, name, brand, model, year, type, seats,
  fuel: "Xăng" | "Dầu diesel" | "Điện" | "Hybrid",
  transmission: "Số tự động" | "Số sàn",
  pricePerDay, deposit, location, licensePlate, description, amenities: string[],
  imageKey?: string,          // ảnh có sẵn trong assets/cars (D1)
  image?: string,             // data URI do admin tải lên (≤ 700 KB, giới hạn 1 MB/doc)
  status: "Available" | "Rented" | "Maintenance" | "Inactive",
  rating, reviewCount, bookings, createdAt, updatedAt }
```

### `bookings/{id}` (giữ field cũ, thêm field mới)
```ts
{ userId, carId, carName,
  pickupDate: Timestamp, returnDate: Timestamp, duration /* số ngày */,
  location /* điểm nhận */, returnLocation,
  subtotal, addOnTotal, discount, promoCode?, tax, deposit,
  price /* = tổng thanh toán online, giữ tên cũ */,
  selectedAddOns, status /* D2 */, createdAt,
  confirmedAt?, rejectedAt?, rejectReason?, cancelledAt?, cancelledBy?: "user" | "admin",
  payment?: { method, amount, transactionId, paidAt,
              status: "Completed" | "Failed" | "Refunded", refundAmount?, refundedAt? },
  handover?: { at, documentsChecked, depositCollected, conditionNote, odometer, fuelLevel },
  returnInspection?: { at, odometer, fuelLevel, damageNote, lateFee, extraFees, depositRefund },
  handedOverAt?, returnedAt?, reviewed?: boolean }
```
Đơn cũ không có `returnDate` thì tính từ `(pickupDate ?? createdAt) + duration` qua `getBookingRange()`.

### Collection khác
- `reviews/{bookingId}` — một đơn một đánh giá: `{ carId, userId, userName /* fullName */, rating, comment, createdAt }`
- `notifications/{auto}` — `{ userId, type: "booking" | "payment" | "license" | "support" | "system", title, message, bookingId?, read: false, createdAt }`
- `licenses/{uid}` — field hiện có + `status: "pending" | "verified" | "rejected"`, `reviewedAt?`, `rejectReason?`
- `users/{uid}` — thêm `phone`, `address`, `idNumber` (CCCD), `role?: "staff"` (G7); giữ `isAdmin`
- `phones/{phone}` — `{ uid }`, giữ chỗ SĐT để chặn trùng (G6)
- `carTypes/{id}` — `{ name, createdAt }` (G7); `supportTickets` thêm `reply`, `repliedAt`, `status: "open" | "resolved"`; `payment.method` thêm `"Tiền mặt"` với `status: "Pending"` tới khi giao xe
- `bookedSlots/{bookingId}` — `{ carId, userId, pickupDate, returnDate }`: khoảng ngày xe đang bị giữ (đơn Pending | Confirmed | Upcoming | Active), mọi người dùng đọc được để kiểm tra xe trống mà không phải đọc `bookings` của người khác (cần cho rules G8). Tạo cùng đơn trong `createBooking` (batch); xoá khi huỷ / từ chối / hoàn thành; cập nhật khi đổi lịch. Đơn cũ trước G2 không có slot (chỉ admin kiểm tra lại khi Xác nhận).

### Hàm Claude cung cấp (Codex chỉ gọi, không viết lại)

`utils/booking.ts` (hàm thuần, có test):
`getBookingRange(b)`, `daysBetween(start, end)`, `rangesOverlap(...)`, `isCarFree(bookings, start, end, ignoreId?)`, `calcBookingPrice({ pricePerDay, days, addOns, promoCode, isFirstBooking })` → `{ subtotal, addOnTotal, discount, tax, total }`, `canTransition(from, to)`, `calcRefund(booking, now)` → `{ percent, amount }`, `calcLateFee(returnDate, actual, pricePerDay)`, `calcDepositRefund(deposit, fees)`.

`utils/bookingActions.ts` (ghi Firestore; mỗi hàm tự kiểm tra `canTransition` và gửi thông báo):
`createBooking`, `confirmBooking`, `rejectBooking`, `payBooking`, `failPayment`, `cancelBooking`, `rescheduleBooking`, `handOverBooking`, `returnBooking`, `submitReview`, `deleteReview`, `verifyLicense`, `rejectLicense`. Lỗi nghiệp vụ ném `Error` có message tiếng Việt để UI hiện thẳng.

`utils/notify.ts`: `notify(userId, { type, title, message, bookingId? })`.
`hooks/`: `useCars()`, `useCar(id)`, `getCarImage(car)`, `useLikedCarIds()`, `useUserBookings()`, `useBooking(id)`, `useNotifications()` (sửa hook có sẵn), `useLicense()`.

### Nhãn trạng thái (`utils/constants.ts`)
| Giá trị lưu | Nhãn | Tab Chuyến đi |
|---|---|---|
| Pending | Chờ xác nhận | Sắp tới |
| Confirmed | Chờ thanh toán | Sắp tới |
| Upcoming | Sắp nhận xe | Sắp tới |
| Active | Đang thuê | Đang thuê |
| Completed | Hoàn thành | Lịch sử |
| Cancelled | Đã huỷ | Lịch sử |
| Rejected | Bị từ chối | Lịch sử |

---

## 5. Lộ trình

Thứ tự bắt buộc: G0 → G1 → … → G6 → G8. G7 tuỳ chọn, làm nếu còn thời gian (chèn trước G8). Track A chạy song song; mốc cần có ghi ở từng task.

### G0 — Chuẩn bị
- [ ] **G0.1** (người dùng) Commit thay đổi đang dở (`CLAUDE.md`, `app/developers.tsx`). Chốt mục 3.
- [ ] **G0.2** (người dùng) Tạo một tài khoản admin: đăng ký trong app → Firebase Console → `users/{uid}.isAdmin = true`.
- [ ] **G0.3** (tuỳ chọn) `ln -s CLAUDE.md AGENTS.md` để Codex tự đọc quy ước.

### G1 — Dữ liệu xe thống nhất + khoá trang quản trị
**Claude**
- [x] **L1.1** Hợp đồng dữ liệu: viết lại `types/car.ts`, `types/booking.ts` theo mục 4 (bỏ `Booking` trùng trong `types/index.ts`); cập nhật `utils/constants.ts` (CAR_STATUS + nhãn, bảng nhãn đơn mới, TRANSMISSIONS, PROMO_CODES); tạo `utils/notify.ts`.
- [x] **L1.2** `data/cars.ts` thêm `transmission`, `deposit`, `licensePlate`, `description`, `amenities`, `status`, `imageKey`; `CAR_IMAGES` trong `data/assets.ts`; `seedCars()` (setDoc nếu chưa có); `useCars`/`useCar`/`getCarImage`.
- [x] **L1.3** Chuyển Home, Search, Car details, Checkout, Liked, Bookings, History, Admin sang `useCars`. Bỏ `featuredCars` riêng trong Home (lấy xe điểm cao). Đơn mới không lưu `carImage`; ảnh lấy theo `carId`.
- [x] **L1.4** Trạng thái xe: Search ẩn `Maintenance`/`Inactive`; Car details khoá nút đặt; admin đổi trạng thái; chặn xoá xe còn đơn `Pending | Confirmed | Upcoming | Active`.
- [x] **L1.5** Khoá admin (D6): bỏ nhánh `ADMIN123`; `admin.tsx` chuyển về `/login` nếu chưa đăng nhập hoặc không `isAdmin`; đăng nhập bằng tài khoản admin thì vào thẳng `/admin`.
- [x] **L1.6** Thả tim: doc id `${uid}_${carId}` (hết trùng), `useLikedCarIds()`; thả tim được ở Home, Search, Car details.
- [x] **L1.7** Xoá `app/chats.tsx` rỗng và state chọn ngày chết ở Home.

**Codex**
- [x] **U1.1** Form xe trong admin: thêm biển số, hộp số, tiền cọc, mô tả, tiện nghi (chip chọn nhiều), trạng thái (4 lựa chọn); nút "Nạp dữ liệu xe mẫu"; badge trạng thái trên thẻ xe.
- [x] **U1.2** Car details: hiển thị hộp số, tiền cọc, mô tả, tiện nghi; nút tim; nhãn "Đang bảo dưỡng"/"Tạm ngừng" + nút đặt bị khoá. Bỏ 4 chấm ảnh giả nếu chưa có A6.
- [x] **U1.3** Trạng thái loading (skeleton) và rỗng cho danh sách xe ở Home/Search.

**Ghi chú bàn giao G1** (Claude, L1):
- `hooks/useCars.ts`: `useCars()` → `{ cars, loading, error }` (realtime `cars`, xe mới lên đầu, xe mẫu theo id); `useCar(id)` → `{ car, loading }`; `getCarImage(car)` → `ImageSourcePropType` (ảnh `imageKey` trong `CAR_IMAGES`, nếu không thì data URI `image`). Thẻ xe dùng `car={{ ...item, image: getCarImage(item) }}`.
- `hooks/useLikedCarIds.ts`: `useLikedCarIds()` → `{ likedIds, toggleLike(carId) }`; `toggleLike` trả `true` khi vừa thích, `false` khi bỏ thích, ném `Error` tiếng Việt nếu chưa đăng nhập. Doc id `${uid}_${carId}`; bỏ thích xoá cả doc trùng cũ. Đã nối ở Home (thẻ "Thuê gần đây"), Search, Chi tiết xe (nút tim tạm trong `AppHeader right`), Xe yêu thích.
- `utils/carActions.ts`: `seedCars()` → số xe vừa thêm (id "1"…"24", xe đã có thì bỏ qua); `deleteCar(carId)` ném `"Xe đang có N đơn chưa kết thúc, không thể xoá."`. Admin đã nối: `handleSeedCars` (nút tạm có comment `ponytail:` dưới tiêu đề "Quản lý xe") và `handleDeleteCar`.
- Form xe admin: state `newCar` thêm `licensePlate`, `transmission` (`TRANSMISSIONS`), `deposit` (chuỗi số), `description`, `amenities: string[]` (chọn từ `AMENITIES`), `status` (`CarStatus`, nhãn `CAR_STATUS_LABELS`), `imageKey`. `updateField(field, value)` đã generic; `handleSaveCar` đã ghi đủ field, `validateCarData` kiểm tra `deposit` (lỗi ở `formErrors.deposit`). U1.1 chỉ cần thêm ô nhập/chip.
- `utils/constants.ts` mới: `CAR_STATUS_LABELS`, `HIDDEN_CAR_STATUSES` (Maintenance, Inactive), `FUELS`, `TRANSMISSIONS`, `AMENITIES`, `PROMO_CODES`, `BOOKING_TABS`, `OPEN_BOOKING_STATUSES`; nhãn đơn theo bảng mục 4. Đã xoá các hằng tiếng Anh không dùng (`BOOKING_STATUS`, `PAYMENT_STATUS`, `CAR_TYPES`…).
- Chi tiết xe: biến `bookingLocked` (xe bảo dưỡng/tạm ngừng) → nút đặt bị `disabled`, tiêu đề là nhãn trạng thái; `car.transmission`, `car.deposit`, `car.description`, `car.amenities`, `car.licensePlate` sẵn để U1.2 hiển thị. Đang tải xe: `useCar().loading`.
- Home: "Xe nổi bật" = 5 xe điểm cao nhất (bỏ mảng `featuredCars` cứng). `CarCardFeatured` chưa có nút tim (U1 có thể thêm `liked`/`onFavoritePress` như `CarCardCompact`). Home/Search chưa lấy `loading` từ `useCars()` — U1.3 lấy để làm skeleton.
- Khoá admin (D6): bỏ nút "QUẢN TRỊ" + mật khẩu `ADMIN123` ở login; tài khoản `isAdmin` đăng nhập vào thẳng `/admin`; `/admin` hiện spinner rồi `router.replace("/login")` nếu không phải admin; listener `bookings`/`users` chỉ chạy khi là admin.
- Đơn mới không lưu `carImage`; ảnh đơn lấy theo `carId` (Chuyến đi, Lịch sử, Admin), đơn cũ còn `carImage` dạng chuỗi vẫn hiện.
- Đã xoá `app/chats.tsx`, `hooks/useBookings.ts` (không ai dùng; G3 viết `useUserBookings`), state chọn ngày chết ở Home.
- Điều phối: Codex/Antigravity **không tự commit, không sửa docs/PLAN.md**; Claude (điều phối) commit và tick thay để tránh tranh chấp git/PLAN.md.

**Bàn giao U1** (Codex): `components/CarCardSkeleton.tsx` (prop `featured`, `style`); `CarCardFeatured` thêm `liked`, `onFavoritePress`. Không thiếu hàm/hook.
**V1** (Claude): tsc + jest sạch; rà diff không có ghi Firestore mới, không hard-code màu; `npx expo export -p web` render được mọi route. Cần người dùng thử trên Expo Go: nạp xe mẫu bằng tài khoản admin (G0.2) rồi kiểm tra Home/Search/Chi tiết xe.

### G2 — Đặt xe theo ngày, xe còn trống, mã giảm giá, GPLX
**Claude**
- [x] **L2.1** `utils/booking.ts`: `getBookingRange`, `daysBetween`, `rangesOverlap`, `isCarFree`, `calcBookingPrice` (mã giảm áp trước VAT; `FIRST20`/`WELCOME25` chỉ cho người chưa có đơn đã thanh toán; `WEEKEND50` chỉ khi ngày nhận là T7/CN) + test.
- [x] **L2.2** `createBooking`: đọc đơn của xe, chặn trùng, ghi field mới, `status: "Pending"`, thông báo "Đã gửi yêu cầu đặt xe". Checkout dùng hàm này; sau khi tạo về chi tiết đơn, **không** sang màn thanh toán nữa (D2).
- [x] **L2.3** Bắt buộc GPLX: checkout yêu cầu `licenses/{uid}.status` là `pending` hoặc `verified`, nếu không thì chuyển `/profile/license`.
- [x] **L2.4** Tìm theo ngày: Home/Search truyền `pickup`, `return` qua params; lọc xe trống bằng một query `bookings where status in [...]` rồi lọc phía client; thêm lọc hộp số.
- [x] **L2.5** GPLX: sửa mặc định `verified: true`; lưu các trường nhập (kiểm tra số GPLX 12 chữ số, hạng, ngày hết hạn > hôm nay); `useLicense()`; `verifyLicense`/`rejectLicense` + thông báo.

**Codex**
- [x] **U2.1** Checkout: chọn ngày-giờ nhận và ngày-giờ trả (`@react-native-community/datetimepicker` đã cài) thay chip 1–4 ngày; điểm trả xe (mặc định = điểm nhận); ô mã giảm giá + dòng "Giảm giá"; dòng "Tiền cọc (trả khi nhận xe)"; hiện lỗi trùng lịch.
- [x] **U2.2** Home/Search: thanh "Nhận xe – Trả xe" mở bộ chọn ngày rồi sang Search; chip hộp số trong bộ lọc; dòng tóm tắt khoảng ngày đang lọc.
- [x] **U2.3** Màn GPLX: form nhập 4 trường + ảnh trước/sau; trạng thái Chờ duyệt / Đã xác minh / Bị từ chối (kèm lý do, nút gửi lại).
- [x] **U2.4** Admin: mục "GPLX chờ duyệt" (tab mới hoặc trong Người dùng) — xem ảnh, Duyệt / Từ chối (nhập lý do).

**Ghi chú bàn giao G2** (Claude, L2):
- `utils/booking.ts` (hàm thuần, 32 test): `calcBookingPrice({ pricePerDay, days, addOns, promoCode, isFirstBooking, pickupDate })` → `{ subtotal, addOnTotal, discount, tax, total, promoError? }` (mã sai/không đủ điều kiện → `discount = 0` và `promoError` tiếng Việt; giảm giá chỉ trên tiền thuê, trước VAT); `daysBetween(start, end)` (làm tròn lên theo 24h, tối thiểu 1); `getBookingRange(b)`, `isCarFree(...)`, `toDate(v)`.
- `utils/bookingActions.ts`: `createBooking({ uid, car, pickupDate, returnDate, location, returnLocation, addOns, promoCode })` → id đơn `Pending` + slot `bookedSlots` + thông báo "Đã gửi yêu cầu đặt xe". Ném `Error` tiếng Việt (giờ nhận đã qua, trả ≤ nhận, xe tạm ngừng, mã giảm giá, trùng lịch); thiếu GPLX → `error.code === "license-required"`. `isFirstBooking(uid)`.
- `hooks/useCars.ts`: `useBusyCarIds(start, end)` → `string[]` id xe bị giữ trong khoảng (không truyền ngày → `[]`).
- Checkout (`app/checkout.tsx`) đã nối: state `pickupAt`/`setPickupAt`, `returnAt`/`setReturnAt`, `pickupLocation`, `returnLocation`/`setReturnLocation` (chưa có UI), `promoCode`/`setPromoCode` (chưa có UI), `price` (đủ `discount`, `promoError`), `days`, `dateConflict` (xe bận → nút bị khoá, cần hiện lỗi), `submitting`, `car.deposit`. Chip 1–4 ngày là tạm (comment `ponytail:`) — U2.1 thay bằng chọn ngày-giờ. **`@react-native-community/datetimepicker` không chạy trên web** → cần phương án dự phòng trên web (vd chip ngày 14 ngày tới + chip giờ). Đã bỏ khối "Phương thức thanh toán" (D2: thanh toán sau khi admin xác nhận). Tạo đơn xong tạm về tab Chuyến đi (G3 đổi sang `/booking/[id]`). Chưa có GPLX → hộp thoại mở `/profile/license`.
- Search: nhận params `pickup`, `return` (ISO) → state `dateRange` / `setDateRange(null)` để xoá; xe bận đã bị lọc; `filters.transmission` đã lọc (cần chip trong bộ lọc theo `TRANSMISSIONS`); `clearAll` xoá cả khoảng ngày; bấm xe mang `pickup`/`return` sang Chi tiết xe → Checkout. Home: `openCarsTab({ pickup: iso, return: iso })` cho thanh "Nhận xe – Trả xe".
- GPLX (`app/profile/license.tsx`): bỏ dữ liệu mẫu và mặc định "Đã xác minh". State `form: LicenseInput`, `updateForm(field, value)`, `errors[field]`, `status` (`null` | `pending` | `verified` | `rejected`), `license.rejectReason`, `canSubmit`, `handleVerifyLicense` (kiểm tra bằng `validateLicense`: số 12 chữ số, hạng trong `LICENSE_CLASSES`, hết hạn `dd/mm/yyyy` > hôm nay, đủ 2 ảnh). Các dòng thông tin đang chỉ hiển thị (comment `ponytail:`) — U2.3 đổi thành ô nhập. Nhãn `LICENSE_STATUS_LABELS`.
- Admin GPLX: `useAllLicenses(isAdmin)` (hooks/useLicense) → `{ licenses, loading }` (mỗi phần tử có `userId`, ảnh base64, `status`); `verifyLicense(uid)`, `rejectLicense(uid, reason)` trong `utils/licenseActions.ts` (gửi thông báo, ném `Error` nếu thiếu lý do). Tên khách lấy từ `usersById` có sẵn.

**Bàn giao U2** (Codex): `components/DateTimeRangePicker` (`.tsx` native + `.web.tsx` dự phòng bằng chip ngày/giờ), props `pickupAt`, `returnAt`, `onPickupChange`, `onReturnChange`. Không thiếu hàm/hook.
**V2** (Claude): tsc + 50 test sạch; rà diff không ghi Firestore mới, không hard-code màu. Codex đã chạy `expo export` web/android/ios thành công. Cần thử trên Expo Go: chọn ngày bằng DateTimePicker native.

### G3 — Xác nhận đơn, thanh toán, huỷ & hoàn tiền, chi tiết đơn
**Claude**
- [x] **L3.1** `canTransition` + nhãn mới; nhóm tab Chuyến đi và chip trạng thái admin theo bảng mục 4.
- [x] **L3.2** `confirmBooking` (kiểm tra lại trùng lịch + GPLX `verified`), `rejectBooking(reason)`; cả hai gửi thông báo.
- [x] **L3.3** `payBooking`: 3 màn thanh toán đọc lại đơn, chỉ cho trả khi `Confirmed` và `amount === price`; thành công → `Upcoming` → `router.replace("/payment-success?bookingId=…")`. `failPayment`: thẻ thử `4000 0000 0000 0002` hoặc nút "Huỷ giao dịch" ở MoMo/ZaloPay ghi `payment.status: "Failed"`, đơn giữ `Confirmed`.
- [x] **L3.4** `cancelBooking` theo D5: ghi `refundAmount`, `refundedAt`, `payment.status: "Refunded"`, `cancelledBy`; chặn huỷ khi `Active`.
- [x] **L3.5** `rescheduleBooking` theo D7 (tính lại bằng `calcBookingPrice`, chặn trùng).
- [x] **L3.6** `useUserBookings`, `useBooking(id)`; `profile/history.tsx` dùng chung hook.

**Codex**
- [x] **U3.1** Màn `app/booking/[id].tsx`: mã đơn, xe, timeline trạng thái, giờ nhận/trả, điểm nhận/trả, chi tiết giá (tạm tính, dịch vụ, giảm giá, VAT, tổng, cọc), thanh toán/hoàn tiền, nút theo trạng thái (Thanh toán · Đổi lịch · Huỷ chuyến · Đánh giá). Thẻ ở tab Chuyến đi bấm vào mở màn này.
- [x] **U3.2** Màn `app/payment-success.tsx`: biểu tượng thành công, số tiền, phương thức, mã giao dịch, nút "Xem chuyến đi".
- [x] **U3.3** Màn thanh toán: trạng thái thất bại + nút thử lại; nút "Huỷ giao dịch" ở MoMo/ZaloPay.
- [x] **U3.4** Admin: nút Xác nhận / Từ chối (modal nhập lý do) trên thẻ và modal chi tiết đơn `Pending`; chip lọc trạng thái mới.
- [x] **U3.5** Hộp thoại huỷ hiện số tiền được hoàn; badge `Confirmed`/`Rejected`.

**Ghi chú bàn giao G3** (Claude, L3):
- `hooks/useBookings.ts`: `useUserBookings()` → `{ bookings, loading }` (đơn của người đang đăng nhập, mới nhất trước); `useBooking(id)` → `{ booking, loading }` (realtime).
- `utils/bookingActions.ts` (đều ném `Error` tiếng Việt, tự gửi thông báo): `confirmBooking(id)` (kiểm tra lại trùng lịch + GPLX `verified`), `rejectBooking(id, reason)`, `payBooking(id, method, amount, details?)` → mã giao dịch (chỉ đơn `Confirmed`, đúng số tiền), `failPayment(id, method, reason?)`, `previewRefund(booking, by?)` → `{ percent, amount }`, `cancelBooking(id, by: "user" | "admin")` → số tiền hoàn, `rescheduleBooking(id, pickupDate, returnDate?)` (D7: đơn `Upcoming` bỏ qua `returnDate`, giữ số giờ thuê).
- Tab Chuyến đi: dùng `useUserBookings`; nhóm tab theo `BOOKING_TABS`; "Thanh toán ngay" chỉ cho đơn `Confirmed` (`isAwaitingPayment`); đổi lịch/huỷ cho `Pending | Confirmed | Upcoming`; huỷ hiện số tiền hoàn từ `previewRefund`; `getReschedulePrice` xem trước giá. Với đơn `Upcoming` cần **khoá bộ đếm số ngày** trong modal đổi lịch (chỉ đổi ngày). Thẻ đơn đang mở trang xe (`openCarDetails`) → U3.1 đổi sang `/booking/[id]`.
- Màn thanh toán (`credit-card`, `momo`, `zalopay`): đã gọi `payBooking`; thành công → `router.replace("/payment-success?bookingId=…")`. State `paymentError: string | null` (U3.3 hiện trạng thái thất bại + nút thử lại). Thẻ `4000 0000 0000 0002` → `failPayment`. MoMo/ZaloPay có `handleCancelTransaction` (U3.3 thêm nút "Huỷ giao dịch"). Modal thành công cũ (`showSuccessModal`) không còn dùng → xoá JSX.
- `app/payment-success.tsx` là màn tạm (comment `ponytail:`): `useBooking(bookingId).booking.payment` có `amount`, `method`, `transactionId`, `paidAt`.
- Chi tiết đơn (U3.1, tạo `app/booking/[id].tsx`): `useBooking(id)`, `useCar(booking.carId)` + `getCarImage`, `getBookingRange(booking)` cho giờ nhận/trả, field giá `subtotal`, `addOnTotal`, `discount`, `promoCode`, `tax`, `price`, `deposit`; `payment.status` (`Completed` | `Failed` | `Refunded`), `payment.refundAmount`, `refundPercent`, `refundedAt`; `rejectReason`, `cancelledBy`, `returnLocation`. Nút: Thanh toán (`Confirmed`, chọn phương thức như `goToPayment` ở tab Chuyến đi), Đổi lịch, Huỷ chuyến (`previewRefund` + `cancelBooking`). Đánh giá làm ở G5. Sau khi tạo, Checkout nên `router.replace` sang `/booking/[id]` (`createBooking` trả về id; đang có comment `ponytail:` trong `app/checkout.tsx`).
- Admin: `handleConfirmBooking(booking)`, `handleRejectBooking(bookingId, reason)` → `Promise<boolean>`, `canDecide(booking)` (đơn `Pending`); nút "Xác nhận" tạm trên thẻ đơn (comment `ponytail:`) → U3.4 làm lại + nút "Từ chối" mở modal lý do, thêm vào modal chi tiết đơn. Huỷ đơn chỉ khi `Pending | Confirmed | Upcoming`, hộp thoại hiện số tiền hoàn. `BOOKING_FILTERS` đã có `confirmed`, `rejected`.
- Viết trước (chưa nối, dùng ở G4/G5): `handOverBooking`, `returnBooking`, `previewReturn`, `submitReview`, `deleteReview`, `hooks/useReviews.ts`, `findPickupReminder`, `bookingRevenue`; `useNotifications` dùng `useUid`.

**Bàn giao U3** (Claude thay Codex — Codex hết quota): `app/booking/[id].tsx`; `components/BookingSheets.tsx` (`PaymentMethodSheet`, `RescheduleSheet`, `confirmCancelBooking`), `BookingStatusBadge` (+ `getBookingStatusTone`), `PaymentErrorBanner`. Admin: `openRejectBooking`, `submitRejectBooking`, `renderRejectBookingModal`; đơn Pending dùng Từ chối thay cho Huỷ. Chưa có: nút Đánh giá (U5.1), khối biên bản (U4.3).
**V3** (Claude): tsc + 55 test sạch; rà diff không ghi Firestore mới, không hard-code màu; thêm field `payment` còn thiếu vào `types/booking.ts`. Rủi ro đã biết: hộp thoại có nút dùng `Alert.alert` không hiện trên web (huỷ chuyến, huỷ giao dịch) → xử lý ở U8.1; modal đổi lịch dùng DateTimePicker (không chạy trên web).

### G4 — Giao xe / nhận lại xe
**Claude**
- [x] **L4.1** `handOverBooking`: bắt buộc đủ checklist (giấy tờ, đã thu cọc, tình trạng xe), số km, mức xăng → `Active`, xe `Rented`, `handedOverAt`.
- [x] **L4.2** `returnBooking`: km ≥ lúc giao, mức xăng, hư hỏng, phí phát sinh, `calcLateFee` (mỗi giờ trễ = 10% giá ngày, tối đa 1 ngày) → `depositRefund` → `Completed`, xe `Available`, `returnedAt`, thông báo.
- [x] **L4.3** Doanh thu admin = tiền thuê đã thanh toán − hoàn tiền + phí phát sinh.

**Codex**
- [x] **U4.1** Admin: bottom sheet "Biên bản giao xe" (checkbox, số km, mức xăng dạng chip ¼ ½ ¾ Đầy, ghi chú).
- [x] **U4.2** Admin: bottom sheet "Biên bản nhận lại xe" (km, xăng, hư hỏng, các dòng phí, tiền hoàn cọc tự tính).
- [x] **U4.3** Chi tiết đơn của khách: khối biên bản giao/nhận (chỉ xem).

**Ghi chú bàn giao G4** (Claude, L4):
- `utils/bookingActions.ts`: `handOverBooking(id, { documentsChecked, depositCollected, conditionNote, odometer, fuelLevel })` → `Active`, xe `Rented`; `returnBooking(id, { odometer, fuelLevel, damageNote, extraFees })` → `Completed`, xe `Available` (+1 lượt đặt), xoá `bookedSlots`, trả `{ lateFee, extraFees, depositRefund }`; `previewReturn(booking, car, extraFees)` tính trước cho biên bản. Mức nhiên liệu `FUEL_LEVELS` (¼ ½ ¾ Đầy). Lỗi ném `Error` tiếng Việt (thiếu checklist, km nhỏ hơn lúc giao…).
- Admin: nút "Giao xe"/"Nhận lại xe" gọi `handleAdvanceBooking(booking)` → mở biên bản. State `inspection` (`{ bookingId, kind: "handover" | "return" }`), `inspectionForm` + `updateInspection(field, value)`, `inspectionBooking`, `inspectionCar`, `returnPreview` (`lateFee`, `depositRefund`), `submitInspection()`, `inspectionSubmitting`. Modal biên bản đang là giao diện tạm (`renderInspectionModal`, comment `ponytail:`) → U4.1/U4.2 làm lại thành bottom sheet.
- Doanh thu (L4.3): `bookingRevenue(b)` (utils/booking) = đã thanh toán − hoàn tiền + phí trễ/phát sinh; thống kê, biểu đồ 6 tháng và "đã chi" của người dùng dùng hàm này.
- Chi tiết đơn của khách (U4.3): `booking.handover` (`at`, `odometer`, `fuelLevel`, `conditionNote`, `documentsChecked`, `depositCollected`) và `booking.returnInspection` (`at`, `odometer`, `fuelLevel`, `damageNote`, `lateFee`, `extraFees`, `depositRefund`).

### G5 — Đánh giá & thông báo
**Claude**
- [x] **L5.1** `submitReview`: chỉ đơn `Completed` của chính người dùng, chưa đánh giá; transaction ghi `reviews/{bookingId}` + cập nhật `cars.rating`, `reviewCount` + `booking.reviewed`. Bỏ form đánh giá tự do ở Car details.
- [x] **L5.2** `deleteReview` (admin), tính lại điểm.
- [x] **L5.3** Gọi `notify` ở mọi sự kiện: đặt xe, xác nhận, từ chối, thanh toán thành công/thất bại, giao xe, hoàn tất, huỷ/hoàn tiền, GPLX duyệt/từ chối. `notifications.tsx` đọc Firestore qua `useNotifications` (bỏ dữ liệu mẫu và key AsyncStorage); đếm chưa đọc cho chuông Home; nhắc nhận xe khi có đơn `Upcoming` trong 24h tới (tính phía client).

**Codex**
- [x] **U5.1** Bottom sheet "Đánh giá chuyến đi" (5 sao + nhận xét) mở từ chi tiết đơn và thẻ Lịch sử.
- [x] **U5.2** Car details: điểm trung bình + số đánh giá, danh sách đánh giá, trạng thái rỗng.
- [x] **U5.3** Màn Thông báo: icon theo loại, đã đọc/chưa đọc, bấm thì mở chi tiết đơn; chấm đỏ chuông Home; thẻ nhắc nhận xe trên Home.
- [x] **U5.4** Admin: mục "Đánh giá" — danh sách, lọc theo số sao, xoá.

**Ghi chú bàn giao G5** (Claude, L5):
- `submitReview(bookingId, rating, comment)` (transaction: `reviews/{bookingId}` + cập nhật `cars.rating`, `reviewCount` + `booking.reviewed`). Chỉ đơn `Completed` của chính người dùng, chưa đánh giá; 1–5 sao; nhận xét ≤ 500 ký tự; tên hiển thị = `users.fullName`. Nút "Đánh giá" hiện khi `status === "Completed" && !booking.reviewed` (chi tiết đơn + thẻ Lịch sử).
- `deleteReview(reviewId)` (admin) tính lại điểm. `hooks/useReviews.ts`: `useCarReviews(carId)`, `useAllReviews(isAdmin)` → `{ reviews, loading }`; `Review` có `userName` (đánh giá cũ có thể là email).
- Chi tiết xe: đã bỏ form đánh giá tự do; danh sách lấy từ `useCarReviews`; điểm trung bình/số đánh giá dùng `car.rating`, `car.reviewCount` (U5.2). Dòng `reviewEmail` đang lặp lại tên với đánh giá mới → chỉ hiện khi `userName` chứa "@".
- Thông báo: `app/notifications.tsx` đọc Firestore qua `useNotifications()` (`notifications`, `unreadCount`, `markAsRead(id)`, `markAllAsRead()`); đã bỏ dữ liệu mẫu và key AsyncStorage `rento:readNotificationIds`. Bấm thông báo có `bookingId` → `/booking/[id]`. Icon/màu theo loại ở `TYPE_STYLE` (giao diện giữ như cũ, comment `ponytail:` → U5.3).
- Trang chủ: `hasNotifications` = `unreadCount > 0` (chấm đỏ chuông); `pickupReminder` = đơn `Upcoming` nhận xe trong 24h tới (`findPickupReminder`) → U5.3 hiện thẻ nhắc.
- Mọi sự kiện đã gọi `notify`: đặt xe, xác nhận, từ chối, thanh toán thành công/thất bại, giao xe, hoàn tất, huỷ/hoàn tiền, đổi lịch, GPLX duyệt/từ chối.

**Bàn giao U4/U5** (Claude thay Codex): admin có bottom sheet biên bản giao/nhận xe và tab "Đánh giá"; `ReviewSheet({ booking, onClose })` trong `components/BookingSheets.tsx`; chi tiết đơn có khối biên bản + nút đánh giá; thẻ Lịch sử có nút đánh giá; chi tiết xe có tóm tắt điểm; Thông báo và thẻ nhắc nhận xe ở Home. Còn lại cho U8.1: admin header 5 tab có thể bị cắt chữ trên màn hẹp; `Alert.alert` một nút không hiện trên web; modal chi tiết đơn admin chưa hiện biên bản; thẻ chi nhánh ở chi tiết xe còn 5 sao cứng; dùng ảnh `assets/empty/*` cho trạng thái rỗng.
**V4/V5** (Claude): tsc + 55 test sạch; rà diff không ghi Firestore mới, không hard-code màu.

### G6 — Tài khoản
**Claude**
- [x] **L6.1** Đăng ký: thêm SĐT (`validatePhone`), địa chỉ, CCCD (12 chữ số). Sau khi tạo tài khoản, giữ chỗ `phones/{phone}` trong transaction; trùng thì `deleteUser` và báo lỗi.
- [x] **L6.2** OTP xong → `router.replace("/(tabs)")` (người dùng đã đăng nhập).
- [x] **L6.3** Đổi mật khẩu: `reauthenticateWithCredential` + `updatePassword`, báo lỗi tiếng Việt.
- [x] **L6.4** Thông tin cá nhân: thêm CCCD; đổi SĐT thì cập nhật `phones`.

**Codex**
- [x] **U6.1** Form đăng ký thêm 3 trường.
- [x] **U6.2** Màn `app/profile/change-password.tsx` + mục "Đổi mật khẩu" trong tab Tài khoản.
- [x] **U6.3** Thông tin cá nhân: trường CCCD.

**Ghi chú bàn giao G6** (Claude, L6):
- `utils/accountActions.ts`: `validateRegister(input)` → lỗi theo ô (`fullName`, `email`, `password`, `phone`, `address`, `idNumber`); `registerAccount({ fullName, email, password, phone, address, idNumber })` (tạo Auth + `users/{uid}` + giữ chỗ `phones/{phone}` trong transaction; SĐT trùng → xoá tài khoản vừa tạo, ném `code: "phone-taken"`); `updatePersonalInfo(uid, info)` (đổi SĐT thì chuyển `phones`, trùng → `phone-taken`); `changePassword(current, next)` (xác thực lại rồi `updatePassword`, lỗi tiếng Việt).
- `utils/helpers.ts`: `normalizePhone` (về dạng `0xxxxxxxxx`), `validateIdNumber` (12 số). SĐT lưu dạng chuẩn hoá.
- Đăng ký: `formData` thêm `phone`, `idNumber`, `address`; 3 ô đang dùng giao diện chung trong mảng `fields` (comment `ponytail:`) → U6.1 chỉnh bàn phím số (`phone-pad`, `number-pad`), gợi ý định dạng. OTP xong → `router.replace("/(tabs)")`.
- Thông tin cá nhân: `userInfo.idNumber` đã lưu nhưng chưa có ô nhập (comment `ponytail:`) → U6.3. Lỗi lưu hiện `error.message`.
- Đổi mật khẩu (U6.2): tạo `app/profile/change-password.tsx` gọi `changePassword(current, next)`; tự kiểm tra "nhập lại mật khẩu mới" khớp ở UI.

**Bàn giao U6** (Claude thay Codex): đăng ký có lỗi từng ô; `app/profile/change-password.tsx` (mục "Đổi mật khẩu" trong tab Tài khoản); ô CCCD ở Thông tin cá nhân. Không thiếu hàm.
**V6** (Claude): tsc sạch với 4 file U6, rà diff không ghi Firestore/Auth mới, không hard-code màu. Chưa thử `reauthenticateWithCredential` với Firebase thật.

### G7 — Quản trị mở rộng (tuỳ chọn)
- [x] **L7.1 / U7.1** Phiếu hỗ trợ: admin xem, trả lời (`reply`, `status: "resolved"`) + thông báo; người dùng xem phiếu của mình trong Trợ giúp.
- [x] **L7.2 / U7.2** Loại xe: collection `carTypes` CRUD; form xe chọn từ danh sách.
- [x] **L7.3 / U7.3** Vai trò nhân viên (chủ xe): `users.role = "staff"` vào được `/admin` nhưng ẩn tab Người dùng; admin gán vai trò.
- [x] **L7.4 / U7.4** Thanh toán tiền mặt khi nhận xe: `Confirmed → Upcoming` với `payment.status: "Pending"`; admin tick "Đã thu tiền thuê" khi giao xe.
- [x] **L7.5 / U7.5** Danh sách thanh toán (suy từ bookings): lọc theo trạng thái/phương thức, tổng đã hoàn.

**Ghi chú bàn giao G7** (Claude, L7 — người dùng chọn làm đầy đủ G7):
- L7.1 Phiếu hỗ trợ: `hooks/useSupportTickets.ts` → `useMyTickets()`, `useAllTickets(enabled)` → `{ tickets, loading }` (`SupportTicket`: `subject`, `message`, `priority`, `status: "open" | "resolved"`, `reply?`, `repliedAt?`, `userEmail`, `createdAt`); `replyTicket(ticketId, reply)` (utils/adminActions) → `resolved` + thông báo cho khách. Nhãn `TICKET_STATUS_LABELS`. U7.1: admin xem/lọc/trả lời phiếu; khách xem phiếu của mình (kèm phản hồi) trong Trợ giúp.
- L7.2 Loại xe: collection `carTypes/{id}` = `{ name, createdAt }`; `useCarTypes()` → `{ carTypes: { id, name }[], loading }`; `addCarType(name)` (chặn trùng), `deleteCarType(id)` (chặn nếu còn xe thuộc loại). `seedCars()` nạp thêm các loại của xe mẫu. U7.2: admin quản lý loại xe (thêm/xoá); ô "Loại xe" trong form xe chọn từ danh sách (chip) thay vì gõ tự do — `car.type` vẫn lưu tên.
- L7.3 Nhân viên: `users.role = "staff"`; `useAuth().isStaff`; admin.tsx có `isStaff`, `canManage`, `visibleTabs` (nhân viên không thấy tab Người dùng), `handleSetStaff(user, staff: boolean)` (chỉ quản trị viên). Đăng nhập bằng nhân viên vào thẳng `/admin`. Rules: `isManager()` (admin hoặc staff) vận hành xe/đơn/GPLX/đánh giá/hỗ trợ/loại xe; chỉ `isAdmin()` sửa `users`. U7.3: nút gán/bỏ vai trò nhân viên trong modal chi tiết người dùng, nhãn vai trò (`USER_ROLE_LABELS`), bộ lọc "Nhân viên".
- L7.4 Tiền mặt khi nhận xe: `PAYMENT_METHODS.CASH`; `chooseCashPayment(bookingId)` → `Upcoming` + `payment { method: "Tiền mặt", status: "Pending" }`; `handOverBooking(…, { …, rentCollected })` bắt buộc `rentCollected` khi `payment.status` là `Pending`, rồi chuyển thanh toán sang `Completed`. Nhãn `PAYMENT_STATUS_LABELS.pending = "Chờ thu tiền"`. U7.4: thêm lựa chọn "Tiền mặt khi nhận xe" trong `PaymentMethodSheet` (gọi `chooseCashPayment`, không mở màn thanh toán); checkbox "Đã thu tiền thuê {số tiền}" trong biên bản giao xe khi đơn chờ thu (`updateInspection("rentCollected", …)` — thêm field vào `emptyInspectionForm` và truyền vào `handOverBooking`).
- L7.5 Danh sách thanh toán: `listPayments(bookings)` → `PaymentRow[]` (`bookingId`, `userId`, `carName`, `method`, `amount`, `status`, `at`, `refundAmount`, `refundedAt`), `summarizePayments(rows)` → `{ totalPaid, totalRefunded, pendingCash, failedCount, byMethod }` (utils/booking, có test). U7.5: tab "Thanh toán" trong admin, lọc theo trạng thái/phương thức, thẻ tổng.

**Bàn giao U7** (Claude thay Codex, 2 agent): admin có tab "Thanh toán", "Hỗ trợ", khối "Loại xe", nút gán/bỏ nhân viên, checkbox "Đã thu tiền thuê"; khách xem phiếu hỗ trợ + phản hồi, chọn "Tiền mặt khi nhận xe" trong `PaymentMethodSheet`.
**V7** (Claude): tsc + 57 test sạch, `expo export -p web` thành công. Sửa thêm: huỷ đơn tiền mặt chưa thu → `payment.status: "Cancelled"` (không còn bị tính vào "Chờ thu tiền mặt"); `PRIORITY_LABELS` chuyển vào `utils/constants.ts`; câu chữ đổi lịch cho đơn trả tiền mặt. Đơn cũ có `payment.method` GCash/PayPal/Credit Card chỉ hiện ở lọc "Tất cả".

### G8 — Bảo mật & hoàn thiện
**Claude**
- [x] **L8.1** `firestore.rules` + `firebase.json`: khách chỉ đọc/ghi dữ liệu của mình; `cars` đọc công khai, admin ghi; admin (`users/{uid}.isAdmin`) đọc/ghi tất cả. Người dùng deploy: `! npx firebase-tools deploy --only firestore:rules` (cần đăng nhập và có quyền project `car-rental-adv`).
- [x] **L8.2** Dọn: `hooks/useBookings` theo field thật; `BOOKING_STATUS`/`PAYMENT_STATUS` cũ; `testFirestoreConnection`; asset không còn dùng (sau A7).
- [x] **L8.3** Test đủ cho `utils/booking.ts` (`npx jest --watchAll=false`).
- [x] **L8.4** `app.json` trỏ icon/splash mới (sau A1). Cập nhật `CLAUDE.md` (luồng mới; bỏ dòng "Không có git") và `README.md` (tạo admin, nạp xe mẫu, deploy rules, ảnh mới từ A8).

**Ghi chú L8.1** (Claude): `firestore.rules` + `firebase.json` + `.firebaserc` (project `rento-app-e2c08` — đã chuyển khỏi `car-rental-adv` vì nhóm không có quyền project gốc). Rà theo từng luồng ghi trong `utils/*Actions.ts`: khách tạo đơn chỉ ở `Pending`; khách chỉ được thanh toán (Confirmed → Upcoming), huỷ (`cancelledBy: "user"`), đổi lịch, đánh dấu đã đánh giá; admin ghi mọi thứ. `cars` đọc công khai, khách chỉ sửa được `rating`/`reviewCount` (submitReview) — điểm hạn chế đã biết. `reviews` tạo được khi đơn của mình đã `Completed`. `bookedSlots` đọc cho người đã đăng nhập. **Chưa chạy được trên emulator** (cần Java/đăng nhập) → người dùng deploy rồi chạy lại nghiệm thu mục 6.

**Codex**
- [x] **U8.1** Rà toàn app: token thiết kế, lề, loading/rỗng/lỗi (dùng ảnh A5), chữ tiếng Việt, không tràn chữ ở màn 360 px.

**Bàn giao U8.1** (Claude thay Codex, 2 agent chia nhóm file): `Alert.alert` → `showAlert` / `confirmDialog` (utils/dialog, chạy được trên web); `components/EmptyState.tsx` dùng ảnh A5; trạng thái đang tải/lỗi; bỏ hex cứng; chống tràn chữ 360px; admin tab cuộn ngang, modal chi tiết đơn có tiền hoàn + biên bản; đổi lịch (`DateTimeRangePicker` có `returnLocked`) và ngày sinh chạy trên web; FAQ Trợ giúp khớp nghiệp vụ.
**V8** (Claude): tsc + 55 test sạch; không còn `Alert.alert`; `npx expo export -p web` thành công; tông badge admin đồng bộ với `BookingStatusBadge`. Chưa xem giao diện thật (360px, slide màn chào cao 220px) → làm khi chụp ảnh A8. Hộp thoại trên web hiện nút OK/Cancel của trình duyệt.
L8.4 (Claude): `app.json` trỏ icon/splash mới, `CLAUDE.md`, `README.md` đã cập nhật (ảnh bìa README đổi sau A8).

### Track A — Hình ảnh (Antigravity, song song)
Màu thương hiệu: primary `#1054CF`, secondary `#FFB700`, nền trắng. Không dùng logo/thương hiệu hãng không có trong đội xe (vd Tesla). Chữ trong ảnh viết tiếng Việt có dấu.

- [x] **A1** Icon & splash (cần trước L8.4): `assets/icon.png` 1024×1024; `assets/adaptive-icon.png` 1024×1024 (logo nằm trong vùng an toàn 66% giữa ảnh, nền trong suốt); `assets/splash.png` logo RENTO 1024×1024 nền trong suốt. Giữ nguyên `assets/rento.png` cho tới khi L8.4 đổi đường dẫn.
- [x] **A2** Tối ưu 24 ảnh xe trong `assets/cars/`: **giữ nguyên tên file**, PNG nền trong suốt, rộng ≤ 1200 px, ≤ 300 KB mỗi ảnh, cùng góc nhìn ¾ trước. `mercedes_benz.gif` (2,6 MB) → thêm `mercedes_benz.png` và ghi vào ghi chú bàn giao để Claude đổi `require`. Mục tiêu cả thư mục < 6 MB.
- [x] **A3** Banner khuyến mãi thay `assets/coup1.png` và `assets/coup2.png` (giữ tên file), 1200×620: "FIRST20 – Giảm 20% chuyến thuê đầu tiên", "WEEKEND50 – Giảm 50% thuê xe cuối tuần". Dùng xe có trong đội xe.
- [x] **A4** Minh hoạ onboarding thay `adv cars.gif` và `modal_360.gif` bằng PNG ≤ 300 KB (`assets/onboarding/1.png`, `2.png`, `3.png`, 1080×1080) theo 3 câu: "Chọn xe ưng ý, đi đâu cũng dễ" · "Đặt xe chỉ trong vài phút" · "Sẵn sàng lên đường". Claude đổi `data/assets.ts`.
- [x] **A5** Minh hoạ trạng thái rỗng (cần trước U3/U5/U8.1): `assets/empty/no-bookings.png`, `no-liked.png`, `no-notifications.png`, `no-results.png`, `no-reviews.png` — 600×600, nền trong suốt, phong cách phẳng cùng bộ.
- [ ] **A6** (tuỳ chọn) Thư viện ảnh chi tiết xe: 3 ảnh dùng chung `assets/cars/gallery/interior.png`, `dashboard.png`, `trunk.png` (1200×800).
- [x] **A7** Liệt kê asset không được tham chiếu (grep `app/ components/ data/`): hiện là `gcash-logo.png`, `paypal-logo.png`, `developers/*`. Xoá sau khi Claude xác nhận ở L8.2.
- [ ] **A8** (cuối cùng, sau U8.1) Ảnh chụp màn hình thật: `npm run web`, khung 390×844, chụp 8 màn (Chào mừng, Trang chủ, Tìm xe, Chi tiết xe, Đặt xe, Chi tiết đơn, Thông báo, Quản trị) → `docs/screenshots/*.png` + ảnh bìa ghép `docs/screenshots/cover.png` thay ảnh README cũ.
- [x] **A9** (tuỳ chọn, cho báo cáo) Sơ đồ `docs/diagrams/`: use case 3 vai trò, luồng trạng thái đơn (D2), sơ đồ dữ liệu Firestore (mục 4).

**Ghi chú bàn giao Track A** (Antigravity, điều phối ghi lại):
- A1: `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png` (1024×1024, 23–29 KB). `app.json` đã trỏ sang (L8.4); `assets/rento.png` không còn được tham chiếu.
- A2: 24 ảnh xe nén giữ nguyên tên, 1200×848, thư mục `assets/cars` 31 MB → 4,6 MB. Thêm `assets/cars/mercedes_benz.png` thay `mercedes_benz.gif` (đã đổi `CAR_IMAGES`; file `.gif` chờ xoá ở L8.2).
- A3: `assets/coup1.png` (FIRST20, BMW M4), `assets/coup2.png` (WEEKEND50), 1200×620, chữ tiếng Việt.
- A5: `assets/empty/no-bookings.png`, `no-liked.png`, `no-notifications.png`, `no-results.png`, `no-reviews.png` (600×600, nền trong suốt, 30–47 KB).
- A7 (chỉ liệt kê): không còn tham chiếu `assets/gcash-logo.png`, `assets/paypal-logo.png`, `assets/developers/*` (4 ảnh), `assets/cars/mercedes_benz.gif`, `assets/rento.png`; `adv cars.gif`, `modal_360.gif` sẽ thừa sau khi A4 thay vào màn chào → xoá ở L8.2.
- A4 lần 1 bị trả lại: ảnh có sẵn tiêu đề (trùng chữ màn chào), bóng xe lỗi, icon emoji đơn sắc, `2.png` xe che thẻ lịch trình và ghi sai nghiệp vụ ("xác nhận tức thì", "duyệt tự động", "Chuyển khoản").
- A4 lần 2 đạt: `assets/onboarding/1.png` (đội xe, 3 thành phố), `2.png` (GPLX do RENTO duyệt, RENTO xác nhận đơn, Thẻ · MoMo · ZaloPay, mã ưu đãi), `3.png` (biên bản giao nhận, tiền cọc trả khi nhận – hoàn khi trả), 1080×1080, 51–66 KB, không chữ tiêu đề. `PROMO_ASSETS.onboardingCars` / `onboardingBooking` / `welcome360` trỏ sang 3 ảnh này.
- L8.2 (Claude): đã xoá asset không dùng (`gcash-logo.png`, `paypal-logo.png`, `developers/*`, `cars/mercedes_benz.gif`, `rento.png`, `adv cars.gif`, `modal_360.gif`); bỏ `testFirestoreConnection`, hằng tiếng Anh cũ, `useBookings` cũ (đã viết lại). L8.3: 55 test (`utils/__tests__`).
- A9: `docs/diagrams/use-case`, `booking-states`, `firestore-data` (.svg nguồn + .png ~1600px). Cần cập nhật `firestore-data` sau G7 (carTypes, role, phản hồi phiếu hỗ trợ, thanh toán tiền mặt).
- Antigravity bị ngắt 4 lần (401, broken pipe ×2, no route to host) — đã chạy lại phần còn lại.

---

## 6. Nghiệm thu end-to-end (chạy sau G6, lặp lại sau G8)

Luồng chính (khách và admin là 2 tài khoản):
1. Đăng ký (có SĐT, CCCD) → OTP → vào Trang chủ.
2. Gửi GPLX → admin duyệt → khách nhận thông báo "GPLX đã được xác minh".
3. Chọn ngày nhận/trả ở Home → Search chỉ hiện xe trống → Chi tiết xe → Đặt xe với mã `FIRST20` → đơn "Chờ xác nhận".
4. Admin xác nhận → khách nhận thông báo → đơn "Chờ thanh toán" → thanh toán MoMo → màn thành công → "Sắp nhận xe".
5. Admin lập biên bản giao xe → "Đang thuê", xe `Rented` → biên bản nhận lại xe có phí trễ giờ → "Hoàn thành", hoàn cọc đúng.
6. Khách đánh giá 5 sao → điểm xe cập nhật → admin thấy doanh thu tăng đúng.

Trường hợp chặn:
- Đặt trùng ngày với đơn khác của cùng xe → báo lỗi.
- Huỷ đơn đã trả < 24h trước giờ nhận → hoàn 70%.
- Thanh toán bằng thẻ `4000 0000 0000 0002` → thất bại, đơn vẫn "Chờ thanh toán".
- Đánh giá xe chưa từng thuê → không có nút.
- Tài khoản thường mở `/admin` → bị đẩy về; tài khoản bị khoá → không đăng nhập được.
- (Sau G8) Khách đọc đơn của người khác → Firestore từ chối.

---

## 7. Prompt mẫu

**Claude**
```
Đọc docs/PLAN.md. Làm các task L<n>.* của G<n> đúng theo mục 3–4. Chỉ sửa file thuộc Claude (mục 1).
Xong: tsc + jest sạch, tick checkbox, viết "Ghi chú bàn giao G<n>" cho Codex (hàm/hook nào, gọi ở đâu,
lỗi ném ra là gì), commit "[L<n>] …".
```
Bước kiểm tra tích hợp: `Đọc docs/PLAN.md. Kiểm tra tích hợp G<n> (bước V): tsc, jest, rà luồng của G<n>, sửa lỗi, commit "[V<n>] …".`

**Codex**
```
Đọc CLAUDE.md (quy ước Việt hoá + Hệ thống thiết kế) và docs/PLAN.md mục 1, 4, G<n> + Ghi chú bàn giao G<n>.
Làm các task U<n>.*. Chỉ gọi hàm/hook đã có trong utils/ và hooks/; không tự ghi Firestore,
không sửa utils/, hooks/, types/, config/, data/. Chuỗi tiếng Việt có dấu; tiền formatCurrency, ngày formatDate;
style bằng token theme/. Xong: ./node_modules/.bin/tsc --noEmit -p . sạch, xem thử bằng npm run web,
tick checkbox, commit "[U<n>] …". Thiếu hàm nào thì ghi vào Ghi chú bàn giao, đừng tự viết.
```

**Antigravity**
```
Đọc docs/PLAN.md mục 1 và task A<n>. Chỉ ghi vào assets/ hoặc docs/screenshots, docs/diagrams;
không sửa mã nguồn. Đúng tên file, kích thước, dung lượng ghi trong task. Đổi tên/định dạng file nào
thì ghi vào "Ghi chú bàn giao Track A". Xong tick checkbox, commit "[A<n>] …".
```

---

## 8. Rủi ro

- **Trùng lịch** chỉ kiểm tra phía client (D9): giảm rủi ro bằng bước admin xác nhận, chưa chặn tuyệt đối.
- **Ảnh base64 trong Firestore** bị giới hạn 1 MB/doc: nén ảnh ≤ 700 KB; nâng cấp lên Storage nếu cần ảnh lớn.
- **Rules (L8.1)** sẽ chặn mọi thao tác admin nếu tài khoản admin chưa có `isAdmin = true` (G0.2). Deploy rules là việc người dùng tự làm.
- **Đổi luồng (D2)** làm đơn `Pending` cũ phải chờ admin xác nhận; xoá dữ liệu thử cũ trước khi demo nếu cần.
- **Ảnh AI tạo (A2–A6)** có thể sai chi tiết mẫu xe thật; ảnh xe nên giữ ảnh gốc, chỉ nén.
- **Codex/Antigravity không chạy được trên điện thoại**: kiểm tra trên `npm run web`; luồng native (DateTimePicker, image picker) do người dùng thử lại trên Expo Go ở bước V.
