import { Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { useBooking } from "../hooks/useBookings"
import { formatCurrency } from "../utils/helpers"
import { SPACE, TYPOGRAPHY, UI } from "../utils/theme"
import { PrimaryButton } from "../components"

// ponytail: màn tạm của L3.3 — U3.2 (Codex) làm giao diện hoàn chỉnh
export default function PaymentSuccessScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const { booking } = useBooking(bookingId)
  const payment = booking?.payment

  return (
    <SafeAreaView style={[UI.screen, { padding: SPACE.screen, justifyContent: "center", gap: SPACE.lg }]}>
      <Text style={TYPOGRAPHY.h1}>Thanh toán thành công</Text>
      {payment ? (
        <View style={{ gap: SPACE.sm }}>
          <Text style={TYPOGRAPHY.body}>Số tiền: {formatCurrency(payment.amount)}</Text>
          <Text style={TYPOGRAPHY.body}>Phương thức: {payment.method}</Text>
          <Text style={TYPOGRAPHY.body}>Mã giao dịch: {payment.transactionId}</Text>
        </View>
      ) : null}
      <PrimaryButton title="Xem chuyến đi" onPress={() => router.replace("/(tabs)/bookings")} />
    </SafeAreaView>
  )
}
