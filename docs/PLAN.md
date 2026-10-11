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
- [ ] **U1.1** Form xe trong admin: thêm biển số, hộp số, tiền cọc, mô tả, tiện nghi (chip chọn nhiều), trạng thái (4 lựa chọn); nút "Nạp dữ liệu xe mẫu"; badge trạng thái trên thẻ xe.
- [ ] **U1.2** Car details: hiển thị hộp số, tiền cọc, mô tả, tiện nghi; nút tim; nhãn "Đang bảo dưỡng"/"Tạm ngừng" + nút đặt bị khoá. Bỏ 4 chấm ảnh giả nếu chưa có A6.
- [ ] **U1.3** Trạng thái loading (skeleton) và rỗng cho danh sách xe ở Home/Search.

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

### G2 — Đặt xe theo ngày, xe còn trống, mã giảm giá, GPLX
**Claude**
- [ ] **L2.1** `utils/booking.ts`: `getBookingRange`, `daysBetween`, `rangesOverlap`, `isCarFree`, `calcBookingPrice` (mã giảm áp trước VAT; `FIRST20`/`WELCOME25` chỉ cho người chưa có đơn đã thanh toán; `WEEKEND50` chỉ khi ngày nhận là T7/CN) + test.
- [ ] **L2.2** `createBooking`: đọc đơn của xe, chặn trùng, ghi field mới, `status: "Pending"`, thông báo "Đã gửi yêu cầu đặt xe". Checkout dùng hàm này; sau khi tạo về chi tiết đơn, **không** sang màn thanh toán nữa (D2).
- [ ] **L2.3** Bắt buộc GPLX: checkout yêu cầu `licenses/{uid}.status` là `pending` hoặc `verified`, nếu không thì chuyển `/profile/license`.
- [ ] **L2.4** Tìm theo ngày: Home/Search truyền `pickup`, `return` qua params; lọc xe trống bằng một query `bookings where status in [...]` rồi lọc phía client; thêm lọc hộp số.
- [ ] **L2.5** GPLX: sửa mặc định `verified: true`; lưu các trường nhập (kiểm tra số GPLX 12 chữ số, hạng, ngày hết hạn > hôm nay); `useLicense()`; `verifyLicense`/`rejectLicense` + thông báo.

**Codex**
- [ ] **U2.1** Checkout: chọn ngày-giờ nhận và ngày-giờ trả (`@react-native-community/datetimepicker` đã cài) thay chip 1–4 ngày; điểm trả xe (mặc định = điểm nhận); ô mã giảm giá + dòng "Giảm giá"; dòng "Tiền cọc (trả khi nhận xe)"; hiện lỗi trùng lịch.
- [ ] **U2.2** Home/Search: thanh "Nhận xe – Trả xe" mở bộ chọn ngày rồi sang Search; chip hộp số trong bộ lọc; dòng tóm tắt khoảng ngày đang lọc.
- [ ] **U2.3** Màn GPLX: form nhập 4 trường + ảnh trước/sau; trạng thái Chờ duyệt / Đã xác minh / Bị từ chối (kèm lý do, nút gửi lại).
- [ ] **U2.4** Admin: mục "GPLX chờ duyệt" (tab mới hoặc trong Người dùng) — xem ảnh, Duyệt / Từ chối (nhập lý do).

**Ghi chú bàn giao G2:** _(…)_

