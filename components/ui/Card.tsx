import type React from "react"
import { View, StyleSheet, type ViewStyle } from "react-native"

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  padding?: number
}

export default function Card({ children, style, padding = 16 }: CardProps) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
})
