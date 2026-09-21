# quanlythuexe
# 🚗 ỨNG DỤNG THUÊ XE TỰ LÁI

## 1. Giới thiệu đề tài

**Ứng dụng thuê xe tự lái** là một hệ thống được xây dựng trên nền tảng mobile, hỗ trợ khách hàng tìm kiếm, xem thông tin, đặt thuê và thanh toán dịch vụ thuê xe tự lái.

Hệ thống giúp kết nối **khách hàng** với **chủ xe/cửa hàng cho thuê xe**, đồng thời hỗ trợ quản lý xe, đơn thuê, thanh toán và đánh giá.

### Mục tiêu

* Hỗ trợ khách hàng tìm kiếm xe nhanh chóng.
* Cho phép xem thông tin chi tiết của xe.
* Cho phép đặt xe theo thời gian mong muốn.
* Hỗ trợ thanh toán trực tuyến.
* Quản lý quá trình nhận và trả xe.
* Quản lý xe và đơn thuê.
* Hỗ trợ đánh giá chất lượng xe và dịch vụ.
* Hỗ trợ quản trị viên quản lý toàn bộ hệ thống.

---

# 2. Đối tượng sử dụng

Hệ thống gồm 3 nhóm người dùng chính:

### 👤 Khách hàng

Khách hàng sử dụng ứng dụng để:

* Đăng ký tài khoản.
* Đăng nhập.
* Quản lý thông tin cá nhân.
* Tìm kiếm xe.
* Xem thông tin xe.
* Kiểm tra xe còn trống.
* Đặt xe.
* Thanh toán.
* Theo dõi đơn thuê.
* Hủy đơn thuê.
* Nhận và trả xe.
* Đánh giá xe và dịch vụ.

### 🚘 Chủ xe / Nhân viên cửa hàng

Chủ xe hoặc nhân viên có thể:

* Đăng nhập.
* Thêm xe.
* Cập nhật thông tin xe.
* Xóa xe.
* Cập nhật trạng thái xe.
* Xem danh sách đơn thuê.
* Xác nhận đơn thuê.
* Từ chối đơn thuê.
* Xác nhận giao xe.
* Xác nhận nhận lại xe.
* Theo dõi doanh thu.

### 👨‍💼 Quản trị viên

Quản trị viên có quyền:

* Quản lý tài khoản.
* Quản lý khách hàng.
* Quản lý chủ xe.
* Quản lý xe.
* Quản lý loại xe.
* Quản lý đơn thuê.
* Quản lý thanh toán.
* Quản lý đánh giá.
* Xem thống kê và báo cáo.

---

# 3. Quy trình nghiệp vụ tổng quát

Quy trình chính của hệ thống:

```text
Đăng ký / Đăng nhập
        ↓
    Tìm kiếm xe
        ↓
    Xem chi tiết xe
        ↓
 Chọn thời gian thuê
        ↓
      Đặt xe
        ↓
Chủ xe xác nhận đơn
        ↓
     Thanh toán
        ↓
      Nhận xe
        ↓
     Thuê xe
        ↓
      Trả xe
        ↓
    Kiểm tra xe
        ↓
     Hoàn tất đơn
        ↓
      Đánh giá
```

---

# 4. Nghiệp vụ đăng ký tài khoản

## Mô tả

Khách hàng cần đăng ký tài khoản để sử dụng các chức năng đặt và thuê xe.

## Thông tin đăng ký

* Họ và tên
* Số điện thoại
* Email
* Mật khẩu
* Địa chỉ
* CCCD

## Quy trình

```text
Người dùng chọn Đăng ký
        ↓
Nhập thông tin
        ↓
Kiểm tra dữ liệu
        ↓
Kiểm tra email / SĐT
        ↓
    ┌───┴───┐
    ↓       ↓
 Hợp lệ   Không hợp lệ
    ↓       ↓
Tạo TK    Báo lỗi
```

---

# 5. Nghiệp vụ đăng nhập

Người dùng nhập:

* Email hoặc số điện thoại.
* Mật khẩu.

Hệ thống kiểm tra thông tin đăng nhập.

```text
Nhập tài khoản
      ↓
Nhập mật khẩu
      ↓
Kiểm tra
   ↓       ↓
 Đúng     Sai
   ↓       ↓
Đăng nhập  Báo lỗi
```

Sau khi đăng nhập thành công, hệ thống cấp token và chuyển người dùng đến trang chủ.

---

# 6. Nghiệp vụ tìm kiếm xe

