import { Image, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native"
import { PRESS_OPACITY, SPACE, TYPOGRAPHY, UI } from "../utils/theme"

// Minh hoạ trạng thái rỗng (A5, 600×600 nền trong suốt)
const EMPTY_IMAGES = {
  bookings: require("../assets/empty/no-bookings.png"),
  liked: require("../assets/empty/no-liked.png"),
  notifications: require("../assets/empty/no-notifications.png"),
  results: require("../assets/empty/no-results.png"),
  reviews: require("../assets/empty/no-reviews.png"),
}

type EmptyStateProps = {
  image: keyof typeof EMPTY_IMAGES
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  // Nút chính (nền primary) thay cho nút phụ có viền
  primaryAction?: boolean
  size?: number
  style?: ViewStyle
}

export default function EmptyState({
  image,
  title,
  description,
  actionLabel,
  onAction,
  primaryAction = false,
  size = 180,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={EMPTY_IMAGES[image]}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={primaryAction ? styles.primaryButton : styles.secondaryButton}
          onPress={onAction}
          accessibilityRole="button"
          activeOpacity={PRESS_OPACITY}
        >
          <Text style={primaryAction ? styles.primaryButtonText : styles.secondaryButtonText} numberOfLines={1}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: SPACE["2xl"],
    paddingHorizontal: SPACE.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    textAlign: "center",
    marginTop: SPACE.md,
  },
  description: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: SPACE.xs,
  },
  primaryButton: {
    ...UI.primaryButton,
    alignSelf: "stretch",
    marginTop: SPACE.xl,
  },
  primaryButtonText: {
    ...UI.primaryButtonText,
  },
  secondaryButton: {
    ...UI.secondaryButton,
    height: 44,
    maxWidth: "100%",
    marginTop: SPACE.xl,
    paddingHorizontal: SPACE.xl,
  },
  secondaryButtonText: {
    ...UI.secondaryButtonText,
    fontSize: 14,
  },
})
