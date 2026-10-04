import { TouchableOpacity, Text, StyleSheet, type ViewStyle, type TextStyle } from "react-native"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, UI } from "../../utils/theme"

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: "primary" | "secondary" | "outline"
  size?: "small" | "medium" | "large"
  disabled?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const buttonStyle = [
    variant === "primary" ? styles.primary : variant === "outline" ? styles.outline : styles.secondary,
    styles[size],
    disabled && styles.disabled,
  ]

  const labelStyle = [
    variant === "primary" ? styles.primaryText : variant === "outline" ? styles.outlineText : styles.secondaryText,
    styles[`${size}Text`],
    disabled && variant !== "primary" && styles.disabledText,
  ]

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={PRESS_OPACITY}
    >
      <Text style={[labelStyle, textStyle]}>{title}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  // Variants
  primary: {
    ...UI.primaryButton,
  },
  secondary: {
    ...UI.secondaryButton,
  },
  outline: {
    ...UI.secondaryButton,
    borderColor: THEME_COLORS.primary,
  },
  disabled: {
    opacity: 0.5,
    boxShadow: "none",
  },
  // Sizes (bo góc giữ 12 cho mọi cỡ)
  small: {
    height: 40,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.control,
  },
  medium: {
    height: 48,
    paddingHorizontal: SPACE.xl,
    borderRadius: RADIUS.control,
  },
  large: {
    height: 52,
    paddingHorizontal: SPACE["2xl"],
    borderRadius: RADIUS.control,
  },
  // Text styles
  primaryText: {
    ...UI.primaryButtonText,
  },
  secondaryText: {
    ...UI.secondaryButtonText,
  },
  outlineText: {
    ...UI.secondaryButtonText,
    color: THEME_COLORS.primary,
  },
  disabledText: {
    color: THEME_COLORS.textMuted,
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 15,
  },
  largeText: {
    fontSize: 16,
  },
})
