import type { TextStyle } from "react-native"
import { colors } from "./colors"

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.textPrimary,
  } as TextStyle,
  h1: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: colors.textPrimary,
  } as TextStyle,
  h2: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "700",
    letterSpacing: -0.35,
    color: colors.textPrimary,
  } as TextStyle,
  h3: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: colors.textPrimary,
  } as TextStyle,
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
    color: colors.textSecondary,
  } as TextStyle,
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: colors.textPrimary,
  } as TextStyle,
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0.05,
    color: colors.textMuted,
  } as TextStyle,
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: colors.textMuted,
  } as TextStyle,
  price: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.primary,
  } as TextStyle,
} as const

