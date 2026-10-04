import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { PRESS_OPACITY, SPACE, THEME_COLORS, UI } from "../utils/theme"

type PrimaryButtonProps = {
  title: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  icon?: keyof typeof Ionicons.glyphMap
  iconPosition?: "left" | "right"
  style?: ViewStyle
}

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconPosition = "right",
  style,
}: PrimaryButtonProps) {
  const iconNode = icon ? <Ionicons name={icon} size={19} color={THEME_COLORS.textInverse} /> : null

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[styles.button, (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={PRESS_OPACITY}
    >
      {loading ? (
        <ActivityIndicator color={THEME_COLORS.textInverse} />
      ) : (
        <View style={styles.content}>
          {iconPosition === "left" ? iconNode : null}
          <Text style={styles.label}>{title}</Text>
          {iconPosition === "right" ? iconNode : null}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    ...UI.primaryButton,
  },
  disabled: {
    opacity: 0.55,
    boxShadow: "none",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.sm,
  },
  label: {
    ...UI.primaryButtonText,
    textAlign: "center",
  },
})

