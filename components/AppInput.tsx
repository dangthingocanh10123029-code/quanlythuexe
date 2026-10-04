import { useState } from "react"
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { PRESS_OPACITY, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../utils/theme"

type AppInputProps = TextInputProps & {
  label?: string
  error?: string
  helperText?: string
  icon?: keyof typeof Ionicons.glyphMap
  rightIcon?: keyof typeof Ionicons.glyphMap
  onRightIconPress?: () => void
  containerStyle?: ViewStyle
}

export default function AppInput({
  label,
  error,
  helperText,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  onFocus,
  onBlur,
  style,
  ...props
}: AppInputProps) {
  const [focused, setFocused] = useState(false)
  const iconColor = error ? THEME_COLORS.danger : focused ? THEME_COLORS.primary : THEME_COLORS.textMuted

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputShell, focused && styles.focused, !!error && styles.errorShell]}>
        {icon ? <Ionicons name={icon} size={20} color={iconColor} /> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={THEME_COLORS.textMuted}
          selectionColor={THEME_COLORS.primary}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          {...props}
        />
        {rightIcon ? (
          <TouchableOpacity
            accessibilityRole={onRightIconPress ? "button" : undefined}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            activeOpacity={PRESS_OPACITY}
            hitSlop={8}
          >
            <Ionicons name={rightIcon} size={20} color={iconColor} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: SPACE.sm,
  },
  label: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
  },
  inputShell: {
    height: UI.input.height,
    borderRadius: UI.input.borderRadius,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
    paddingHorizontal: SPACE.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  focused: {
    ...UI.inputFocused,
  },
  errorShell: {
    borderColor: THEME_COLORS.danger,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    fontSize: 15,
    color: THEME_COLORS.textPrimary,
  },
  error: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.danger,
  },
  helper: {
    ...TYPOGRAPHY.caption,
  },
})

