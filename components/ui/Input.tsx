import { View, TextInput, Text, StyleSheet, type TextInputProps } from "react-native"

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  helperText?: string
}

export default function Input({ label, error, helperText, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput style={[styles.input, error && styles.errorInput, style]} placeholderTextColor="#999999" {...props} />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#ffffff",
    color: "#000000",
  },
  errorInput: {
    borderColor: "#ff4444",
  },
  errorText: {
    fontSize: 12,
    color: "#ff4444",
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
  },
})
