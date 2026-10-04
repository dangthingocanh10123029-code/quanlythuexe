import { useEffect, useRef, useState } from "react"
import { StyleSheet, TextInput, View, type TextStyle, type ViewStyle } from "react-native"
import { RADIUS, SPACE, THEME_COLORS, UI } from "../utils/theme"

type OTPInputProps = {
  value: string[]
  onChange: (value: string[]) => void
  length?: number
  autoFocus?: boolean
  style?: ViewStyle
}

export default function OTPInput({ value, onChange, length = 4, autoFocus = true, style }: OTPInputProps) {
  const refs = useRef<Array<TextInput | null>>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(autoFocus ? 0 : null)
  const digits = Array.from({ length }, (_, index) => value[index] ?? "")

  useEffect(() => {
    if (autoFocus && digits.every((digit) => !digit)) {
      const timer = setTimeout(() => refs.current[0]?.focus(), 0)
      return () => clearTimeout(timer)
    }
  }, [autoFocus, value.join("")])

  const update = (raw: string, index: number) => {
    const numeric = raw.replace(/\D/g, "")
    if (numeric.length > 1) {
      const next = [...digits]
      numeric.slice(0, length - index).split("").forEach((digit, offset) => {
        next[index + offset] = digit
      })
      onChange(next)
      refs.current[Math.min(index + numeric.length, length - 1)]?.focus()
      return
    }

    const next = [...digits]
    next[index] = numeric
    onChange(next)
    if (numeric && index < length - 1) refs.current[index + 1]?.focus()
  }

  return (
    <View style={[styles.row, style]}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(node) => { refs.current[index] = node }}
          style={[
            styles.input,
            !!digit && styles.filled,
            focusedIndex === index && styles.focused,
          ]}
          value={digit}
          onChangeText={(text) => update(text, index)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === "Backspace" && !digit && index > 0) refs.current[index - 1]?.focus()
          }}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex((current) => current === index ? null : current)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={1}
          selectTextOnFocus
          autoFocus={autoFocus && index === 0}
          selectionColor={THEME_COLORS.primary}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACE.md,
  },
  input: {
    width: 58,
    height: 60,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: RADIUS.input,
    backgroundColor: THEME_COLORS.surface,
    color: THEME_COLORS.textPrimary,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
  },
  filled: {
    borderColor: THEME_COLORS.borderStrong,
    backgroundColor: THEME_COLORS.primarySubtle,
  },
  focused: {
    ...(UI.inputFocused as TextStyle),
    backgroundColor: THEME_COLORS.surface,
  },
})