Khách hàng có thể tìm kiếm xe dựa trên:

* Địa điểm nhận xe.
* Ngày nhận xe.
* Ngày trả xe.
* Loại xe.
* Hãng xe.
* Số chỗ.
* Hộp số.
* Nhiên liệu.
* Khoảng giá.

### Ví dụ

Khách hàng muốn thuê xe:

```text
Địa điểm: Hà Nội
Ngày nhận: 25/09/2026
Ngày trả: 27/09/2026
Loại xe: 5 chỗ
```

Hệ thống kiểm tra các xe còn trống trong khoảng thời gian trên và trả về danh sách xe phù hợp.

---

# 7. Nghiệp vụ xem chi tiết xe

Khách hàng có thể xem:

* Hình ảnh xe.
* Tên xe.
* Hãng xe.
* Đời xe.
* Số chỗ.
* Hộp số.
* Nhiên liệu.
* Giá thuê.
* Tiền đặt cọc.
* Địa điểm nhận xe.
* Mô tả.
* Tiện nghi.
* Đánh giá.

### Ví dụ

```text
Toyota Vios 2024

5 chỗ
Số tự động
Xăng

Giá thuê: 700.000đ/ngày
Tiền cọc: 3.000.000đ

Địa điểm: Hà Nội

[ ĐẶT XE ]
```

---

# 8. Nghiệp vụ đặt xe

Sau khi chọn xe, khách hàng tiến hành đặt xe.

## Thông tin đơn thuê

* Mã đơn thuê.
* Khách hàng.
* Xe.
* Ngày nhận.
* Giờ nhận.
* Ngày trả.
* Giờ trả.
* Địa điểm nhận.
* Địa điểm trả.
* Số ngày thuê.
* Giá thuê.
* Tiền cọc.
* Phí phát sinh.
* Tổng tiền.
* Phương thức thanh toán.
* Trạng thái đơn.

## Quy trình

```text
Chọn xe
   ↓
Chọn ngày nhận / trả
   ↓
Kiểm tra xe còn trống
   ↓
Nhập thông tin
   ↓
Xác nhận đặt xe
   ↓
Tạo đơn thuê
   ↓
Chờ chủ xe xác nhận
```

---

# 9. Nghiệp vụ xác nhận đơn thuê

Sau khi khách hàng tạo đơn, chủ xe nhận được yêu cầu thuê.

Chủ xe kiểm tra:

* Thông tin khách hàng.
* Thông tin xe.
* Thời gian thuê.
* Địa điểm nhận và trả xe.

Chủ xe có thể:

```text
             Đơn thuê
                ↓
        Chủ xe kiểm tra
           ↙       ↘
      Xác nhận     Từ chối
         ↓            ↓
  Đã xác nhận     Đã từ chối
```

---

# 10. Nghiệp vụ thanh toán

Khách hàng có thể thanh toán bằng:

* Chuyển khoản.
* Ví điện tử.
* Thanh toán trực tuyến.
* Thanh toán khi nhận xe.

## Thông tin thanh toán

```text
Tiền thuê
Tiền đặt cọc
Phí phát sinh
----------------
Tổng tiền
```

### Trạng thái thanh toán

* `PENDING` - Chờ thanh toán
* `PAID` - Đã thanh toán
* `FAILED` - Thanh toán thất bại
* `REFUNDED` - Đã hoàn tiền

---

# 11. Nghiệp vụ nhận xe

Đến thời gian nhận xe:

1. Khách hàng đến địa điểm nhận xe.
2. Nhân viên kiểm tra đơn thuê.
3. Kiểm tra giấy tờ khách hàng.
4. Kiểm tra tiền cọc.
5. Kiểm tra tình trạng xe.
6. Hai bên xác nhận bàn giao.
7. Cập nhật trạng thái xe.
8. Cập nhật trạng thái đơn thuê.

### Trạng thái

```text
Xe:
Sẵn sàng
   ↓
Đã đặt
   ↓
Đang cho thuê
```

```text
Đơn thuê:
Đã thanh toán
      ↓
Đang thuê
```

---

# 12. Nghiệp vụ trả xe

Khi kết thúc thời gian thuê:

1. Khách hàng trả xe.
2. Nhân viên kiểm tra xe.
3. Kiểm tra nhiên liệu.
4. Kiểm tra số km.
5. Kiểm tra tình trạng xe.
6. Kiểm tra phí phát sinh.
7. Hoàn tiền cọc nếu đủ điều kiện.
8. Hoàn tất đơn thuê.

