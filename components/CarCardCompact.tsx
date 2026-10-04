import { Image, StyleSheet, Text, TouchableOpacity, View, type ImageSourcePropType, type ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { formatCurrency } from "../utils/helpers"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../utils/theme"

export type CarCardData = {
  id: string
  name: string
  brand?: string
  image: ImageSourcePropType
  pricePerDay: number
  location?: string
  rating?: number
  seats?: number
  type?: string
}

type CarCardCompactProps = {
  car: CarCardData
  onPress: () => void
  onFavoritePress?: () => void
  liked?: boolean
  wide?: boolean
  style?: ViewStyle
}

export default function CarCardCompact({
  car,
  onPress,
  onFavoritePress,
  liked = false,
  wide = false,
  style,
}: CarCardCompactProps) {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={PRESS_OPACITY}>
      <View style={styles.imageWrap}>
        <Image source={car.image} style={[styles.image, wide && styles.imageWide]} resizeMode="cover" />
        <View style={styles.imageHeader}>
          {car.location ? (
            <View style={styles.locationTag}>
              <Ionicons name="location" size={12} color={THEME_COLORS.primary} />
              <Text style={styles.locationText} numberOfLines={1}>{car.location}</Text>
            </View>
          ) : <View />}
          {onFavoritePress ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={liked ? "Bỏ khỏi xe yêu thích" : "Thêm vào xe yêu thích"}
              style={styles.favoriteButton}
              onPress={(event) => {
                event.stopPropagation()
                onFavoritePress()
              }}
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={19}
                color={liked ? THEME_COLORS.danger : THEME_COLORS.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{car.name}</Text>
        <View style={styles.metaRow}>
          {typeof car.rating === "number" ? (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={13} color={THEME_COLORS.accent} />
              <Text style={styles.metaText}>{car.rating.toFixed(1)}</Text>
            </View>
          ) : null}
          {typeof car.seats === "number" ? (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={13} color={THEME_COLORS.textMuted} />
              <Text style={styles.metaText}>{car.seats} chỗ</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.price} numberOfLines={1}>{formatCurrency(car.pricePerDay)}/ngày</Text>
        <View style={styles.footer}>
          <View style={styles.conditionTag}>
            <Text style={styles.conditionText}>TỰ LÁI</Text>
          </View>
          <View style={styles.arrowButton}>
            <Ionicons name="arrow-forward" size={16} color={THEME_COLORS.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    ...UI.card,
    flex: 1,
    overflow: "hidden",
  },
  imageWrap: {
    backgroundColor: THEME_COLORS.surfaceMuted,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 118,
  },
  imageWide: {
    height: 184,
  },
  imageHeader: {
    position: "absolute",
    top: SPACE.sm,
    left: SPACE.sm,
    right: SPACE.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACE.xs,
  },
  locationTag: {
    minHeight: 28,
    maxWidth: "78%",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
  },
  locationText: {
    flexShrink: 1,
    color: THEME_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  favoriteButton: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: SPACE.md,
    flex: 1,
  },
  name: {
    ...TYPOGRAPHY.bodyStrong,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    marginTop: SPACE.xs,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
  price: {
    ...TYPOGRAPHY.price,
    fontSize: 15,
    marginTop: SPACE.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACE.md,
    marginTop: "auto",
  },
  conditionTag: {
    paddingHorizontal: SPACE.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
  },
  conditionText: {
    color: THEME_COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.45,
  },
  arrowButton: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
})

