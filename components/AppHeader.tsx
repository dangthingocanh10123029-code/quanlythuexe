import type { ReactNode } from "react"
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { PRESS_OPACITY, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../utils/theme"

type AppHeaderProps = {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
  style?: ViewStyle
  divider?: boolean
  backIcon?: "arrow-back" | "close"
  sideWidth?: number
}

export default function AppHeader({
  title,
  subtitle,
  onBack,
  right,
  style,
  divider = true,
  backIcon = "arrow-back",
  sideWidth = 52,
}: AppHeaderProps) {
  return (
    <View style={[styles.header, divider && styles.headerDivider, style]}>
      <View style={[styles.side, { width: sideWidth }]}>
        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            style={styles.iconButton}
            onPress={onBack}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons name={backIcon} size={22} color={THEME_COLORS.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      <View style={[styles.side, styles.sideRight, { width: sideWidth }]}>{right}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    minHeight: 72,
    paddingHorizontal: SPACE.screen,
    paddingVertical: SPACE.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME_COLORS.background,
  },
  headerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.border,
  },
  side: {
    width: 52,
    alignItems: "flex-start",
  },
  sideRight: {
    alignItems: "flex-end",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: SPACE.sm,
  },
  title: {
    ...TYPOGRAPHY.h2,
    textAlign: "center",
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 1,
    textAlign: "center",
  },
})
