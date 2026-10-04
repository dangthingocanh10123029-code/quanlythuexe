import type { TextStyle, ViewStyle } from "react-native"

// Hệ thống thiết kế "Layered & Depth": nền trắng, viền siêu mỏng, bóng đa lớp, bo góc 12px cho điều khiển.
// Mọi màn hình nên dùng token ở đây thay vì hard-code màu/bóng.

export const THEME_COLORS = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F9FAFB", // nền rất nhạt cho vùng phụ (chip chưa chọn, ô thông tin)
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",

  textPrimary: "#0F172A", // tiêu đề, số liệu chính — tương phản cao
  textSecondary: "#475569", // nội dung thường
  textMuted: "#94A3B8", // chú thích, placeholder

  primary: "#1054CF",
  primaryPressed: "#0D45AA",
  primarySoft: "#EEF4FF", // nền nhạt cho trạng thái chọn / focus
  accent: "#FFB700",

  success: "#16A34A",
  successSoft: "#ECFDF3",
  warning: "#D97706",
  warningSoft: "#FFFAEB",
  danger: "#DC2626",
  dangerSoft: "#FEF3F2",
}

export const RADIUS = {
  control: 12, // ô nhập, bộ lọc, nút, chip
  card: 16,
  sheet: 24,
  pill: 999,
}

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  screen: 20, // lề ngang của màn hình
  section: 32, // khoảng cách giữa các khu vực chức năng
}

// Bóng đa lớp (boxShadow nhiều lớp — RN 0.79 New Architecture hỗ trợ trên iOS, Android, web)
export const SHADOWS = {
  // thẻ nội dung thông thường
  card: {
    boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.04), 0px 4px 8px rgba(16, 24, 40, 0.04), 0px 12px 24px rgba(16, 24, 40, 0.04)",
  } as ViewStyle,
  // thẻ nổi bật / modal / bottom sheet
  raised: {
    boxShadow: "0px 2px 4px rgba(16, 24, 40, 0.05), 0px 8px 16px rgba(16, 24, 40, 0.06), 0px 24px 48px rgba(16, 24, 40, 0.08)",
  } as ViewStyle,
  // nút Primary: độ nâng nhẹ, ánh màu primary
  primaryButton: {
    boxShadow: "0px 1px 2px rgba(16, 84, 207, 0.20), 0px 4px 12px rgba(16, 84, 207, 0.22)",
  } as ViewStyle,
  // thanh tab nổi
  tabBar: {
    boxShadow: "0px 2px 6px rgba(16, 24, 40, 0.06), 0px 12px 32px rgba(16, 24, 40, 0.10)",
  } as ViewStyle,
}

export const TYPOGRAPHY = {
  display: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6, color: THEME_COLORS.textPrimary } as TextStyle,
  h1: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5, color: THEME_COLORS.textPrimary } as TextStyle,
  h2: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3, color: THEME_COLORS.textPrimary } as TextStyle,
  h3: { fontSize: 17, fontWeight: "600", letterSpacing: -0.2, color: THEME_COLORS.textPrimary } as TextStyle,
  body: { fontSize: 15, fontWeight: "400", letterSpacing: 0, color: THEME_COLORS.textSecondary, lineHeight: 22 } as TextStyle,
  bodyStrong: { fontSize: 15, fontWeight: "600", letterSpacing: 0, color: THEME_COLORS.textPrimary } as TextStyle,
  caption: { fontSize: 13, fontWeight: "500", letterSpacing: 0.1, color: THEME_COLORS.textMuted } as TextStyle,
  overline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: THEME_COLORS.textMuted,
  } as TextStyle,
  price: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2, color: THEME_COLORS.primary } as TextStyle,
}

// Khối style dùng lại
export const UI = {
  screen: {
    flex: 1,
    backgroundColor: THEME_COLORS.background,
  } as ViewStyle,

  card: {
    backgroundColor: THEME_COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    ...SHADOWS.card,
  } as ViewStyle,

  input: {
    height: 48,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
    paddingHorizontal: SPACE.lg,
    fontSize: 15,
    color: THEME_COLORS.textPrimary,
  } as TextStyle,

  // áp thêm khi ô nhập đang focus
  inputFocused: {
    borderColor: THEME_COLORS.primary,
    boxShadow: "0px 0px 0px 3px rgba(16, 84, 207, 0.12)",
  } as ViewStyle,

  chip: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
  } as ViewStyle,

  chipActive: {
    borderColor: THEME_COLORS.primary,
    backgroundColor: THEME_COLORS.primarySoft,
  } as ViewStyle,

  chipText: { fontSize: 14, fontWeight: "500", color: THEME_COLORS.textSecondary } as TextStyle,
  chipTextActive: { color: THEME_COLORS.primary, fontWeight: "600" } as TextStyle,

  primaryButton: {
    height: 52,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACE["2xl"],
    ...SHADOWS.primaryButton,
  } as ViewStyle,

  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 } as TextStyle,

  // nút phụ: phẳng, không nâng — để phân cấp rõ với Primary
  secondaryButton: {
    height: 52,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surface,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACE["2xl"],
  } as ViewStyle,

  secondaryButtonText: { color: THEME_COLORS.textPrimary, fontSize: 16, fontWeight: "600" } as TextStyle,

  divider: {
    height: 1,
    backgroundColor: THEME_COLORS.border,
  } as ViewStyle,
}

// activeOpacity thống nhất cho TouchableOpacity
export const PRESS_OPACITY = 0.85
