# RENTO — Ứng dụng thuê xe tự lái

RENTO là ứng dụng thuê xe trên di động, xây dựng bằng Expo Router và Firebase. Ứng dụng có màn hình chào mừng, đăng ký/đăng nhập, tìm và xem xe, đặt xe kèm dịch vụ thêm, thanh toán giả lập (Thẻ ngân hàng, MoMo, ZaloPay), hồ sơ cá nhân, xe yêu thích, thông báo và trang quản trị. Toàn bộ giao diện bằng tiếng Việt, giá tính bằng VND, địa điểm tại TP. Hồ Chí Minh, Hà Nội và Đà Nẵng.

![Giao diện RENTO](../assets/rento.png)

## Tính năng
- **Chào mừng & tài khoản**: carousel giới thiệu, đăng ký, đăng nhập, xác thực OTP.
- **Tìm xe**: xe nổi bật, tìm kiếm và lọc theo hãng, xem chi tiết xe và đánh giá.
- **Đặt xe**: chọn thời gian thuê, điểm nhận xe, dịch vụ thêm; tự tính thuế VAT 10%.
- **Thanh toán**: luồng giả lập Thẻ ngân hàng / MoMo / ZaloPay, cập nhật trạng thái đơn trên Firestore.
- **Xe yêu thích**: thả tim và xem lại xe đã lưu.
- **Tài khoản**: thông tin cá nhân, phương thức thanh toán, giấy phép lái xe, lịch sử thuê, cài đặt, trợ giúp.
- **Quản trị**: quản lý xe, đơn đặt xe, người dùng và báo cáo doanh thu.

## Công nghệ
- **Expo** + **React Native** + **Expo Router**
- **Firebase** (Authentication + Firestore)
- **TypeScript**
- Thư viện giao diện: **@expo/vector-icons**, **react-native-chart-kit**, **react-native-maps**, **react-native-reanimated**

## Các màn hình chính
- `/` – Màn hình chào mừng
- `/login`, `/register`, `/otp` – Đăng nhập, đăng ký, OTP
- `/(tabs)` – Trang chủ, Xe, Chuyến đi, Tài khoản
- `/car-details/[id]` – Chi tiết xe và đánh giá
- `/checkout` – Xác nhận đặt xe, dịch vụ thêm, chọn phương thức thanh toán
- `/credit-card`, `/momo`, `/zalopay` – Màn thanh toán
- `/likedcars`, `/notifications`, `/developers`, `/admin`
- `/profile/*` – Thông tin cá nhân, GPLX, thanh toán, lịch sử, cài đặt, hỗ trợ

## Cấu trúc thư mục
```
app/                 # Màn hình (Expo Router)
  (tabs)/            # Thanh tab dưới: Trang chủ, Xe, Chuyến đi, Tài khoản
  car-details/       # Route động chi tiết xe
  profile/           # Các trang con của tài khoản
components/          # Component giao diện
config/              # Cấu hình Firebase
data/                # Dữ liệu xe mẫu
hooks/               # Hook (auth, bookings, cars, notifications)
types/               # Kiểu TypeScript
utils/               # Hàm tiện ích, hằng số (định dạng VND, ngày, địa điểm…)
assets/              # Hình ảnh, logo
```

## Dữ liệu Firebase
- **users**: hồ sơ người dùng, cờ quản trị
- **cars**: xe do quản trị viên quản lý
- **bookings**: đơn đặt xe kèm thông tin thanh toán
- **reviews**: đánh giá xe
- **likedCars**: xe yêu thích

Cấu hình Firebase nằm ở `config/firebase.ts`.

## Cài đặt
1. Cài thư viện: `npm install`
2. Thay cấu hình Firebase trong `config/firebase.ts` bằng khoá của dự án Firebase của bạn.
3. Chạy ứng dụng: `npm run start`

### Chạy trên từng nền tảng
- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`

## Lệnh
- `start` – chạy Expo
- `android` – chạy và mở trình giả lập Android
- `ios` – chạy và mở trình giả lập iOS
- `web` – chạy bản web
- `test` – chạy Jest

## Ghi chú
- Trang quản trị được bảo vệ bằng mật khẩu đơn giản ở màn đăng nhập (mặc định: `ADMIN123`).
- Các màn thanh toán chỉ là giả lập, ghi thông tin thanh toán vào Firestore.
- Một số nội dung là dữ liệu mẫu (danh sách xe, thông báo).

## Giấy phép
MIT
