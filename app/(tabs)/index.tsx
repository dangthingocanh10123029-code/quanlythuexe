"use client"

import { useState, useEffect, useMemo } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, FlatList, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { auth } from "../../config/firebase"
import type { Car } from "../../types/car"
import { onAuthStateChanged } from 'firebase/auth'
import { useCars, getCarImage } from "../../hooks/useCars"
import { useLikedCarIds } from "../../hooks/useLikedCarIds"
import { useNotifications } from "../../hooks/useNotifications"
import { useUserBookings } from "../../hooks/useBookings"
import { findPickupReminder, getBookingRange } from "../../utils/booking"
import { formatDate } from "../../utils/helpers"
import { HIDDEN_CAR_STATUSES } from "../../utils/constants"
import { BRAND_ASSETS, PROMO_ASSETS } from "../../data/assets"
import { StatusBar } from "expo-status-bar"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY, layout } from "../../utils/theme"
import { CarCardCompact, CarCardFeatured, CarCardSkeleton, PromoModal, SearchBar, SectionHeader } from "../../components"
import DateTimeRangePicker from "../../components/DateTimeRangePicker"


const { width } = Dimensions.get("window")

const coupons = [
  {
    id: 1,
    title: "FIRST20",
    description: "Giảm 20% cho chuyến thuê đầu tiên",
    color: "#1054CF",
    image: PROMO_ASSETS.firstRide
  },
  {
    id: 2,
    title: "WEEKEND50",
    description: "Giảm 50% khi thuê xe cuối tuần",
    color: "#c2a300",
    image: PROMO_ASSETS.weekend
  },
]

// Mở tab Xe kèm tham số. `ts` luôn mới để tab Xe nhận ra lần mở mới (kể cả khi bấm lại cùng một hãng)
// pickup/return: ISO string, tab Xe chỉ hiện xe còn trống trong khoảng này
type CarsTabParams = { brand?: string; city?: string; focus?: "1"; openFilter?: "1"; pickup?: string; return?: string }
const openCarsTab = (params: CarsTabParams = {}) => {
  router.push({
    pathname: "/(tabs)/search",
    // Luôn gửi đủ các khoá (rỗng nếu không dùng) để tham số cũ của tab không bị giữ lại
    params: { brand: "", city: "", focus: "", openFilter: "", pickup: "", return: "", ...params, ts: Date.now().toString() },
  })
}

const createDefaultRange = () => {
  const pickup = new Date()
  pickup.setDate(pickup.getDate() + 1)
  pickup.setHours(9, 0, 0, 0)
  return { pickup, returnAt: new Date(pickup.getTime() + 86_400_000) }
}