```text
Đang thuê
    ↓
Khách trả xe
    ↓
Kiểm tra xe
    ↓
Có phát sinh?
   ↙       ↘
 Có        Không
 ↓           ↓
Tính phí    Hoàn cọc
   ↘       ↙
    Hoàn tất
```

---

# 13. Nghiệp vụ hủy đơn

Khách hàng có thể yêu cầu hủy đơn tùy theo trạng thái đơn và chính sách của hệ thống.

```text
Khách hàng chọn Hủy đơn
          ↓
Kiểm tra trạng thái
          ↓
Có thể hủy?
      ↙       ↘
    Có         Không
    ↓            ↓
Hủy đơn       Báo lỗi
    ↓
Kiểm tra thanh toán
    ↓
Hoàn tiền nếu đủ điều kiện
```

---

# 14. Nghiệp vụ đánh giá

Sau khi hoàn tất đơn thuê, khách hàng có thể đánh giá xe.

Thông tin đánh giá:

* Số sao.
* Nội dung nhận xét.
* Thời gian đánh giá.

Ví dụ:

```text
Toyota Vios 2024

★★★★★

Xe sạch, chạy tốt.
Dịch vụ hỗ trợ nhanh.

[ GỬI ĐÁNH GIÁ ]
```

---

# 15. Nghiệp vụ quản lý xe

Chủ xe có thể:

### Thêm xe

Thông tin:

* Tên xe.
* Hãng xe.
* Biển số.
* Năm sản xuất.
* Số chỗ.
* Hộp số.
* Nhiên liệu.
* Giá thuê.
* Tiền cọc.
* Hình ảnh.
* Mô tả.

### Cập nhật xe

Cho phép thay đổi thông tin xe.

### Xóa xe

Chỉ cho phép xóa xe khi xe không có đơn thuê đang hoạt động.

### Cập nhật trạng thái

```text
AVAILABLE       - Sẵn sàng
BOOKED          - Đã đặt
RENTED          - Đang cho thuê
MAINTENANCE     - Đang bảo dưỡng
INACTIVE        - Tạm ngừng
```

---

# 16. Nghiệp vụ quản lý đơn thuê

Chủ xe và quản trị viên có thể xem danh sách đơn.

| Mã đơn | Khách hàng   | Xe          | Ngày thuê  |  Tổng tiền | Trạng thái   |
| ------ | ------------ | ----------- | ---------- | ---------: | ------------ |
| DH001  | Nguyễn Văn A | Toyota Vios | 25/09/2026 | 1.400.000đ | Đã xác nhận  |
| DH002  | Trần Văn B   | Mazda 3     | 26/09/2026 | 1.800.000đ | Chờ xác nhận |

## Trạng thái đơn

```text
PENDING
   ↓
CONFIRMED
   ↓
PAID
   ↓
RENTING
   ↓
RETURNED
   ↓
COMPLETED
```

Các trường hợp khác:

```text
PENDING → REJECTED
PENDING → CANCELLED
CONFIRMED → CANCELLED
```

---

# 17. Nghiệp vụ quản lý khách hàng

Quản trị viên có thể:

* Xem danh sách khách hàng.
* Tìm kiếm khách hàng.
* Xem thông tin khách hàng.
* Khóa tài khoản.
* Mở khóa tài khoản.
* Xem lịch sử thuê xe.

Thông tin khách hàng:

```text
Mã khách hàng
Họ tên
Số điện thoại
Email
Địa chỉ
CCCD
Ngày đăng ký
Trạng thái
```

---

# 18. Nghiệp vụ quản lý thanh toán

Hệ thống lưu trữ:

* Mã thanh toán.
* Mã đơn thuê.
* Số tiền.
* Phương thức thanh toán.
* Thời gian thanh toán.
* Trạng thái thanh toán.

---

# 19. Nghiệp vụ thông báo

Hệ thống gửi thông báo cho người dùng khi có sự kiện quan trọng.

Ví dụ:

* Đặt xe thành công.
* Chủ xe xác nhận đơn.
* Chủ xe từ chối đơn.
* Thanh toán thành công.
* Thanh toán thất bại.
* Sắp đến thời gian nhận xe.
* Đơn thuê hoàn tất.

---

# 20. Hệ thống API

## 20.1. API tài khoản

```http
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

GET    /api/users/me
PUT    /api/users/me
PUT    /api/users/change-password
```

## 20.2. API xe

