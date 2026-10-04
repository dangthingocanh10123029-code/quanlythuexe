# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này.

## Tổng quan

**RENTO** — app thuê xe di động (đồ án môn *Ứng dụng Mobile đa nền tảng*). Expo SDK 53 + React Native 0.79 + React 19 + **Expo Router 5** (file-based routing, `typedRoutes` bật) + **Firebase 11** (Auth + Firestore) + TypeScript strict. Tên hiển thị trong `app.json` là `RENTO`; package/slug vẫn là `pezo` (tên cũ) — không phải lỗi.

**Toàn bộ giao diện đã Việt hoá** (tiếng Việt, VND, địa điểm TP. HCM / Hà Nội / Đà Nẵng, thanh toán Thẻ ngân hàng / MoMo / ZaloPay, số điện thoại +84, ngày dd/mm/yyyy). Mọi chuỗi mới thêm vào phải viết tiếng Việt có dấu, theo đúng thuật ngữ đang dùng (xem mục *Quy ước Việt hoá*).

## Lệnh

```bash
npm install          # cài dependency
npm run start        # expo start (Expo Go / dev server)
npm run android      # | ios | web
npm test             # jest --watchAll (preset jest-expo) — hiện CHƯA có file test nào
./node_modules/.bin/tsc --noEmit -p .   # type-check (không có script lint riêng)
```

`npx tsc` khi chưa có `node_modules` sẽ tải nhầm gói `tsc` và chỉ in thông báo, không kiểm tra gì — luôn `npm install` trước (mạng có thể ECONNRESET, cần thử lại).

## Kiến trúc

- `app/` — màn hình theo Expo Router. `app/_layout.tsx` là Stack gốc (ẩn header); `app/(tabs)/` là bottom tab Home / Cars(search) / Bookings / Profile; `app/car-details/[id].tsx` là route động; `app/profile/*` là các trang con của hồ sơ. `app/chats.tsx` đang rỗng.
- `config/firebase.ts` — khởi tạo Firebase, export `auth`, `db`. Config key đang hard-code trong file (project `car-rental-adv`).
- `hooks/` — `useAuth` (dùng nhiều nhất: `user`, `isAdmin`, `signOut`, `refresh`), `useCars`, `useBookings`, `useNotifications` (hai hook sau gần như không được màn hình nào dùng; `useBookings` dùng `orderBy` nên cần composite index — các màn tự query `where("userId")` rồi sắp xếp phía client).
- `data/cars.ts` — **danh sách xe tĩnh** (giá `pricePerDay` theo VND, `location` là thành phố VN, `fuel` "Xăng"/"Dầu diesel") (`require` ảnh trong `assets/cars/`). Home, Search, Car details, Checkout, Liked cars đều đọc xe từ file này, *không* từ collection `cars` trên Firestore (collection đó chỉ dùng trong `admin.tsx`).
- `components/ui/` — Button, Input, Card, Avatar, LoadingSpinner (ít được dùng; màn hình phần lớn tự viết UI); `PaymentLogo` vẽ logo Thẻ/MoMo/ZaloPay bằng huy hiệu (không có file ảnh). `components/DummyMap.tsx` là bản đồ giả lập các điểm ở TP. HCM.
- `utils/constants.ts` — `COLORS` (primary `#1054CF`, secondary `#FFB700`), `FONTS`, `SPACING`, `BORDER_RADIUS`, enum trạng thái, và các hằng số Việt hoá: `CITIES`, `PICKUP_LOCATIONS`, `VAT_RATE` (10%), `PAYMENT_METHODS`, `getBookingStatusLabel`, `PAYMENT_STATUS_LABELS`, `HOTLINE`, `SUPPORT_EMAIL`. `utils/helpers.ts` — `formatCurrency` (→ "1.200.000đ", tự định dạng, không dùng `Intl` vì Hermes), `formatDate(d, "short"|"long"|"time"|"datetime")`, `validatePhone` (số VN).
- `types/` — interface `User`, `Car`, `Booking`, `Notification`… (khá lệch so với dữ liệu thực tế được ghi).

