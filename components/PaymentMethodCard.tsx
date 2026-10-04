import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import PaymentLogo from "./ui/PaymentLogo"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY } from "../utils/theme"

type PaymentMethod = "credit-card" | "momo" | "zalopay"

type PaymentMethodCardProps = {
  method: PaymentMethod
  title: string
  subtitle: string
  selected?: boolean
  onPress: () => void
  style?: ViewStyle
}

export default function PaymentMethodCard({ method, title, subtitle, selected = false, onPress, style }: PaymentMethodCardProps) {
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.card, selected && styles.cardSelected, style]}
      onPress={onPress}
      activeOpacity={PRESS_OPACITY}
    >
      <PaymentLogo method={method} size={42} />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <Ionicons name="checkmark" size={14} color={THEME_COLORS.textInverse} /> : null}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surface,
  },
  cardSelected: {
    borderColor: THEME_COLORS.primary,
    backgroundColor: THEME_COLORS.primarySubtle,
    boxShadow: "0px 0px 0px 3px rgba(16, 84, 207, 0.08)",
  },
  copy: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.bodyStrong,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 1,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: THEME_COLORS.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: THEME_COLORS.primary,
    backgroundColor: THEME_COLORS.primary,
  },
})

