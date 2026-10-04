import type React from "react"
import { View, StyleSheet, type ViewStyle } from "react-native"
import { SPACE, UI } from "../../utils/theme"

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  padding?: number
}

export default function Card({ children, style, padding = SPACE.lg }: CardProps) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    ...UI.card,
  },
})