### G3 — Xác nhận đơn, thanh toán, huỷ & hoàn tiền, chi tiết đơn
**Claude**
- [ ] **L3.1** `canTransition` + nhãn mới; nhóm tab Chuyến đi và chip trạng thái admin theo bảng mục 4.
- [ ] **L3.2** `confirmBooking` (kiểm tra lại trùng lịch + GPLX `verified`), `rejectBooking(reason)`; cả hai gửi thông báo.
- [ ] **L3.3** `payBooking`: 3 màn thanh toán đọc lại đơn, chỉ cho trả khi `Confirmed` và `amount === price`; thành công → `Upcoming` → `router.replace("/payment-success?bookingId=…")`. `failPayment`: thẻ thử `4000 0000 0000 0002` hoặc nút "Huỷ giao dịch" ở MoMo/ZaloPay ghi `payment.status: "Failed"`, đơn giữ `Confirmed`.
- [ ] **L3.4** `cancelBooking` theo D5: ghi `refundAmount`, `refundedAt`, `payment.status: "Refunded"`, `cancelledBy`; chặn huỷ khi `Active`.
- [ ] **L3.5** `rescheduleBooking` theo D7 (tính lại bằng `calcBookingPrice`, chặn trùng).
- [ ] **L3.6** `useUserBookings`, `useBooking(id)`; `profile/history.tsx` dùng chung hook.

**Codex**
- [ ] **U3.1** Màn `app/booking/[id].tsx`: mã đơn, xe, timeline trạng thái, giờ nhận/trả, điểm nhận/trả, chi tiết giá (tạm tính, dịch vụ, giảm giá, VAT, tổng, cọc), thanh toán/hoàn tiền, nút theo trạng thái (Thanh toán · Đổi lịch · Huỷ chuyến · Đánh giá). Thẻ ở tab Chuyến đi bấm vào mở màn này.
- [ ] **U3.2** Màn `app/payment-success.tsx`: biểu tượng thành công, số tiền, phương thức, mã giao dịch, nút "Xem chuyến đi".
- [ ] **U3.3** Màn thanh toán: trạng thái thất bại + nút thử lại; nút "Huỷ giao dịch" ở MoMo/ZaloPay.
- [ ] **U3.4** Admin: nút Xác nhận / Từ chối (modal nhập lý do) trên thẻ và modal chi tiết đơn `Pending`; chip lọc trạng thái mới.
- [ ] **U3.5** Hộp thoại huỷ hiện số tiền được hoàn; badge `Confirmed`/`Rejected`.

**Ghi chú bàn giao G3:** _(…)_

### G4 — Giao xe / nhận lại xe
**Claude**
- [ ] **L4.1** `handOverBooking`: bắt buộc đủ checklist (giấy tờ, đã thu cọc, tình trạng xe), số km, mức xăng → `Active`, xe `Rented`, `handedOverAt`.
- [ ] **L4.2** `returnBooking`: km ≥ lúc giao, mức xăng, hư hỏng, phí phát sinh, `calcLateFee` (mỗi giờ trễ = 10% giá ngày, tối đa 1 ngày) → `depositRefund` → `Completed`, xe `Available`, `returnedAt`, thông báo.
- [ ] **L4.3** Doanh thu admin = tiền thuê đã thanh toán − hoàn tiền + phí phát sinh.

**Codex**
- [ ] **U4.1** Admin: bottom sheet "Biên bản giao xe" (checkbox, số km, mức xăng dạng chip ¼ ½ ¾ Đầy, ghi chú).
- [ ] **U4.2** Admin: bottom sheet "Biên bản nhận lại xe" (km, xăng, hư hỏng, các dòng phí, tiền hoàn cọc tự tính).
- [ ] **U4.3** Chi tiết đơn của khách: khối biên bản giao/nhận (chỉ xem).

**Ghi chú bàn giao G4:** _(…)_

### G5 — Đánh giá & thông báo
**Claude**
- [ ] **L5.1** `submitReview`: chỉ đơn `Completed` của chính người dùng, chưa đánh giá; transaction ghi `reviews/{bookingId}` + cập nhật `cars.rating`, `reviewCount` + `booking.reviewed`. Bỏ form đánh giá tự do ở Car details.
- [ ] **L5.2** `deleteReview` (admin), tính lại điểm.
- [ ] **L5.3** Gọi `notify` ở mọi sự kiện: đặt xe, xác nhận, từ chối, thanh toán thành công/thất bại, giao xe, hoàn tất, huỷ/hoàn tiền, GPLX duyệt/từ chối. `notifications.tsx` đọc Firestore qua `useNotifications` (bỏ dữ liệu mẫu và key AsyncStorage); đếm chưa đọc cho chuông Home; nhắc nhận xe khi có đơn `Upcoming` trong 24h tới (tính phía client).

