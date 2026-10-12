# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này.

## Tổng quan

**RENTO** — app thuê xe di động (đồ án môn *Ứng dụng Mobile đa nền tảng*). Expo SDK 57 + React Native 0.86 + React 19.2 + **Expo Router** (bản đi kèm SDK 57) (file-based routing, `typedRoutes` bật) + **Firebase 11** (Auth + Firestore) + TypeScript strict. Tên hiển thị trong `app.json` là `RENTO`; package/slug vẫn là `pezo` (tên cũ) — không phải lỗi.

**Toàn bộ giao diện đã Việt hoá** (tiếng Việt, VND, địa điểm TP. HCM / Hà Nội / Đà Nẵng, thanh toán Thẻ ngân hàng / MoMo / ZaloPay, số điện thoại +84, ngày dd/mm/yyyy). Mọi chuỗi mới thêm vào phải viết tiếng Việt có dấu, theo đúng thuật ngữ đang dùng (xem mục *Quy ước Việt hoá*).

## Lệnh

```bash
npm install          # cài dependency
npm run start        # expo start (Expo Go / dev server)
npm run android      # | ios | web
npm test             # jest --watchAll (preset jest-expo); chạy một lần: npx jest --watchAll=false (test ở utils/__tests__)
./node_modules/.bin/tsc --noEmit -p .   # type-check (không có script lint riêng)
```

`npx tsc` khi chưa có `node_modules` sẽ tải nhầm gói `tsc` và chỉ in thông báo, không kiểm tra gì — luôn `npm install` trước (mạng có thể ECONNRESET, cần thử lại).

## Kiến trúc

- `app/` — màn hình theo Expo Router. `app/_layout.tsx` là Stack gốc (ẩn header); `app/(tabs)/` là bottom tab Home / Cars(search) / Bookings / Profile; route động `app/car-details/[id].tsx`, `app/booking/[id].tsx` (chi tiết đơn); `app/payment-success.tsx`; `app/profile/*` là các trang con của hồ sơ.
- `config/firebase.ts` — khởi tạo Firebase, export `auth`, `db`. Config key đang hard-code trong file (project `rento-app-e2c08`; code gốc dùng `car-rental-adv` không thuộc nhóm). `firestore.rules` + `firebase.json` + `.firebaserc` để deploy rules.
- `hooks/` — `useAuth` (`user`, `isAdmin`, `signOut`, `refresh`), `useUid` (chỉ uid, nhẹ), `useCars`/`useCar`/`getCarImage`/`useBusyCarIds`, `useLikedCarIds`, `useUserBookings`/`useBooking`, `useLicense`/`useAllLicenses`, `useCarReviews`/`useAllReviews`, `useNotifications`, `useMyTickets`/`useAllTickets`, `useCarTypes`. Không dùng `orderBy` cùng `where` (cần composite index) — sắp xếp phía client.
- `utils/booking.ts` — **nghiệp vụ dạng hàm thuần, có test**: `calcBookingPrice`, `daysBetween`, `getBookingRange`, `isCarFree`, `canTransition`, `calcRefund`, `calcLateFee`, `calcReturnSettlement`, `bookingRevenue`, `applyRating`, `findPickupReminder`, `toDate`. `utils/license.ts` — `validateLicense`, `parseVnDate`.
- `utils/bookingActions.ts`, `licenseActions.ts`, `accountActions.ts`, `carActions.ts`, `adminActions.ts` (phiếu hỗ trợ, loại xe, vai trò), `notify.ts` — **ghi Firestore cho nghiệp vụ** (ngoại lệ có chủ đích với quy ước "màn hình gọi Firestore trực tiếp"): mỗi hàm tự kiểm tra điều kiện, gửi thông báo, ném `Error` message tiếng Việt (một số có `code`, vd `license-required`, `phone-taken`) để UI hiện thẳng.
- `data/cars.ts` — 24 xe mẫu (id "1"…"24", `imageKey` tra ảnh trong `CAR_IMAGES` ở `data/assets.ts`), chỉ dùng để admin "Nạp dữ liệu xe mẫu" (`seedCars`). **App đọc xe từ Firestore `cars`** qua `useCars`.
- `components/` — thẻ xe, `CarCardSkeleton`, `DateTimeRangePicker` (`.web.tsx` là bản dự phòng vì DateTimePicker không chạy trên web)…; `components/ui/PaymentLogo` vẽ logo Thẻ/MoMo/ZaloPay. `components/DummyMap.tsx` là bản đồ giả lập.
- `utils/constants.ts` — `CITIES`, `PICKUP_LOCATIONS`, `VAT_RATE` (10%), `PAYMENT_METHODS`, `PROMO_CODES`, `BOOKING_STATUS_LABELS`/`getBookingStatusLabel`, `BOOKING_TABS`, `OPEN_BOOKING_STATUSES`, `CAR_STATUS_LABELS`, `HIDDEN_CAR_STATUSES`, `FUELS`, `TRANSMISSIONS`, `AMENITIES`, `FUEL_LEVELS`, `LICENSE_CLASSES`, `LICENSE_STATUS_LABELS`, `PAYMENT_STATUS_LABELS`, `HOTLINE`, `SUPPORT_EMAIL`. `utils/helpers.ts` — `formatCurrency` (→ "1.200.000đ", không dùng `Intl` vì Hermes), `formatDate(d, "short"|"long"|"time"|"datetime")`, `validatePhone`, `normalizePhone`, `validateIdNumber`.
- `types/` — `Car`, `Booking` theo hợp đồng dữ liệu ở `docs/PLAN.md` mục 4; `User`, `DriverLicense`, `Notification`.
- `docs/PLAN.md` — kế hoạch hoàn thiện (Claude · Codex · Antigravity), hợp đồng dữ liệu, ghi chú bàn giao từng giai đoạn.

