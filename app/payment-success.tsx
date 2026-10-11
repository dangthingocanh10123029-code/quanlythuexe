import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useBooking } from "../hooks/useBookings"
import { getBookingRange, toDate } from "../utils/booking"
import { PAYMENT_METHODS } from "../utils/constants"
import { formatCurrency, formatDate } from "../utils/helpers"
import type { BookingPayment } from "../types/booking"
import PaymentLogo from "../components/ui/PaymentLogo"
import { PrimaryButton } from "../components"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../utils/theme"

// payBooking lưu method = nhãn ngắn ("Thẻ ngân hàng" | "MoMo" | "ZaloPay") → logo tương ứng
const METHOD_LOGOS: Record<string, "credit-card" | "momo" | "zalopay"> = {
  [PAYMENT_METHODS.CARD.label]: "credit-card",
  [PAYMENT_METHODS.MOMO.short]: "momo",
  [PAYMENT_METHODS.ZALOPAY.short]: "zalopay",
}

export default function PaymentSuccessScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const { booking, loading } = useBooking(bookingId)
  const payment = booking?.payment as (BookingPayment & { lastFourDigits?: string }) | undefined
  const paidAt = toDate(payment?.paidAt)
  const pickupAt = booking ? getBookingRange(booking)?.start : null
  const logo = payment ? METHOD_LOGOS[payment.method] : undefined

  const renderRow = (label: string, value: string) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>{value}</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <Ionicons name="checkmark" size={40} color={THEME_COLORS.textInverse} />
          </View>
        </View>

        <Text style={styles.title}>Thanh toán thành công</Text>
        <Text style={styles.subtitle}>
          {booking
            ? `Chuyến ${booking.carName} đã được giữ chỗ. Hẹn gặp bạn khi nhận xe!`
            : "Cảm ơn bạn đã thanh toán. Chuyến đi đã được giữ chỗ."}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={THEME_COLORS.primary} style={styles.loader} />
        ) : payment ? (
          <>
            <Text style={styles.amountLabel}>Số tiền đã thanh toán</Text>
            <Text style={styles.amount}>{formatCurrency(payment.amount)}</Text>

            <View style={styles.receipt}>
              <View style={styles.methodRow}>
                {logo ? <PaymentLogo method={logo} size={36} /> : null}
                <View style={styles.methodInfo}>
                  <Text style={styles.rowLabel}>Phương thức</Text>
                  <Text style={styles.methodName}>
                    {payment.method}
                    {payment.lastFourDigits ? ` •••• ${payment.lastFourDigits}` : ""}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              {payment.transactionId ? renderRow("Mã giao dịch", payment.transactionId) : null}
              {paidAt ? renderRow("Thời gian", formatDate(paidAt, "datetime")) : null}
              {renderRow("Mã đơn", bookingId)}
              {pickupAt ? renderRow("Nhận xe", formatDate(pickupAt, "datetime")) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Xem chuyến đi"
          icon="arrow-forward"
          disabled={!bookingId}
          onPress={() => router.replace({ pathname: "/booking/[id]", params: { id: bookingId } })}
        />
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace("/(tabs)")}
          activeOpacity={PRESS_OPACITY}
        >
          <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACE.screen,
    paddingVertical: SPACE.section,
  },
  iconOuter: {
    width: 112,
    height: 112,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE["2xl"],
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.success,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...TYPOGRAPHY.h1,
    textAlign: "center",
    marginBottom: SPACE.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginBottom: SPACE.section,
  },
  loader: {
    marginTop: SPACE.lg,
  },
  amountLabel: {
    ...TYPOGRAPHY.overline,
    marginBottom: SPACE.xs,
  },
  amount: {
    ...TYPOGRAPHY.display,
    marginBottom: SPACE["2xl"],
  },
  receipt: {
    ...UI.card,
    alignSelf: "stretch",
    padding: SPACE.lg,
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    ...TYPOGRAPHY.bodyStrong,
    marginTop: 2,
  },
  divider: {
    ...UI.divider,
    marginVertical: SPACE.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACE.lg,
    paddingVertical: SPACE.xs,
  },
  rowLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
  },
  rowValue: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
    textAlign: "right",
    flexShrink: 1,
  },
  footer: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.md,
    gap: SPACE.sm,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
  },
  secondaryButton: {
    ...UI.secondaryButton,
  },
  secondaryButtonText: {
    ...UI.secondaryButtonText,
  },
})