```http
GET    /api/cars
GET    /api/cars/{id}
POST   /api/cars
PUT    /api/cars/{id}
DELETE /api/cars/{id}

GET    /api/cars/search
GET    /api/cars/available

PATCH  /api/cars/{id}/status
```

## 20.3. API loại xe

```http
GET    /api/car-types
GET    /api/car-types/{id}
POST   /api/car-types
PUT    /api/car-types/{id}
DELETE /api/car-types/{id}
```

## 20.4. API đơn thuê

```http
POST   /api/bookings
GET    /api/bookings
GET    /api/bookings/{id}
PUT    /api/bookings/{id}

PATCH  /api/bookings/{id}/cancel
PATCH  /api/bookings/{id}/confirm
PATCH  /api/bookings/{id}/reject
PATCH  /api/bookings/{id}/pickup
PATCH  /api/bookings/{id}/return
```

## 20.5. API thanh toán

```http
POST /api/payments
GET  /api/payments/{id}
GET  /api/payments/booking/{bookingId}
POST /api/payments/{id}/refund
```

## 20.6. API đánh giá

```http
POST   /api/reviews
GET    /api/cars/{carId}/reviews
PUT    /api/reviews/{id}
DELETE /api/reviews/{id}
```

## 20.7. API yêu thích

```http
POST   /api/favorites/{carId}
GET    /api/favorites
DELETE /api/favorites/{carId}
```

## 20.8. API thông báo

```http
GET   /api/notifications
PATCH /api/notifications/{id}/read
PATCH /api/notifications/read-all
```

---

# 21. Cấu trúc cơ sở dữ liệu dự kiến

Hệ thống có thể gồm các bảng:

```text
TaiKhoan
   │
   ├── KhachHang
   │
   └── ChuXe

LoaiXe
   │
   └── Xe
          │
          └── HinhAnhXe

KhachHang
   │
   └── DonThue
          │
          ├── Xe
          │
          └── ThanhToan

DonThue
   │
   └── DanhGia
```

## Danh sách bảng

```text
TaiKhoan
KhachHang
ChuXe
LoaiXe
Xe
HinhAnhXe
DonThue
ThanhToan
DanhGia
YeuThich
ThongBao
```

---

# 22. Các màn hình Mobile

## Khách hàng

```text
1. Splash Screen
2. Đăng nhập
3. Đăng ký
4. Trang chủ
5. Tìm kiếm xe
6. Danh sách xe
7. Chi tiết xe
8. Đặt xe
9. Xác nhận đơn
10. Thanh toán
11. Thanh toán thành công
12. Danh sách đơn thuê
13. Chi tiết đơn thuê
14. Thông báo
15. Đánh giá
16. Xe yêu thích
17. Hồ sơ cá nhân
18. Đổi mật khẩu
```

## Chủ xe

```text
1. Đăng nhập
2. Trang quản lý
3. Danh sách xe
4. Thêm xe
5. Sửa xe
6. Chi tiết xe
7. Danh sách đơn thuê
8. Chi tiết đơn
9. Xác nhận đơn
10. Xác nhận nhận xe
11. Xác nhận trả xe
12. Doanh thu
```

## Admin

```text
1. Đăng nhập
2. Dashboard
3. Quản lý tài khoản
4. Quản lý khách hàng
5. Quản lý chủ xe
6. Quản lý xe
7. Quản lý loại xe
8. Quản lý đơn thuê
9. Quản lý thanh toán
10. Quản lý đánh giá
11. Thống kê
```

---

# 23. Kiến trúc hệ thống

Mô hình đề xuất:

```text
┌──────────────────────────┐
│       MOBILE APP         │
│   Android / Flutter      │
└────────────┬─────────────┘
             │
             │ REST API / JSON
             ↓
┌──────────────────────────┐
│       BACKEND API        │
│       Spring Boot        │
└────────────┬─────────────┘
             │
             │ JDBC / JPA
             ↓
┌──────────────────────────┐
│        DATABASE          │
│        SQL Server        │
└──────────────────────────┘
```

---

# 24. Công nghệ dự kiến

## Mobile

Có thể sử dụng một trong các công nghệ:

* Android Studio + Java
* Android Studio + Kotlin
* Flutter + Dart

## Backend

* Java
* Spring Boot
* Spring Data JPA
* Spring Security
* JWT
* RESTful API

## Database

* SQL Server

## Công cụ hỗ trợ

* Android Studio
* IntelliJ IDEA
* SQL Server Management Studio
* Postman
* Git/GitHub