### Quy ước code
- Màn hình cũ gọi Firestore **trực tiếp** trong component. Nghiệp vụ đặt xe / GPLX / tài khoản đi qua `utils/*Actions.ts` (xem trên) — thêm nghiệp vụ mới thì viết hàm ở đó, logic tính toán để ở `utils/booking.ts` kèm test.
- Style bằng `StyleSheet.create` ở cuối mỗi file; màu thường hard-code hex. Icon dùng `@expo/vector-icons` (Ionicons).
- Import bằng đường dẫn tương đối (`../../hooks/useAuth`) dù tsconfig có alias `@/*`.

### Luồng chính
1. `/` (carousel) → `/login` hoặc `/register` (thêm SĐT, CCCD, địa chỉ; SĐT không trùng nhờ `phones/{phone}`) → `/otp` (giả lập, mã 4 số bất kỳ) → `/(tabs)`.
2. Admin: tài khoản có `users/{uid}.isAdmin = true` (bật tay trên Firebase Console) hoặc nhân viên `users.role = "staff"` (admin gán trong trang quản trị; không thấy tab Người dùng) đăng nhập sẽ vào thẳng `/admin`; người khác mở `/admin` bị đẩy về `/login`. Không còn mật khẩu cứng. Admin: quản lý xe (form đủ field, nạp xe mẫu, chặn xoá xe còn đơn), duyệt GPLX, xác nhận/từ chối đơn, biên bản giao xe / nhận lại xe, huỷ đơn (hoàn 100%), khoá user, đánh giá, phiếu hỗ trợ (trả lời), loại xe, danh sách thanh toán, báo cáo (doanh thu = đã thanh toán − hoàn + phí phát sinh).
3. Đặt xe (D2): chọn ngày nhận–trả (Home/Search lọc xe trống) → `car-details/[id]` → `/checkout` (`createBooking`: bắt buộc GPLX đã gửi, mã giảm giá, chặn trùng lịch) → đơn `Pending` "Chờ xác nhận" → admin xác nhận → `Confirmed` "Chờ thanh toán" → khách thanh toán `/credit-card` | `/momo` | `/zalopay` (`payBooking`; thẻ `4000 0000 0000 0002` thất bại) → `/payment-success` → `Upcoming` (hoặc chọn "Tiền mặt khi nhận xe": `chooseCashPayment`, `payment.status "Pending"`, admin tick "Đã thu tiền thuê" khi giao xe) → admin giao xe (`Active`, xe `Rented`) → nhận lại xe (`Completed`, quyết toán cọc) → khách đánh giá. Tổng tiền = tiền thuê − giảm giá + dịch vụ thêm + VAT 10%; tiền cọc trả khi nhận xe, không cộng vào thanh toán online.
4. Tab Chuyến đi: Sắp tới (Pending, Confirmed, Upcoming) · Đang thuê (Active) · Lịch sử (Completed, Cancelled, Rejected). Huỷ ≥ 24h trước giờ nhận hoàn 100%, < 24h hoàn 70% (`calcRefund`); đổi lịch theo D7 (`rescheduleBooking`).

### Firestore collections
Chi tiết field ở `docs/PLAN.md` mục 4.
- `users/{uid}`: `isAdmin`, `disabled`, `status` ("active"/"inactive"), `phone`, `address`, `idNumber`, `preferences`
- `cars/{id}`: hộp số, cọc, biển số, mô tả, tiện nghi, `status` (`Available | Rented | Maintenance | Inactive`), `imageKey` | `image` (data URI), `rating`, `reviewCount`
- `bookings`: `pickupDate`, `returnDate`, `subtotal`, `discount`, `tax`, `price` (tổng online), `deposit`, `payment`, `handover`, `returnInspection`, `reviewed`…
- `bookedSlots/{bookingId}`: khoảng ngày xe bị giữ (đọc công khai cho người đã đăng nhập; khách không đọc được `bookings` của người khác)
- `reviews/{bookingId}`, `notifications`, `likedCars/{uid}_{carId}`, `licenses/{uid}` (`status: pending | verified | rejected`), `phones/{phone}`, `supportTickets` (`status: open | resolved`, `reply`), `carTypes`

