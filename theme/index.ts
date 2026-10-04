import type { TextStyle, ViewStyle } from "react-native"
import { colors } from "./colors"
import { layout, radius, spacing } from "./spacing"
import { shadows } from "./shadows"
import { typography } from "./typography"

export { colors, layout, radius, shadows, spacing, typography }

// Tên export cũ được giữ lại để các màn hiện tại nhận design system mới
// mà không phải thay đổi logic hay import hàng loạt.
export const THEME_COLORS = colors
export const SPACE = spacing
export const RADIUS = radius
export const SHADOWS = shadows
export const TYPOGRAPHY = typography

export const UI = {
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  } as ViewStyle,
  input: {
    height: layout.controlHeight,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.textPrimary,
  } as TextStyle,
  inputFocused: {
    borderColor: colors.primary,
    boxShadow: "0px 0px 0px 3px rgba(16, 84, 207, 0.12)",
  } as ViewStyle,
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  } as ViewStyle,
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  } as TextStyle,
  chipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  } as TextStyle,
  primaryButton: {
    height: layout.buttonHeight,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    ...shadows.primaryButton,
  } as ViewStyle,
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: 0.1,
  } as TextStyle,
  secondaryButton: {
    height: layout.buttonHeight,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  } as ViewStyle,
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  } as TextStyle,
  divider: {
    height: 1,
    backgroundColor: colors.border,
  } as ViewStyle,
} as const

export const PRESS_OPACITY = 0.84
