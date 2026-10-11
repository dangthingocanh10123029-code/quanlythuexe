import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY } from "../utils/theme"

// Trạng thái thất bại ở màn thanh toán (thẻ / MoMo / ZaloPay); nút "Thử lại" là nút thanh toán chính bên dưới
export default function PaymentErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={22} color={THEME_COLORS.danger} />
      <View style={styles.body}>
        <Text style={styles.title}>Thanh toán không thành công</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE.md,
    padding: SPACE.md,
    marginBottom: SPACE.md,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.dangerSoft,
  },
  body: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.danger,
  },
  message: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
})
