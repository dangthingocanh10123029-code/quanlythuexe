import { Image, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { formatCurrency } from "../utils/helpers"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../utils/theme"
import type { CarCardData } from "./CarCardCompact"

type CarCardFeaturedProps = {
  car: CarCardData
  onPress: () => void
  style?: ViewStyle
}

export default function CarCardFeatured({ car, onPress, style }: CarCardFeaturedProps) {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={PRESS_OPACITY}>
      <View style={styles.imageWrap}>
        <Image source={car.image} style={styles.image} resizeMode="cover" />
        {car.location ? (
          <View style={styles.locationTag}>
            <Ionicons name="location" size={13} color={THEME_COLORS.primary} />
            <Text style={styles.locationText}>{car.location}</Text>
          </View>
        ) : null}
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
  locationTag: {
    position: "absolute",
    top: SPACE.md,
    left: SPACE.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
    paddingHorizontal: SPACE.md,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
  },
  locationText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME_COLORS.textSecondary,
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

