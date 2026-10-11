import { Image, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { formatCurrency } from "../utils/helpers"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../utils/theme"
import type { CarCardData } from "./CarCardCompact"

type CarCardFeaturedProps = {
  car: CarCardData
  onPress: () => void
  onFavoritePress?: () => void
  liked?: boolean
  style?: ViewStyle
}

export default function CarCardFeatured({ car, onPress, onFavoritePress, liked = false, style }: CarCardFeaturedProps) {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={PRESS_OPACITY}>
      <View style={styles.imageWrap}>
        <Image source={car.image} style={styles.image} resizeMode="cover" />
        <View style={styles.imageHeader}>
          {car.location ? (
            <View style={styles.locationTag}>
              <Ionicons name="location" size={13} color={THEME_COLORS.primary} />
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
                size={20}
                color={liked ? THEME_COLORS.danger : THEME_COLORS.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.name} numberOfLines={1}>{car.name}</Text>
            <Text style={styles.brand} numberOfLines={1}>{car.brand}</Text>
          </View>
          {typeof car.rating === "number" ? (
            <View style={styles.rating}>
              <Ionicons name="star" size={15} color={THEME_COLORS.accent} />
              <Text style={styles.ratingText}>{car.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          {typeof car.seats === "number" ? (
            <View style={styles.metaChip}>
              <Ionicons name="people-outline" size={14} color={THEME_COLORS.textSecondary} />
              <Text style={styles.metaText}>{car.seats} chỗ</Text>
            </View>
          ) : null}
          {car.type ? (
            <View style={styles.metaChip}>
              <Ionicons name="speedometer-outline" size={14} color={THEME_COLORS.textSecondary} />
              <Text style={styles.metaText}>{car.type}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.footer}>
          <View>
            <Text style={styles.priceLabel}>Giá thuê từ</Text>
            <Text style={styles.price}>{formatCurrency(car.pricePerDay)}/ngày</Text>
          </View>
          <View style={styles.arrowButton}>
            <Ionicons name="arrow-forward" size={19} color={THEME_COLORS.textInverse} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    ...UI.card,
    overflow: "hidden",
  },
  imageWrap: {
    height: 188,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageHeader: {
    position: "absolute",
    top: SPACE.md,
    left: SPACE.md,
    right: SPACE.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACE.sm,
  },
  locationTag: {
    minHeight: 34,
    maxWidth: "78%",
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surface,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME_COLORS.textSecondary,
  },
  favoriteButton: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: SPACE.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE.md,
  },
  titleCopy: {
    flex: 1,
  },
  name: {
    ...TYPOGRAPHY.h2,
  },
  brand: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.warningSoft,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME_COLORS.textPrimary,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE.sm,
    marginTop: SPACE.lg,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
    paddingHorizontal: SPACE.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME_COLORS.textSecondary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: SPACE.lg,
  },
  priceLabel: {
    ...TYPOGRAPHY.caption,
    marginBottom: 1,
  },
  price: {
    ...TYPOGRAPHY.price,
  },
  arrowButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME_COLORS.primary,
  },
})
