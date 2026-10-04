import { View, ActivityIndicator, StyleSheet } from "react-native"
import { THEME_COLORS } from "../../utils/theme"

interface LoadingSpinnerProps {
  size?: "small" | "large"
  color?: string
}

export default function LoadingSpinner({ size = "large", color = THEME_COLORS.primary }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: THEME_COLORS.background,
  },
})
