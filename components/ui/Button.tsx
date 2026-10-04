import { TouchableOpacity, Text, StyleSheet, type ViewStyle, type TextStyle } from "react-native"

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
  const getButtonStyle = () => {
    const baseStyle: ViewStyle[] = [styles.button, styles[size]]

    switch (variant) {
      case "primary":
        baseStyle.push({ backgroundColor: "#4169e1" })
        break
      case "secondary":
        baseStyle.push({
          backgroundColor: "#f8f9fa",
          borderWidth: 1,
          borderColor: "#e0e0e0",
        })
        break
      case "outline":
        baseStyle.push({
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: "#4169e1",
        })
        break
    }

    if (disabled) {
      baseStyle.push({ opacity: 0.6 })
    }

    return baseStyle
  }

  const getTextStyle = () => {
    const baseStyle: TextStyle[] = [styles.text, styles[`${size}Text`]]

    switch (variant) {
      case "primary":
        baseStyle.push({ color: "#ffffff" })
        break
      case "secondary":
        baseStyle.push({ color: "#333333" })
        break
      case "outline":
        baseStyle.push({ color: "#4169e1" })
        break
    }

    if (disabled) {
      baseStyle.push({ color: "#999999" })
    }

    return baseStyle
  }

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  // Sizes
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  // Variants
  primary: {
    backgroundColor: "#4169e1",
  },
  secondary: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#4169e1",
  },
  disabled: {
    opacity: 0.6,
  },
  // Text styles
  text: {
    fontWeight: "600",
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  primaryText: {
    color: "#ffffff",
  },
  secondaryText: {
    color: "#333333",
  },
  outlineText: {
    color: "#4169e1",
  },
  disabledText: {
    color: "#999999",
  },
})
