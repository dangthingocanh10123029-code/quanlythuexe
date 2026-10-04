"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, FlatList } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { auth } from "../../config/firebase"
import type { Car } from "../../types/car"
import DateTimePicker from '@react-native-community/datetimepicker'
import { Platform } from 'react-native'
import { onAuthStateChanged } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { cars } from "../../data/cars"
import { BRAND_ASSETS, PROMO_ASSETS } from "../../data/assets"
import { StatusBar } from "expo-status-bar"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY, layout } from "../../utils/theme"
import { CarCardCompact, CarCardFeatured, PromoModal, SearchBar, SectionHeader } from "../../components"


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

// Update featuredCars type
const featuredCars = [
    {
    id: "21",
    name: "Ford Mustang",
    brand: "Ford",
    model: "GT",
    year: 2024,
    pricePerDay: 1800000,
    location: "Đà Nẵng",
    image: require("../../assets/cars/ford_mustang.png"),
    seats: 4,
    rating: 4.8,
    availability: true,
    type: "Xe thể thao",
    createdAt: new Date(),
  },
    {
    id: "15",
    name: "Honda NSX",
    brand: "Honda",
    model: "NSX Type S",
    year: 2024,
    pricePerDay: 1900000,
    location: "Đà Nẵng",
    image: require("../../assets/cars/honda_nsx.png"),
    seats: 2,
    rating: 4.8,
    availability: true,
    type: "Xe thể thao",
    createdAt: new Date(),
  },
  {
    id: "11",
    name: "Land Cruiser",
    brand: "Toyota",
    model: "300 Series",
    year: 2024,
    pricePerDay: 1500000,
    location: "Hà Nội",
    image: require("../../assets/cars/toyota_land_cruiser.png"),
    seats: 7,
    rating: 4.7,
    availability: true,
    type: "SUV",
    createdAt: new Date(),
  },
  {
    id: "17",
    name: "Nissan GT-R",
    brand: "Nissan",
    model: "R35 NISMO",
    year: 2024,
    pricePerDay: 2000000,
    location: "Hà Nội",
    image: require("../../assets/cars/nissan_gtr.png"),
    seats: 4,
    rating: 4.9,
    availability: true,
    type: "Xe thể thao",
    createdAt: new Date(),
    
  },
    {
    id: "12",
    name: "Toyota Supra",
    brand: "Toyota",
    model: "GR Supra",
    year: 2024,
    pricePerDay: 1700000,
    location: "Đà Nẵng",
    image: require("../../assets/cars/toyota_supra.png"),
    seats: 2,
    rating: 4.9,
    availability: true,
    type: "Xe thể thao",
    createdAt: new Date(),
  },
]
const recentlyRented = cars.slice(0, 4) // Just for demo, normally would be from booking history

// Mở tab Xe kèm tham số. `ts` luôn mới để tab Xe nhận ra lần mở mới (kể cả khi bấm lại cùng một hãng)
type CarsTabParams = { brand?: string; city?: string; focus?: "1"; openFilter?: "1" }
const openCarsTab = (params: CarsTabParams = {}) => {
  router.push({
    pathname: "/(tabs)/search",
    // Luôn gửi đủ các khoá (rỗng nếu không dùng) để tham số cũ của tab không bị giữ lại
    params: { brand: "", city: "", focus: "", openFilter: "", ...params, ts: Date.now().toString() },
  })
}

export default function HomeScreen() {
  const [currentCouponIndex, setCurrentCouponIndex] = useState(0)
  const [userName, setUserName] = useState("bạn")
  const [isRental, setIsRental] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date')
  const [activeField, setActiveField] = useState<'pickUp' | 'dropOff' | null>(null)
  const [formData, setFormData] = useState({
    pickUpDate: new Date(),
    pickUpTime: new Date(),
    pickUpLocation: '',
    dropOffDate: new Date(),
    dropOffTime: new Date(),
    dropOffLocation: '',
    // Airport specific fields
    flightNumber: '',
    airline: '',
    terminal: '',
  })
  const [showPromoModal, setShowPromoModal] = useState(false)
  const [isNewLogin, setIsNewLogin] = useState(false)
  const [timeLeft, setTimeLeft] = useState(180) // 180 seconds = 3 minutes
  const [searchQuery, setSearchQuery] = useState("")
  const [hasNotifications, setHasNotifications] = useState(false)

  // Add this state to track first render
  const [isFirstRender, setIsFirstRender] = useState(true)

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

  // Add this useEffect to reset first render state on unmount
  useEffect(() => {
    return () => {
      setIsFirstRender(true)
    }
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

  const showDateTimePicker = (mode: 'date' | 'time', field: 'pickUp' | 'dropOff') => {
    setPickerMode(mode)
    setActiveField(field)
    setShowPicker(true)
  }

  const onDateTimeChange = (event: any, selectedValue: Date | undefined) => {
    setShowPicker(Platform.OS === 'ios')
    if (selectedValue && activeField) {
      setFormData(prev => ({
        ...prev,
        [`${activeField}${pickerMode === 'date' ? 'Date' : 'Time'}`]: selectedValue
      }))
    }
  }

  const renderRecentCarCard = ({ item }: { item: Car }) => (
    <CarCardCompact
      car={item}
      onPress={() => router.push({ pathname: "/car-details/[id]", params: { id: item.id } })}
      style={styles.recentCarCard}
    />
  )

  const renderFeaturedCarCard = ({ item }: { item: Car }) => (
    <View style={styles.featuredSlide}>
      <CarCardFeatured
        car={item}
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
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons
                name={hasNotifications ? "notifications" : "notifications-outline"}
                size={22}
                color={THEME_COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <SearchBar
          placeholder="Tìm xe, hãng xe, mẫu xe..."
          onPress={() => openCarsTab({ focus: "1" })}
          onFilterPress={() => openCarsTab({ openFilter: "1" })}
          containerStyle={styles.searchContainer}
        />

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
            snapToInterval={width} // Full width snap
            decelerationRate={0.9}
            contentContainerStyle={styles.featuredCarsContainer}
            snapToAlignment="center"
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            initialScrollIndex={0}
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

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    paddingHorizontal: SPACE.screen,
    marginTop: SPACE.lg,
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
})