export default function HomeScreen() {
  const [currentCouponIndex, setCurrentCouponIndex] = useState(0)
  const [userName, setUserName] = useState("bạn")
  const [showPromoModal, setShowPromoModal] = useState(false)
  const [timeLeft, setTimeLeft] = useState(180) // 180 seconds = 3 minutes
  const { unreadCount } = useNotifications()
  const hasNotifications = unreadCount > 0
  // Đơn "Sắp nhận xe" trong 24 giờ tới → thẻ nhắc nhận xe
  const { bookings } = useUserBookings()
  const pickupReminder = findPickupReminder(bookings)
  const reminderStart = pickupReminder ? getBookingRange(pickupReminder)?.start ?? null : null
  const reminderHours = reminderStart ? Math.max(0, Math.ceil((reminderStart.getTime() - Date.now()) / 3_600_000)) : 0
  const [rentalRange, setRentalRange] = useState(createDefaultRange)
  const { cars, loading: carsLoading } = useCars()
  const { likedIds, toggleLike } = useLikedCarIds()

  // Xe nổi bật: điểm đánh giá cao nhất trong các xe đang cho thuê
  const visibleCars = useMemo(() => cars.filter((c) => !HIDDEN_CAR_STATUSES.includes(c.status)), [cars])
  const featuredCars = useMemo(() => [...visibleCars].sort((a, b) => b.rating - a.rating).slice(0, 5), [visibleCars])
  const recentlyRented = visibleCars.slice(0, 4) // Demo; về sau lấy từ lịch sử thuê

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setShowPromoModal(true)
        setTimeLeft(180) // Reset timer
      } else {
        setShowPromoModal(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // Cập nhật lời chào khi Firebase khôi phục xong phiên đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser?.displayName) {
        // Tên người Việt: gọi theo tên (từ cuối), vd "Nguyễn Văn An" → "An"
        const parts = currentUser.displayName.trim().split(/\s+/)
        setUserName(parts[parts.length - 1])
      } else if (currentUser?.email) {
        const emailName = currentUser.email.split("@")[0]
        setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1))
      } else {
        setUserName("bạn")
      }
    })
    return unsubscribe
  }, [])

  // Add this useEffect for the countdown
  useEffect(() => {
    if (showPromoModal && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)

      return () => clearInterval(timer)
    } else if (timeLeft === 0) {
      setShowPromoModal(false)
      setTimeLeft(180) // Reset timer for next time
    }
  }, [showPromoModal, timeLeft])

  // Add this helper function to format the time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours.toString().padStart(2, '0')} : ${minutes.toString().padStart(2, '0')} : ${remainingSeconds.toString().padStart(2, '0')}`
  }

  const renderRecentCarCard = ({ item }: { item: Car }) => (
    <CarCardCompact
      car={{ ...item, image: getCarImage(item) }}
      liked={likedIds.includes(item.id)}
      onFavoritePress={() => toggleLike(item.id).catch((e) => Alert.alert("Không thể lưu xe yêu thích", e.message))}
      onPress={() => router.push({ pathname: "/car-details/[id]", params: { id: item.id } })}
      style={styles.recentCarCard}
    />
  )

  const renderFeaturedCarCard = ({ item }: { item: Car }) => (
    <View style={styles.featuredSlide}>
      <CarCardFeatured
        car={{ ...item, image: getCarImage(item) }}
        liked={likedIds.includes(item.id)}
        onFavoritePress={() => toggleLike(item.id).catch((e) => Alert.alert("Không thể lưu xe yêu thích", e.message))}
        onPress={() => router.push({ pathname: "/car-details/[id]", params: { id: item.id } })}
      />
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting} numberOfLines={1}>Xin chào, {userName}!</Text>
            <TouchableOpacity
              style={styles.locationContainer}
              onPress={() => openCarsTab({ city: "TP. Hồ Chí Minh" })}
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons name="location" size={14} color={THEME_COLORS.primary} />
              <Text style={styles.location}>TP. Hồ Chí Minh, VN</Text>
              <Text style={styles.flag}>🇻🇳</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/likedcars")}
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons name="heart-outline" size={22} color={THEME_COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/notifications")}
              accessibilityRole="button"
              accessibilityLabel={hasNotifications ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo"}
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons
                name={hasNotifications ? "notifications" : "notifications-outline"}
                size={22}
                color={THEME_COLORS.primary}
              />
              {hasNotifications && <View style={styles.bellDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Nhắc nhận xe: đơn "Sắp nhận xe" trong 24 giờ tới */}
        {pickupReminder && reminderStart ? (
          <TouchableOpacity
            style={styles.reminderCard}
            onPress={() => router.push({ pathname: "/booking/[id]", params: { id: pickupReminder.id } })}
            accessibilityRole="button"
            activeOpacity={PRESS_OPACITY}
          >
            <View style={styles.reminderIcon}>
              <Ionicons name="key" size={20} color={THEME_COLORS.primary} />
            </View>
            <View style={styles.reminderBody}>
              <Text style={styles.reminderOverline}>
                {reminderHours <= 1 ? "Sắp đến giờ nhận xe" : `Nhận xe sau ${reminderHours} giờ nữa`}
              </Text>
              <Text style={styles.reminderTitle} numberOfLines={1}>{pickupReminder.carName}</Text>
              <Text style={styles.reminderText} numberOfLines={1}>
                {formatDate(reminderStart, "datetime")} · {pickupReminder.location}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={THEME_COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}

        {/* Search Bar */}
        <SearchBar
          placeholder="Tìm xe, hãng xe, mẫu xe..."
          onPress={() => openCarsTab({ focus: "1" })}
          onFilterPress={() => openCarsTab({ openFilter: "1" })}
          containerStyle={styles.searchContainer}
        />

        <View style={styles.dateSearchSection}>
          <View style={styles.dateSearchHeader}>
            <View>
              <Text style={styles.dateSearchOverline}>Lịch thuê</Text>
              <Text style={styles.dateSearchTitle}>Nhận xe – Trả xe</Text>
            </View>
            <View style={styles.availableBadge}>
              <Ionicons name="sparkles" size={14} color={THEME_COLORS.primary} />
              <Text style={styles.availableBadgeText}>Xe còn trống</Text>
            </View>
          </View>
          <DateTimeRangePicker
            pickupAt={rentalRange.pickup}
            returnAt={rentalRange.returnAt}
            onPickupChange={(pickup) => setRentalRange((current) => ({ ...current, pickup }))}
            onReturnChange={(returnAt) => setRentalRange((current) => ({ ...current, returnAt }))}
          />
          <TouchableOpacity
            style={styles.findCarsButton}
            onPress={() => openCarsTab({
              pickup: rentalRange.pickup.toISOString(),
              return: rentalRange.returnAt.toISOString(),
            })}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons name="search" size={19} color={THEME_COLORS.textInverse} />
            <Text style={styles.findCarsButtonText}>Tìm xe trống</Text>
          </TouchableOpacity>
        </View>

        {/* Coupon Section */}
        <View style={styles.couponSection}>
          <FlatList
            data={coupons}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.couponList}
            contentContainerStyle={styles.couponListContent}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / (width - 40))
              setCurrentCouponIndex(index)
            }}
            renderItem={({ item }) => (
              <View style={styles.couponSlide}>
                <View style={[styles.couponCard, { backgroundColor: item.color }]}>
                  <Image
                    source={item.image}
                    style={styles.couponImage}
                    resizeMode="cover"
                  />
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
          />
          <View style={styles.couponIndicators}>
            {coupons.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentCouponIndex === index ? styles.activeIndicator : styles.inactiveIndicator,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Top Car Brands Section */}
        <View style={styles.brandsSection}>
          <Text style={styles.sectionOverline}>Khám phá xe theo hãng:</Text>
          <Text style={styles.sectionTitle}>Hãng xe phổ biến</Text>

          <View style={styles.brandsGrid}>
            <TouchableOpacity
              style={styles.brandCard}
              onPress={() => openCarsTab({ brand: "Toyota" })}
              activeOpacity={PRESS_OPACITY}
            >
              <Image
                source={BRAND_ASSETS.Toyota}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.brandCard}
              onPress={() => openCarsTab({ brand: "BMW" })}
              activeOpacity={PRESS_OPACITY}
            >
              <Image
                source={BRAND_ASSETS.BMW}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.brandCard}
              onPress={() => openCarsTab({ brand: "Mercedes" })}
              activeOpacity={PRESS_OPACITY}
            >
              <Image
                source={BRAND_ASSETS.Mercedes}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.brandCard, styles.brandCardMore]}
              onPress={() => openCarsTab()}
              activeOpacity={PRESS_OPACITY}
            >
              <View style={styles.moreIcon}>
                <Ionicons name="arrow-forward" size={18} color={THEME_COLORS.primary} />
              </View>
              <Text style={styles.moreText}>Thêm</Text>
            </TouchableOpacity>
          </View>
        </View>

        {carsLoading ? (
          <>
            <View style={styles.section}>
              <SectionHeader title="Xe nổi bật" style={styles.sectionHeader} />
              <View style={styles.featuredSlide}>
                <CarCardSkeleton featured />
              </View>
            </View>
            <View style={styles.section}>
              <SectionHeader title="Thuê gần đây" style={styles.sectionHeader} />
              <View style={styles.skeletonRow}>
                {[0, 1].map((item) => (
                  <CarCardSkeleton key={item} style={styles.recentCarCard} />
                ))}
              </View>
            </View>
          </>
        ) : visibleCars.length === 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Danh sách xe" style={styles.sectionHeader} />
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="car-outline" size={32} color={THEME_COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có xe sẵn sàng</Text>
              <Text style={styles.emptySubtitle}>Danh sách xe đang được cập nhật. Bạn vui lòng quay lại sau.</Text>
            </View>
          </View>
        ) : (
          <>
            {/* Featured Cars */}
            <View style={styles.section}>
              <SectionHeader
                title="Xe nổi bật"
                actionLabel="Xem tất cả"
                onAction={() => openCarsTab()}
                style={styles.sectionHeader}
              />

              <FlatList
                data={featuredCars}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={renderFeaturedCarCard}
                keyExtractor={(item) => item.id}
                snapToInterval={width}
                decelerationRate={0.9}
                contentContainerStyle={styles.featuredCarsContainer}
                snapToAlignment="center"
                getItemLayout={(_, index) => ({
                  length: width,
                  offset: width * index,
                  index,
                })}
                pagingEnabled
              />
            </View>

            {/* Recently Rented */}
            <View style={styles.section}>
              <SectionHeader
                title="Thuê gần đây"
                actionLabel="Xem tất cả"
                onAction={() => router.push("/(tabs)/bookings")}
                style={styles.sectionHeader}
              />

              <FlatList
                data={recentlyRented}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={renderRecentCarCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.recentListContent}
              />
            </View>
          </>
        )}
      </ScrollView>

      <PromoModal
        visible={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        onAction={() => {
          setShowPromoModal(false)
          openCarsTab()
        }}
        image={PROMO_ASSETS.onboardingCars}
        title="Quà chào mừng!"
        description="Giảm ngay 25% cho chuyến thuê xe đầu tiên. Nhập mã:"
        promoCode="WELCOME25"
        countdown={formatTime(timeLeft)}
      />
    </SafeAreaView>
  )
}