---

# 25. Phân quyền hệ thống

| Chức năng          | Khách hàng | Chủ xe |  Admin  |
| ------------------ | :--------: | :----: | :-----: |
| Đăng ký            |      ✅     | Có thể |    ❌    |
| Đăng nhập          |      ✅     |    ✅   |    ✅    |
| Xem xe             |      ✅     |    ✅   |    ✅    |
| Đặt xe             |      ✅     |    ❌   |    ❌    |
| Thanh toán         |      ✅     |    ❌   |   Xem   |
| Đánh giá           |      ✅     |    ❌   | Quản lý |
| Thêm xe            |      ❌     |    ✅   |    ✅    |
| Sửa xe             |      ❌     |    ✅   |    ✅    |
| Xác nhận đơn       |      ❌     |    ✅   |    ✅    |
| Quản lý khách hàng |      ❌     |    ❌   |    ✅    |
| Quản lý tài khoản  |      ❌     |    ❌   |    ✅    |
| Thống kê doanh thu |   Cá nhân  |    ✅   |    ✅    |

---

# 26. Trạng thái chính của hệ thống

## Trạng thái xe

```text
AVAILABLE  → Sẵn sàng
BOOKED     → Đã đặt
RENTED     → Đang cho thuê
MAINTENANCE → Bảo dưỡng
INACTIVE   → Tạm ngừng
```

## Trạng thái đơn thuê

```text
PENDING     → Chờ xác nhận
CONFIRMED   → Đã xác nhận
PAID        → Đã thanh toán
RENTING     → Đang thuê
RETURNED    → Đã trả xe
COMPLETED   → Hoàn tất
CANCELLED   → Đã hủy
REJECTED    → Bị từ chối
```

## Trạng thái thanh toán

```text
PENDING
PAID
FAILED
REFUNDED
```

---

# 27. Luồng nghiệp vụ chính

```text
                   KHÁCH HÀNG
                       │
                       ↓
                Đăng nhập hệ thống
                       │
                       ↓
                  Tìm kiếm xe
                       │
                       ↓
                 Chọn xe phù hợp
                       │
                       ↓
               Chọn ngày thuê/trả
                       │
                       ↓
                  Tạo đơn thuê
                       │
                       ↓
              CHỦ XE XÁC NHẬN
                 ↙           ↘
            Từ chối          Xác nhận
               ↓                ↓
           Hủy đơn          Thanh toán
                                │
                                ↓
                            Nhận xe
                                │
                                ↓
                            Thuê xe
                                │
                                ↓
                            Trả xe
                                │
                                ↓
                         Kiểm tra xe
                                │
                                ↓
                           Hoàn tất
                                │
                                ↓
                            Đánh giá
```

---

# 28. Kết quả đầu ra của hệ thống

Sau khi hoàn thành hệ thống, người dùng có thể:

* Đăng ký và đăng nhập.
* Tìm kiếm xe.
* Xem thông tin xe.
* Đặt xe.
* Thanh toán.
* Theo dõi đơn thuê.
* Hủy đơn.
* Nhận và trả xe.
* Đánh giá xe.
* Quản lý xe đối với chủ xe.
* Quản lý toàn bộ hệ thống đối với Admin.

---

# 29. Mục tiêu phát triển

### Giai đoạn 1

* Phân tích nghiệp vụ.
* Thiết kế Use Case.
* Thiết kế cơ sở dữ liệu.
* Thiết kế giao diện.

### Giai đoạn 2

* Xây dựng Backend API.
* Xây dựng database.
* Xây dựng chức năng đăng ký/đăng nhập.
* Xây dựng chức năng quản lý xe.

### Giai đoạn 3

* Xây dựng chức năng đặt xe.
* Xây dựng thanh toán.
* Xây dựng quản lý đơn thuê.
* Xây dựng nhận/trả xe.

### Giai đoạn 4

* Xây dựng đánh giá.
* Thông báo.
* Thống kê.
* Kiểm thử hệ thống.

---

# 30. Kết luận

Ứng dụng thuê xe tự lái cung cấp một quy trình khép kín từ **tìm kiếm xe → đặt xe → xác nhận → thanh toán → nhận xe → trả xe → đánh giá**.

Hệ thống được thiết kế theo mô hình **Mobile App – REST API – Database**, giúp tách biệt giao diện người dùng, xử lý nghiệp vụ và dữ liệu, thuận tiện cho việc phát triển, bảo trì và mở rộng trong tương lai.
