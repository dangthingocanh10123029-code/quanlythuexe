"use client"

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useCars, getCarImage } from "../hooks/useCars"
import { useLikedCarIds } from "../hooks/useLikedCarIds"
import type { Car } from "../types/car"
import { formatCurrency } from "../utils/helpers"
import { StatusBar } from "expo-status-bar"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"

export default function LikedCarsScreen() {
  const { cars } = useCars()
  const { likedIds, toggleLike } = useLikedCarIds()
  // Bỏ qua các xe đã bị xoá khỏi Firestore
  const likedCars = cars.filter((car) => likedIds.includes(car.id))

  const handleUnlike = (carId: string) =>
    toggleLike(carId).catch((error) => Alert.alert("Lỗi", error.message || "Không thể bỏ yêu thích xe này. Vui lòng thử lại."))

  const renderCarItem = ({ item }: { item: Car }) => (
    <TouchableOpacity
      style={styles.carCard}
      activeOpacity={PRESS_OPACITY}
      onPress={() => router.push({
        pathname: "/car-details/[id]",
        params: { id: item.id }
      })}
    >
      <View style={styles.imageWrapper}>
        <Image source={getCarImage(item)} style={styles.carImage} resizeMode="contain" />
        <TouchableOpacity
          onPress={() => handleUnlike(item.id)}
          style={styles.unlikeButton}
          activeOpacity={PRESS_OPACITY}
        >
          <Ionicons name="heart" size={20} color={THEME_COLORS.danger} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.carName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.carPrice}>{formatCurrency(item.pricePerDay)}/ngày</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={THEME_COLORS.textMuted} />
          <Text style={styles.metaText}>{item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="arrow-back" size={22} color={THEME_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Xe yêu thích</Text>
        <View style={styles.headerSpacer} />
      </View>

      {likedCars.length > 0 ? (
        <FlatList
          data={likedCars}
          renderItem={renderCarItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="heart-outline" size={40} color={THEME_COLORS.primary} />
          </View>
          <Text style={styles.emptyText}>Bạn chưa có xe yêu thích nào</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACE.screen,
    paddingVertical: SPACE.md,
    backgroundColor: THEME_COLORS.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    ...TYPOGRAPHY.h3,
  },
  listContainer: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.section,
    gap: SPACE.lg,
  },
  carCard: {
    ...UI.card,
    overflow: "hidden",
  },
  imageWrapper: {
    backgroundColor: THEME_COLORS.surfaceMuted,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  carImage: {
    width: "88%",
    height: "88%",
  },
  cardContent: {
    padding: SPACE.lg,
    gap: SPACE.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACE.md,
  },
  carName: {
    ...TYPOGRAPHY.h3,
    flex: 1,
  },
  carPrice: {
    ...TYPOGRAPHY.price,
    fontSize: 15,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
  },
  unlikeButton: {
    position: "absolute",
    top: SPACE.md,
    right: SPACE.md,
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.card,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACE.screen,
    paddingBottom: SPACE.section,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.lg,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
  },
})