**Codex**
- [ ] **U5.1** Bottom sheet "Đánh giá chuyến đi" (5 sao + nhận xét) mở từ chi tiết đơn và thẻ Lịch sử.
- [ ] **U5.2** Car details: điểm trung bình + số đánh giá, danh sách đánh giá, trạng thái rỗng.
- [ ] **U5.3** Màn Thông báo: icon theo loại, đã đọc/chưa đọc, bấm thì mở chi tiết đơn; chấm đỏ chuông Home; thẻ nhắc nhận xe trên Home.
- [ ] **U5.4** Admin: mục "Đánh giá" — danh sách, lọc theo số sao, xoá.

**Ghi chú bàn giao G5:** _(…)_

### G6 — Tài khoản
**Claude**
- [ ] **L6.1** Đăng ký: thêm SĐT (`validatePhone`), địa chỉ, CCCD (12 chữ số). Sau khi tạo tài khoản, giữ chỗ `phones/{phone}` trong transaction; trùng thì `deleteUser` và báo lỗi.
- [ ] **L6.2** OTP xong → `router.replace("/(tabs)")` (người dùng đã đăng nhập).
- [ ] **L6.3** Đổi mật khẩu: `reauthenticateWithCredential` + `updatePassword`, báo lỗi tiếng Việt.
- [ ] **L6.4** Thông tin cá nhân: thêm CCCD; đổi SĐT thì cập nhật `phones`.

**Codex**
- [ ] **U6.1** Form đăng ký thêm 3 trường.
- [ ] **U6.2** Màn `app/profile/change-password.tsx` + mục "Đổi mật khẩu" trong tab Tài khoản.
- [ ] **U6.3** Thông tin cá nhân: trường CCCD.

**Ghi chú bàn giao G6:** _(…)_

### G7 — Quản trị mở rộng (tuỳ chọn)
- [ ] **L7.1 / U7.1** Phiếu hỗ trợ: admin xem, trả lời (`reply`, `status: "resolved"`) + thông báo; người dùng xem phiếu của mình trong Trợ giúp.
- [ ] **L7.2 / U7.2** Loại xe: collection `carTypes` CRUD; form xe chọn từ danh sách.
- [ ] **L7.3 / U7.3** Vai trò nhân viên (chủ xe): `users.role = "staff"` vào được `/admin` nhưng ẩn tab Người dùng; admin gán vai trò.
- [ ] **L7.4 / U7.4** Thanh toán tiền mặt khi nhận xe: `Confirmed → Upcoming` với `payment.status: "Pending"`; admin tick "Đã thu tiền thuê" khi giao xe.
- [ ] **L7.5 / U7.5** Danh sách thanh toán (suy từ bookings): lọc theo trạng thái/phương thức, tổng đã hoàn.

### G8 — Bảo mật & hoàn thiện
**Claude**
- [ ] **L8.1** `firestore.rules` + `firebase.json`: khách chỉ đọc/ghi dữ liệu của mình; `cars` đọc công khai, admin ghi; admin (`users/{uid}.isAdmin`) đọc/ghi tất cả. Người dùng deploy: `! npx firebase-tools deploy --only firestore:rules` (cần đăng nhập và có quyền project `car-rental-adv`).
- [ ] **L8.2** Dọn: `hooks/useBookings` theo field thật; `BOOKING_STATUS`/`PAYMENT_STATUS` cũ; `testFirestoreConnection`; asset không còn dùng (sau A7).
- [ ] **L8.3** Test đủ cho `utils/booking.ts` (`npx jest --watchAll=false`).
- [ ] **L8.4** `app.json` trỏ icon/splash mới (sau A1). Cập nhật `CLAUDE.md` (luồng mới; bỏ dòng "Không có git") và `README.md` (tạo admin, nạp xe mẫu, deploy rules, ảnh mới từ A8).

