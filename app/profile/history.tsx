"use client"

import { useMemo, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Image, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useUserBookings } from "../../hooks/useBookings"
import { useUid } from "../../hooks/useUid"
import { getBookingRange } from "../../utils/booking"
import { useCars, getCarImage } from "../../hooks/useCars"
import type { Car } from "../../types/car"
import { formatCurrency, formatDate } from "../../utils/helpers"
import { getBookingStatusLabel } from "../../utils/constants"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../../utils/theme"

interface RentalHistoryItem {
  id: string
  carId?: string
  carName: string
  carImage: any
  startDate: Date | null
  endDate: Date | null
  days: number
  totalCost: number
  status: string
  location: string
}

// Ảnh theo xe trên Firestore; đơn cũ có thể còn carImage dạng chuỗi (URL / data URI)
const resolveCarImage = (cars: Car[], carId?: string, carImage?: any) => {
  const car = cars.find((c) => c.id === carId)
  if (car) return getCarImage(car)
  if (typeof carImage === "string" && carImage) return { uri: carImage }
  return null
}

export default function HistoryScreen() {
  const uid = useUid()
  const { cars } = useCars()
  const { bookings, loading } = useUserBookings()
  const [filter, setFilter] = useState("all")

  const rentalHistory: RentalHistoryItem[] = useMemo(() => {
    const items = bookings.map((b: any) => {
      const range = getBookingRange(b)
      return {
        id: b.id,
        carId: b.carId,
        carName: b.carName || "Xe thuê",
        carImage: b.carImage,
        startDate: range?.start ?? null,
        endDate: range?.end ?? null,
        days: Number(b.duration) || 1,
        totalCost: Number(b.price) || 0,
        status: b.status || "Pending",
        location: b.location || "",
      }
    })
    return items.sort((a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0))
  }, [bookings])

  // Badge trạng thái: nền soft + chữ đậm cùng tông
  const getStatusTone = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return { bg: THEME_COLORS.successSoft, fg: THEME_COLORS.success }
      case "active":
      case "upcoming":
        return { bg: THEME_COLORS.primarySoft, fg: THEME_COLORS.primary }
      case "pending":
        return { bg: THEME_COLORS.warningSoft, fg: THEME_COLORS.warning }
      case "cancelled":
      case "canceled":
        return { bg: THEME_COLORS.dangerSoft, fg: THEME_COLORS.danger }
      default:
        return { bg: THEME_COLORS.surfaceMuted, fg: THEME_COLORS.textSecondary }
    }
  }

  const isStatus = (rental: RentalHistoryItem, status: string) => rental.status.toLowerCase() === status

  const filteredHistory = rentalHistory.filter((rental) => {
    if (filter === "active") return isStatus(rental, "active")
    if (filter === "completed") return isStatus(rental, "completed")
    return true
  })

  const completedRentals = useMemo(() => rentalHistory.filter((r) => isStatus(r, "completed")), [rentalHistory])
  const totalSpent = completedRentals.reduce((sum, rental) => sum + rental.totalCost, 0)
  const totalRentals = completedRentals.length
  const totalDays = completedRentals.reduce((sum, rental) => sum + rental.days, 0)

  const renderHistoryItem = ({ item }: { item: RentalHistoryItem }) => {
    const tone = getStatusTone(item.status)
    const image = resolveCarImage(cars, item.carId, item.carImage)
    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => router.push("/(tabs)/bookings")}
        activeOpacity={PRESS_OPACITY}
      >
        {image ? (
          <View style={styles.carImageWrap}>
            <Image source={image} style={styles.carImage} resizeMode="contain" />
          </View>
        ) : (
          <View style={[styles.carImageWrap, styles.carImagePlaceholder]}>
            <Ionicons name="car-sport" size={28} color={THEME_COLORS.textMuted} />
          </View>
        )}
        <View style={styles.historyInfo}>
          <View style={styles.historyHeader}>
            <Text style={styles.carName} numberOfLines={1}>{item.carName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
              <Text style={[styles.statusText, { color: tone.fg }]}>{getBookingStatusLabel(item.status)}</Text>
            </View>
          </View>

          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {item.startDate && item.endDate
                ? `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`
                : "Chưa có ngày nhận xe"}
            </Text>
            <Text style={styles.durationText}>({item.days} ngày)</Text>
          </View>

          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color={THEME_COLORS.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.totalCost}>{formatCurrency(item.totalCost)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const filters = [
    { key: "all", label: `Tất cả (${rentalHistory.length})` },
    { key: "active", label: `Đang thuê (${rentalHistory.filter((r) => isStatus(r, "active")).length})` },
    { key: "completed", label: `Hoàn thành (${completedRentals.length})` },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="arrow-back" size={22} color={THEME_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử thuê xe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalRentals}</Text>
            <Text style={styles.statLabel}>Chuyến đã đi</Text>
          </View>
          <View style={[styles.statCard, styles.statCardWide]}>
            <Text style={[styles.statNumber, styles.statMoney]} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(totalSpent)}
            </Text>
            <Text style={styles.statLabel}>Tổng chi tiêu</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalDays}</Text>
            <Text style={styles.statLabel}>Ngày đã thuê</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filter === f.key && styles.activeFilterTab]}
              onPress={() => setFilter(f.key)}
              activeOpacity={PRESS_OPACITY}
            >
              <Text style={[styles.filterText, filter === f.key && styles.activeFilterText]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* History List */}
        <View style={styles.historyList}>
          {loading ? (
            <ActivityIndicator size="large" color={THEME_COLORS.primary} style={{ marginTop: SPACE["4xl"] }} />
          ) : filteredHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="car-outline" size={32} color={THEME_COLORS.textMuted} />
              </View>
              <Text style={styles.emptyText}>
                {uid ? "Chưa có chuyến thuê nào" : "Vui lòng đăng nhập để xem lịch sử thuê xe"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredHistory}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: SPACE.md }} />}
            />
          )}
        </View>
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACE["4xl"],
  },
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE["2xl"],
    gap: SPACE.md,
  },
  statCard: {
    ...UI.card,
    flex: 1,
    paddingVertical: SPACE.lg,
    paddingHorizontal: SPACE.md,
    alignItems: "center",
  },
  statCardWide: {
    flex: 1.4,
  },
  statNumber: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.xs,
  },
  statMoney: {
    color: THEME_COLORS.primary,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    textAlign: "center",
  },
  filterContainer: {
    flexDirection: "row",
    gap: SPACE.sm,
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.section - SPACE.sm,
    paddingBottom: SPACE.xl,
  },
  filterTab: {
    ...UI.chip,
  },
  activeFilterTab: {
    ...UI.chipActive,
  },
  filterText: {
    ...UI.chipText,
  },
  activeFilterText: {
    ...UI.chipTextActive,
  },
  historyList: {
    paddingHorizontal: SPACE.screen,
  },
  historyCard: {
    ...UI.card,
    flexDirection: "row",
    padding: SPACE.lg,
    gap: SPACE.lg,
  },
  carImageWrap: {
    width: 88,
    height: 72,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  carImage: {
    width: 80,
    height: 60,
  },
  carImagePlaceholder: {},
  historyInfo: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACE.sm,
    marginBottom: 6,
  },
  carName: {
    ...TYPOGRAPHY.bodyStrong,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACE.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: SPACE.xs,
  },
  dateText: {
    fontSize: 13,
    color: THEME_COLORS.textSecondary,
    marginRight: 6,
  },
  durationText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
    marginBottom: SPACE.sm,
  },
  locationText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    flex: 1,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalCost: {
    ...TYPOGRAPHY.price,
    fontSize: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACE["4xl"],
    gap: SPACE.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    textAlign: "center",
  },
})