const BRAND_GAP = SPACE.md
const BRAND_CARD_SIZE = (width - SPACE.screen * 2 - BRAND_GAP * 3) / 4
// Chiều cao thanh tab nổi (72) + khoảng cách đáy (20) + khoảng thở
const TAB_BAR_CLEARANCE = layout.tabBarClearance

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  scrollContent: {
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.sm,
    backgroundColor: THEME_COLORS.background,
    gap: SPACE.md,
  },
  greeting: {
    ...TYPOGRAPHY.h1,
    marginBottom: SPACE.xs,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
  },
  location: {
    ...TYPOGRAPHY.caption,
  },
  flag: {
    fontSize: 14,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: SPACE.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 10,
    height: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.danger,
    borderWidth: 2,
    borderColor: THEME_COLORS.primarySoft,
  },
  reminderCard: {
    ...UI.card,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    marginHorizontal: SPACE.screen,
    marginTop: SPACE.lg,
    padding: SPACE.lg,
    borderColor: THEME_COLORS.primary,
  },
  reminderIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderBody: {
    flex: 1,
  },
  reminderOverline: {
    ...TYPOGRAPHY.overline,
    color: THEME_COLORS.primary,
  },
  reminderTitle: {
    ...TYPOGRAPHY.bodyStrong,
    marginTop: 2,
  },
  reminderText: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    paddingHorizontal: SPACE.screen,
    marginTop: SPACE.lg,
  },
  dateSearchSection: {
    ...UI.card,
    marginHorizontal: SPACE.screen,
    marginTop: SPACE["2xl"],
    padding: SPACE.lg,
  },
  dateSearchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACE.md,
    marginBottom: SPACE.lg,
  },
  dateSearchOverline: {
    ...TYPOGRAPHY.overline,
  },
  dateSearchTitle: {
    ...TYPOGRAPHY.h3,
    marginTop: 2,
  },
  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
    paddingHorizontal: SPACE.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
  },
  availableBadgeText: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.primary,
  },
  findCarsButton: {
    ...UI.primaryButton,
    height: 48,
    flexDirection: "row",
    gap: SPACE.sm,
    marginTop: SPACE.lg,
  },
  findCarsButtonText: {
    ...UI.primaryButtonText,
    fontSize: 15,
  },
  // Coupons
  couponSection: {
    paddingHorizontal: SPACE.screen,
    marginTop: SPACE["2xl"],
  },
  couponList: {
    overflow: "visible",
  },
  couponListContent: {
    paddingVertical: SPACE.sm,
  },
  couponSlide: {
    width: width - 40,
  },
  couponCard: {
    height: 180,
    borderRadius: RADIUS.card,
    ...SHADOWS.card,
  },
  couponImage: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.card,
  },
  couponIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: SPACE.md,
  },
  indicator: {
    height: 6,
    borderRadius: RADIUS.pill,
    marginHorizontal: 3,
  },
  activeIndicator: {
    backgroundColor: THEME_COLORS.primary,
    width: 20,
  },
  inactiveIndicator: {
    backgroundColor: THEME_COLORS.borderStrong,
    width: 6,
  },

  // Sections
  brandsSection: {
    paddingHorizontal: SPACE.screen,
    marginTop: SPACE.section,
  },
  sectionOverline: {
    ...TYPOGRAPHY.overline,
    marginBottom: SPACE.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.lg,
  },
  brandsGrid: {
    flexDirection: 'row',
    gap: BRAND_GAP,
  },
  brandCard: {
    ...UI.card,
    width: BRAND_CARD_SIZE,
    height: BRAND_CARD_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  brandCardMore: {
    backgroundColor: THEME_COLORS.surfaceMuted,
    boxShadow: "none",
    gap: SPACE.xs,
  },
  brandLogo: {
    width: "60%",
    height: "60%",
  },
  moreIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME_COLORS.primary,
  },
  section: {
    marginTop: SPACE.section,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACE.screen,
    marginBottom: SPACE.md,
  },
  // Featured cars
  featuredCarsContainer: {
    paddingTop: SPACE.xs,
    paddingBottom: SPACE.lg,
  },
  featuredSlide: {
    width: width,
    paddingHorizontal: SPACE.screen,
  },
  // Recent cars
  recentListContent: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.xs,
    paddingBottom: SPACE.lg,
    gap: SPACE.md,
  },
  recentCarCard: {
    width: width * 0.6,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: SPACE.md,
    paddingHorizontal: SPACE.screen,
    paddingBottom: SPACE.lg,
    overflow: "hidden",
  },
  emptyState: {
    ...UI.card,
    alignItems: "center",
    marginHorizontal: SPACE.screen,
    paddingHorizontal: SPACE.xl,
    paddingVertical: SPACE.section,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACE.xs,
    textAlign: "center",
  },
})