**Codex**
- [ ] **U8.1** Rà toàn app: token thiết kế, lề, loading/rỗng/lỗi (dùng ảnh A5), chữ tiếng Việt, không tràn chữ ở màn 360 px.

### Track A — Hình ảnh (Antigravity, song song)
Màu thương hiệu: primary `#1054CF`, secondary `#FFB700`, nền trắng. Không dùng logo/thương hiệu hãng không có trong đội xe (vd Tesla). Chữ trong ảnh viết tiếng Việt có dấu.

- [ ] **A1** Icon & splash (cần trước L8.4): `assets/icon.png` 1024×1024; `assets/adaptive-icon.png` 1024×1024 (logo nằm trong vùng an toàn 66% giữa ảnh, nền trong suốt); `assets/splash.png` logo RENTO 1024×1024 nền trong suốt. Giữ nguyên `assets/rento.png` cho tới khi L8.4 đổi đường dẫn.
- [ ] **A2** Tối ưu 24 ảnh xe trong `assets/cars/`: **giữ nguyên tên file**, PNG nền trong suốt, rộng ≤ 1200 px, ≤ 300 KB mỗi ảnh, cùng góc nhìn ¾ trước. `mercedes_benz.gif` (2,6 MB) → thêm `mercedes_benz.png` và ghi vào ghi chú bàn giao để Claude đổi `require`. Mục tiêu cả thư mục < 6 MB.
- [ ] **A3** Banner khuyến mãi thay `assets/coup1.png` và `assets/coup2.png` (giữ tên file), 1200×620: "FIRST20 – Giảm 20% chuyến thuê đầu tiên", "WEEKEND50 – Giảm 50% thuê xe cuối tuần". Dùng xe có trong đội xe.
- [ ] **A4** Minh hoạ onboarding thay `adv cars.gif` và `modal_360.gif` bằng PNG ≤ 300 KB (`assets/onboarding/1.png`, `2.png`, `3.png`, 1080×1080) theo 3 câu: "Chọn xe ưng ý, đi đâu cũng dễ" · "Đặt xe chỉ trong vài phút" · "Sẵn sàng lên đường". Claude đổi `data/assets.ts`.
- [ ] **A5** Minh hoạ trạng thái rỗng (cần trước U3/U5/U8.1): `assets/empty/no-bookings.png`, `no-liked.png`, `no-notifications.png`, `no-results.png`, `no-reviews.png` — 600×600, nền trong suốt, phong cách phẳng cùng bộ.
- [ ] **A6** (tuỳ chọn) Thư viện ảnh chi tiết xe: 3 ảnh dùng chung `assets/cars/gallery/interior.png`, `dashboard.png`, `trunk.png` (1200×800).
- [ ] **A7** Liệt kê asset không được tham chiếu (grep `app/ components/ data/`): hiện là `gcash-logo.png`, `paypal-logo.png`, `developers/*`. Xoá sau khi Claude xác nhận ở L8.2.
- [ ] **A8** (cuối cùng, sau U8.1) Ảnh chụp màn hình thật: `npm run web`, khung 390×844, chụp 8 màn (Chào mừng, Trang chủ, Tìm xe, Chi tiết xe, Đặt xe, Chi tiết đơn, Thông báo, Quản trị) → `docs/screenshots/*.png` + ảnh bìa ghép `docs/screenshots/cover.png` thay ảnh README cũ.
- [ ] **A9** (tuỳ chọn, cho báo cáo) Sơ đồ `docs/diagrams/`: use case 3 vai trò, luồng trạng thái đơn (D2), sơ đồ dữ liệu Firestore (mục 4).

**Ghi chú bàn giao Track A:** _(…)_

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
