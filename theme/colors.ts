export const colors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  surfaceElevated: "#FFFFFF",
  border: "#E5E7EB",
  borderStrong: "#CBD5E1",

  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",

  primary: "#1054CF",
  primaryPressed: "#0D45AA",
  primarySoft: "#EEF4FF",
  primarySubtle: "#F6F9FF",
  accent: "#F5B800",

  success: "#15803D",
  successSoft: "#ECFDF3",
  warning: "#C2410C",
  warningSoft: "#FFF7ED",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",

  overlay: "rgba(15, 23, 42, 0.48)",
  momo: "#A50064",
  momoSoft: "#FDF2F8",
  zalopay: "#0068FF",
  zalopaySoft: "#EFF6FF",
} as const

export type ThemeColor = keyof typeof colors

