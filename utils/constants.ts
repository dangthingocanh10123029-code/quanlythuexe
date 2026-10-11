export const COLORS = {

  success: "#00bb02",
  error: "#ff4444",
  warning: "#ffa500",
  info: "#17a2b8",
  light: "#f8f9fa",
  dark: "#343a40",


  background: "#ededed",
  primary: "#1054CF",
  secondary: "#FFB700",
  white: "#ffffff",
  black: "#000000",

  lightGray: "#e0e0e0",
  gray: {
    100: "#f8f9fa",
    200: "#e9ecef",
    300: "#dee2e6",
    400: "#ced4da",
    500: "#adb5bd",
    600: "#6c757d",
    700: "#495057",
    800: "#343a40",
    900: "#212529",
  },
}

export const FONTS = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  weights: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
}

export const BORDER_RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  full: 9999,
}

// ===== Bản địa hoá Việt Nam =====

export const CITIES = ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng"]

// Điểm nhận xe hiển thị ở màn đặt xe
export const PICKUP_LOCATIONS = [
  "Sân bay Tân Sơn Nhất, TP. Hồ Chí Minh",
  "Chợ Bến Thành, Quận 1, TP. Hồ Chí Minh",
  "Landmark 81, Bình Thạnh, TP. Hồ Chí Minh",
  "Ga Sài Gòn, Quận 3, TP. Hồ Chí Minh",
  "Sân bay Nội Bài, Hà Nội",
  "Hồ Hoàn Kiếm, Hà Nội",
  "Ga Hà Nội, Đống Đa, Hà Nội",
  "Sân bay Đà Nẵng",
  "Cầu Rồng, Sơn Trà, Đà Nẵng",
  "Bãi biển Mỹ Khê, Đà Nẵng",
]

// Thuế GTGT (VAT) áp dụng cho đơn thuê xe
export const VAT_RATE = 0.1

// Phương thức thanh toán. `id` cũng là tên route của màn thanh toán (/credit-card, /momo, /zalopay)
export const PAYMENT_METHODS = {
  CARD: { id: "credit-card", label: "Thẻ ngân hàng", short: "Thẻ", color: "#1054CF" },
  MOMO: { id: "momo", label: "Ví MoMo", short: "MoMo", color: "#A50064" },
  ZALOPAY: { id: "zalopay", label: "ZaloPay", short: "ZaloPay", color: "#0068FF" },
} as const

// Nhãn tiếng Việt cho trạng thái booking (docs/PLAN.md mục 4). Giá trị lưu trên Firestore giữ nguyên
// (tiếng Anh), chỉ đổi phần hiển thị. Tra cứu không phân biệt hoa thường qua getBookingStatusLabel.
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Chờ thanh toán",
  upcoming: "Sắp nhận xe",
  active: "Đang thuê",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
  canceled: "Đã huỷ",
  rejected: "Bị từ chối",
}

export const getBookingStatusLabel = (status?: string): string => {
  if (!status) return ""
  return BOOKING_STATUS_LABELS[status.toLowerCase()] ?? status
}

// Nhóm tab Chuyến đi theo trạng thái (chữ thường)
export const BOOKING_TABS = {
  upcoming: ["pending", "confirmed", "upcoming"],
  active: ["active"],
  history: ["completed", "cancelled", "canceled", "rejected"],
} as const

// Đơn còn giữ xe (chặn trùng lịch, chặn xoá xe)
export const OPEN_BOOKING_STATUSES = ["Pending", "Confirmed", "Upcoming", "Active"] as const

export const CAR_STATUS_LABELS: Record<string, string> = {
  Available: "Sẵn sàng",
  Rented: "Đang cho thuê",
  Maintenance: "Đang bảo dưỡng",
  Inactive: "Tạm ngừng",
}

// Xe ở trạng thái này không hiện khi tìm và không đặt được
export const HIDDEN_CAR_STATUSES = ["Maintenance", "Inactive"]

export const FUELS = ["Xăng", "Dầu diesel", "Điện", "Hybrid"] as const
export const TRANSMISSIONS = ["Số tự động", "Số sàn"] as const

export const AMENITIES = [
  "Bluetooth",
  "Camera lùi",
  "Camera 360",
  "Cảm biến va chạm",
  "Định vị GPS",
  "Apple CarPlay / Android Auto",
  "Cửa sổ trời",
  "Ghế da",
  "Cốp điện",
  "Kiểm soát hành trình",
]

// Mã giảm giá, áp trước VAT. firstBookingOnly: chỉ cho người chưa có đơn đã thanh toán;
// weekendOnly: chỉ khi ngày nhận xe là Thứ 7/Chủ nhật.
export const PROMO_CODES: Record<string, { percent: number; label: string; firstBookingOnly?: boolean; weekendOnly?: boolean }> = {
  FIRST20: { percent: 20, label: "Giảm 20% chuyến thuê đầu tiên", firstBookingOnly: true },
  WELCOME25: { percent: 25, label: "Giảm 25% quà chào mừng", firstBookingOnly: true },
  WEEKEND50: { percent: 50, label: "Giảm 50% thuê xe cuối tuần", weekendOnly: true },
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  paid: "Đã thanh toán",
  completed: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Đã hoàn tiền",
}

export const HOTLINE = "1900 6868"
export const SUPPORT_EMAIL = "hotro@rento.vn"