Trạng thái booking (giá trị lưu, viết hoa chữ đầu): `Pending` → `Confirmed` → `Upcoming` → `Active` → `Completed`, hoặc `Rejected` / `Cancelled`. Luôn so sánh không phân biệt hoa thường; kiểm tra chuyển trạng thái qua `canTransition`. Ngày từ Firestore có thể là `Timestamp` → dùng `toDate()` (utils/booking) trước khi `formatDate`.

## Quy ước Việt hoá
- Chuỗi hiển thị: tiếng Việt có dấu, xưng "bạn", dùng "huỷ"/"xoá". Thuật ngữ: Trang chủ · Xe · Chuyến đi · Tài khoản (tab), Đặt xe ngay, Điểm nhận xe, Thời gian thuê, Dịch vụ thêm, Chi tiết giá, Tạm tính / Tổng cộng, Phương thức thanh toán, Xe yêu thích, Giấy phép lái xe (GPLX), Trang quản trị, Nhóm phát triển.
- Tiền luôn qua `formatCurrency`, ngày qua `formatDate` — không dùng `$`, `toFixed(2)`, `toLocaleDateString`.
- **Giá trị lưu Firestore / dùng để so sánh giữ tiếng Anh** (booking `status`, user `status`, car `status`, license `status`); chỉ đổi nhãn hiển thị qua `getBookingStatusLabel` / các bảng `*_LABELS`.
- Màn đặt xe ở `bookings.tsx` vẫn chấp nhận `payment.method` cũ ("GCash", "PayPal", "Credit Card") để hiển thị đơn cũ.
- `app/developers.tsx` hiển thị nhóm phát triển: Ngọc Ánh, Đoan Trang (avatar chữ cái đầu, không có email).

## Hệ thống thiết kế ("Layered & Depth")
Token gốc nằm trong `theme/` (`colors.ts`, `spacing.ts`, `typography.ts`, `shadows.ts`); `utils/theme.ts` là lớp re-export tương thích. Dùng token, không hard-code màu/bóng:
- Nền mọi màn `#FFFFFF` (`UI.screen`); header trắng, ngăn cách bằng `UI.divider` hoặc khoảng trắng. Không dùng nền xám/xanh toàn màn.
- Thẻ nội dung: `...UI.card` (viền 1px `#E5E7EB`, bo 22, `SHADOWS.card` — bóng đa lớp bằng `boxShadow`, cần New Architecture đang bật). Modal/bottom sheet: bo 28 (`RADIUS.sheet`), `SHADOWS.raised`, lớp phủ `THEME_COLORS.overlay`.
- Điều khiển: input/button bo 16, chip bo 14. Ô nhập `UI.input` + `UI.inputFocused`; chip `UI.chip`/`UI.chipActive`.
- Nút: Primary `UI.primaryButton` (nâng nhẹ `SHADOWS.primaryButton`, tối đa 1–2 nút/màn); phụ `UI.secondaryButton` (phẳng, viền); nguy hiểm nền `dangerSoft` chữ `danger`. `activeOpacity={PRESS_OPACITY}`.
- Chữ: `TYPOGRAPHY.h1/h2/h3/body/caption/overline/price`; màu chữ chỉ 3 cấp `textPrimary`/`textSecondary`/`textMuted`.
- Khoảng trắng: lề màn `SPACE.screen` (20), giữa các khu vực `SPACE.section` (32). Màn trong tab chừa `paddingBottom` ~120 cho thanh tab nổi.
- Badge trạng thái: nền soft + chữ cùng tông, bo `RADIUS.pill`.
- Không dùng `shadowColor/shadowOpacity/elevation` (đã thay bằng `boxShadow`). Kiểu: `UI.input` là `TextStyle`, `UI.inputFocused` là `ViewStyle` → cần ép kiểu khi áp lên `View`/`TextInput` khác loại.
- Màu thương hiệu thanh toán (MoMo `#A50064`, ZaloPay `#0068FF`) chỉ dùng cho logo/điểm nhấn/nút thanh toán của màn đó.

## Lưu ý / bẫy
- Firestore rules (`firestore.rules`) dựa vào `users/{uid}.isAdmin` (`isAdmin()`) và `role == "staff"` (`isManager()`): tài khoản admin chưa bật cờ này thì mọi thao tác admin bị chặn; chỉ admin sửa được `users`. Deploy: `npx firebase-tools deploy --only firestore:rules`.
- Kiểm tra trùng lịch chạy phía client (đọc `bookedSlots`); admin kiểm tra lại khi bấm Xác nhận. Đơn tạo trước khi có `bookedSlots` không chặn được trùng phía khách.
- Ảnh xe/GPLX/avatar lưu base64 trong Firestore (giới hạn 1 MB/doc).
- Màn Cài đặt chỉ lưu `preferences`; chưa màn nào áp dụng (vd chế độ tối). Phương thức thanh toán đã lưu (`profile/payment.tsx`, chỉ state) vẫn là dữ liệu mẫu. Thanh toán, OTP đều giả lập.
- `@react-native-community/datetimepicker` không chạy trên web → dùng `DateTimeRangePicker.web.tsx`.

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
