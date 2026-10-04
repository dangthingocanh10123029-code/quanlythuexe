import { useState } from "react"
import { View, TextInput, Text, StyleSheet, type TextInputProps, type TextStyle } from "react-native"
import { SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../../utils/theme"

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  helperText?: string
}

export default function Input({ label, error, helperText, style, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, focused && styles.inputFocused, !!error && styles.errorInput, style]}
        placeholderTextColor={THEME_COLORS.textMuted}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACE.lg,
  },
  label: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
    marginBottom: SPACE.sm,
  },
  input: {
    ...UI.input,
  },
  inputFocused: {
    ...(UI.inputFocused as TextStyle),
  },
  errorInput: {
    borderColor: THEME_COLORS.danger,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.danger,
    marginTop: SPACE.xs,
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACE.xs,
  },
})
