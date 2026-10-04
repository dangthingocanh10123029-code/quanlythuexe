import { View, Text, StyleSheet, type ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { PAYMENT_METHODS } from "../../utils/constants"

type PaymentMethodId = "credit-card" | "momo" | "zalopay"

interface PaymentLogoProps {
  method: PaymentMethodId
  size?: number
  style?: ViewStyle
}

// Logo dạng huy hiệu cho các phương thức thanh toán (không cần file ảnh)
export default function PaymentLogo({ method, size = 48, style }: PaymentLogoProps) {
  const radius = size * 0.25

  if (method === "credit-card") {
    return (
      <View
        style={[
          styles.badge,
          { width: size, height: size, borderRadius: radius, backgroundColor: PAYMENT_METHODS.CARD.color },
          style,
        ]}
      >
        <Ionicons name="card" size={size * 0.55} color="#fff" />
      </View>
    )
  }

  if (method === "momo") {
    return (
      <View
        style={[
          styles.badge,
          { width: size, height: size, borderRadius: radius, backgroundColor: PAYMENT_METHODS.MOMO.color },
          style,
        ]}
      >
        <Text style={[styles.momoText, { fontSize: size * 0.28 }]}>mo</Text>
        <Text style={[styles.momoText, { fontSize: size * 0.28, marginTop: -size * 0.08 }]}>mo</Text>
      </View>
    )
  }

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: radius, backgroundColor: PAYMENT_METHODS.ZALOPAY.color },
        style,
      ]}
    >
      <Text style={[styles.zaloText, { fontSize: size * 0.22 }]}>Zalo</Text>
      <Text style={[styles.payText, { fontSize: size * 0.2 }]}>Pay</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  momoText: {
    color: "#fff",
    fontWeight: "800",
  },
  zaloText: {
    color: "#fff",
    fontWeight: "800",
  },
  payText: {
    color: "#00D26A",
    fontWeight: "800",
  },
})
