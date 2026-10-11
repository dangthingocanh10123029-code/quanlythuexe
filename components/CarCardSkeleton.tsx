import { StyleSheet, View, type ViewStyle } from "react-native"
import { RADIUS, SPACE, THEME_COLORS, UI } from "../utils/theme"

type CarCardSkeletonProps = {
  featured?: boolean
  style?: ViewStyle
}

export default function CarCardSkeleton({ featured = false, style }: CarCardSkeletonProps) {
  return (
    <View
      accessibilityLabel="Đang tải thông tin xe"
      style={[styles.card, style]}
    >
      <View style={[styles.image, featured && styles.imageFeatured]} />
      <View style={styles.content}>
        <View style={[styles.line, styles.titleLine]} />
        <View style={[styles.line, styles.subtitleLine]} />
        <View style={styles.chipRow}>
          <View style={styles.chip} />
          <View style={styles.chip} />
        </View>
        <View style={styles.footer}>
          <View style={[styles.line, styles.priceLine]} />
          <View style={styles.circle} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    ...UI.card,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 118,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  imageFeatured: {
    height: 188,
  },
  content: {
    padding: SPACE.lg,
  },
  line: {
    height: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.border,
  },
  titleLine: {
    width: "68%",
    height: 18,
  },
  subtitleLine: {
    width: "42%",
    marginTop: SPACE.sm,
  },
  chipRow: {
    flexDirection: "row",
    gap: SPACE.sm,
    marginTop: SPACE.lg,
  },
  chip: {
    width: 72,
    height: 28,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACE.lg,
  },
  priceLine: {
    width: "50%",
    height: 16,
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
})
