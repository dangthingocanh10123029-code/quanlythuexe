import type { ReactNode } from "react"
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native"
import { PRESS_OPACITY, SPACE, THEME_COLORS, TYPOGRAPHY } from "../utils/theme"

type SectionHeaderProps = {
  title: string
  overline?: string
  actionLabel?: string
  onAction?: () => void
  action?: ReactNode
  style?: ViewStyle
}

export default function SectionHeader({ title, overline, actionLabel, onAction, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.copy}>
        {overline ? <Text style={styles.overline}>{overline}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      {action ?? (actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={PRESS_OPACITY} hitSlop={8}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null)}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: SPACE.md,
  },
  copy: {
    flex: 1,
  },
  overline: {
    ...TYPOGRAPHY.overline,
    marginBottom: SPACE.xs,
  },
  title: {
    ...TYPOGRAPHY.h2,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME_COLORS.primary,
    paddingVertical: 2,
  },
})