### Quy ước code
- Màn hình gọi Firestore **trực tiếp** trong component (`addDoc`, `updateDoc`, `onSnapshot`…) thay vì qua lớp service. Giữ theo phong cách này khi sửa.
- Style bằng `StyleSheet.create` ở cuối mỗi file; màu thường hard-code hex. Icon dùng `@expo/vector-icons` (Ionicons).
- Import bằng đường dẫn tương đối (`../../hooks/useAuth`) dù tsconfig có alias `@/*`.

### Luồng chính
1. `/` (carousel) → `/login` hoặc `/register` → `/otp` → `/(tabs)`.
2. Admin: nút "QUẢN TRỊ" ở màn login, mật khẩu hard-code `ADMIN123` → `/admin`. Mọi số liệu/biểu đồ tính realtime từ `cars`, `bookings`, `users` (`onSnapshot`). Admin sửa/xoá xe, xem chi tiết/huỷ đơn, chuyển Upcoming→Active ("Giao xe") → Completed ("Nhận lại xe"), khoá/mở khoá user (`disabled`, `status`); login chặn user bị khoá.
3. Đặt xe: `car-details/[id]` → `/checkout` tạo doc `bookings` (status `"Pending"`) → `router.push` sang `/credit-card` | `/momo` | `/zalopay` với params `amount`, `bookingId` → màn thanh toán (giả lập) `updateDoc` status `"Upcoming"` + object `payment` (`method`: "Thẻ ngân hàng" | "MoMo" | "ZaloPay") → `/(tabs)/bookings`. Tổng tiền = tiền thuê + dịch vụ thêm + VAT 10%.
4. Tab Chuyến đi: Sắp tới (Pending + Upcoming) · Đang thuê (Active) · Lịch sử (Completed + Cancelled). Đơn Pending có "Thanh toán ngay"; Pending/Upcoming có "Đổi lịch" (ghi `pickupDate`, `duration`, `price`) và "Huỷ chuyến" (status `"Cancelled"`, `cancelledAt`).

### Firestore collections
- `users` (doc id = uid): `isAdmin`, `disabled`, `status` ("active"/"inactive"), `preferences` {notifications, location, darkMode}
- `bookings`: `userId, carId, carName, carImage, duration, location, status, price, selectedAddOns, createdAt, payment?, pickupDate?, cancelledAt?, handedOverAt?, returnedAt?`
- `cars` (admin quản lý), `reviews`, `likedCars`, `notifications`
- `supportTickets`: `userId, userEmail, subject, message, priority, status: "open", createdAt`
- `licenses/{uid}`: GPLX + ảnh base64 (tách khỏi `users` để doc user nhẹ)

Trạng thái booking (giá trị lưu, viết hoa chữ đầu): `Pending` → `Upcoming` (đã thanh toán) → `Active` → `Completed`, hoặc `Cancelled`. Luôn so sánh không phân biệt hoa thường. Ngày từ Firestore có thể là `Timestamp` → `.toDate()` trước khi `formatDate`.

AsyncStorage: `rento:readNotificationIds` (thông báo demo đã đọc).

## Quy ước Việt hoá
- Chuỗi hiển thị: tiếng Việt có dấu, xưng "bạn", dùng "huỷ"/"xoá". Thuật ngữ: Trang chủ · Xe · Chuyến đi · Tài khoản (tab), Đặt xe ngay, Điểm nhận xe, Thời gian thuê, Dịch vụ thêm, Chi tiết giá, Tạm tính / Tổng cộng, Phương thức thanh toán, Xe yêu thích, Giấy phép lái xe (GPLX), Trang quản trị, Nhóm phát triển.
- Tiền luôn qua `formatCurrency`, ngày qua `formatDate` — không dùng `$`, `toFixed(2)`, `toLocaleDateString`.
- **Giá trị lưu Firestore / dùng để so sánh giữ tiếng Anh** (`status: "Pending" | "Upcoming" | "Active" | "Completed"`, user `status`, car `status: "Available"`); chỉ đổi nhãn hiển thị qua `getBookingStatusLabel` / các bảng `*_LABELS`.
- Màn đặt xe ở `bookings.tsx` vẫn chấp nhận `payment.method` cũ ("GCash", "PayPal", "Credit Card") để hiển thị đơn cũ.
- Tên thành viên trong `app/developers.tsx` giữ nguyên (ghi công tác giả gốc).

