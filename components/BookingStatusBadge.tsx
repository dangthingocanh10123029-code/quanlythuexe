import { StyleSheet, Text, View, type ViewStyle } from "react-native"
import { getBookingStatusLabel } from "../utils/constants"
import { RADIUS, THEME_COLORS } from "../utils/theme"

// Tông màu badge trạng thái đơn (nền soft + chữ cùng tông), so sánh không phân biệt hoa thường
export const getBookingStatusTone = (status?: string): { bg: string; fg: string } => {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return { bg: THEME_COLORS.warningSoft, fg: THEME_COLORS.warning }
    case "confirmed":
    case "upcoming":
      return { bg: THEME_COLORS.primarySoft, fg: THEME_COLORS.primary }
    case "active":
    case "completed":
      return { bg: THEME_COLORS.successSoft, fg: THEME_COLORS.success }
    case "cancelled":
    case "canceled":
    case "rejected":
      return { bg: THEME_COLORS.dangerSoft, fg: THEME_COLORS.danger }
    default:
      return { bg: THEME_COLORS.surfaceMuted, fg: THEME_COLORS.textSecondary }
  }
}

export default function BookingStatusBadge({ status, style }: { status?: string; style?: ViewStyle }) {
  const tone = getBookingStatusTone(status)
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }, style]}>
      <Text style={[styles.text, { color: tone.fg }]} numberOfLines={1}>
        {getBookingStatusLabel(status)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
})
