import type { ViewStyle } from "react-native"

export const shadows = {
  card: {
    boxShadow:
      "0px 1px 2px rgba(15, 23, 42, 0.035), 0px 6px 16px rgba(15, 23, 42, 0.045), 0px 18px 40px rgba(15, 23, 42, 0.04)",
  } as ViewStyle,
  raised: {
    boxShadow:
      "0px 2px 4px rgba(15, 23, 42, 0.05), 0px 12px 28px rgba(15, 23, 42, 0.10), 0px 30px 64px rgba(15, 23, 42, 0.10)",
  } as ViewStyle,
  primaryButton: {
    boxShadow: "0px 2px 4px rgba(16, 84, 207, 0.16), 0px 8px 20px rgba(16, 84, 207, 0.22)",
  } as ViewStyle,
  tabBar: {
    boxShadow: "0px 2px 8px rgba(15, 23, 42, 0.06), 0px 16px 40px rgba(15, 23, 42, 0.12)",
  } as ViewStyle,
} as const