## Lưu ý / bẫy
- `BOOKING_STATUS` và `useBookings` dùng chữ thường còn dữ liệu lưu viết hoa — so sánh không phân biệt hoa thường.
- Trang quản trị không dùng Firebase Auth admin thật (chỉ mật khẩu cứng); nếu Firestore rules chặn đọc `users`/`bookings` thì danh sách admin sẽ rỗng.
- Màn Cài đặt chỉ lưu `preferences`; chưa màn nào áp dụng (vd chế độ tối). Thông báo (`notifications.tsx`), GPLX demo, phương thức thanh toán đã lưu (`profile/payment.tsx`, chỉ state) vẫn là dữ liệu mẫu.
- Field booking thực tế là `price`, `duration`, `location`, `carName`… — khác với `types/booking.ts`.
- Query có `where` + `orderBy` trên Firestore cần composite index.
- `app.json` trỏ tới `./assets/images/*` (icon, splash) nhưng thư mục đó không tồn tại.
- Không có git trong thư mục này.

## Skills trong dự án

Thư mục `skills/` là bản sao repo [anthropics/skills](https://github.com/anthropics/skills) — **không thuộc mã nguồn app**, không import/sửa khi làm việc với app. Các skill trong `skills/skills/<tên>/` đã được symlink vào `.claude/skills/<tên>` nên Claude Code tự nhận diện (gọi bằng `/<tên>` hoặc tự kích hoạt theo mô tả). Mỗi skill có `SKILL.md` là hướng dẫn chính, kèm `scripts/`, `reference/` nếu có.

Skill hữu ích cho đồ án này:

| Skill | Dùng khi |
|---|---|
| [docx](skills/skills/docx/SKILL.md) | Viết báo cáo đồ án dạng Word |
| [pptx](skills/skills/pptx/SKILL.md) | Làm slide thuyết trình |
| [pdf](skills/skills/pdf/SKILL.md) | Đọc/xuất/ghép PDF |
| [xlsx](skills/skills/xlsx/SKILL.md) | Bảng tính (test case, kế hoạch, dữ liệu xe) |
| [doc-coauthoring](skills/skills/doc-coauthoring/SKILL.md) | Soạn tài liệu/spec theo quy trình |
| [frontend-design](skills/skills/frontend-design/SKILL.md) | Thiết kế lại giao diện màn hình |
| [theme-factory](skills/skills/theme-factory/SKILL.md) | Áp theme màu/font cho slide, tài liệu |
| [webapp-testing](skills/skills/webapp-testing/SKILL.md) | Test bản web (`npm run web`) bằng Playwright |
| [skill-creator](skills/skills/skill-creator/SKILL.md) | Tạo skill mới cho dự án |

Skill khác có sẵn: `algorithmic-art`, `canvas-design`, `brand-guidelines` (brand Anthropic), `internal-comms`, `mcp-builder`, `claude-api`, `web-artifacts-builder`, `slack-gif-creator`, `academy-guide`, `discernment-nudge`. Template skill: `skills/template/SKILL.md`; đặc tả: `skills/spec/agent-skills-spec.md`.

Thêm skill mới: tạo `skills/skills/<tên>/SKILL.md` rồi `ln -s ../../skills/skills/<tên> .claude/skills/<tên>`.
