import { StyleSheet, Text, View, type ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../utils/theme"

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap
  value: string | number
  label: string
  style?: ViewStyle
}

export default function StatCard({ icon, value, label, style }: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={THEME_COLORS.primary} />
      </View>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    ...UI.card,
    flex: 1,
    minHeight: 132,
    padding: SPACE.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME_COLORS.primarySoft,
    marginBottom: SPACE.sm,
  },
  value: {
    ...TYPOGRAPHY.h3,
    textAlign: "center",
  },
  label: {
    ...TYPOGRAPHY.caption,
    textAlign: "center",
    marginTop: 1,
  },
})

