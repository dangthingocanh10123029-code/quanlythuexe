"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Dimensions,
  Modal,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import DummyMap from '../../components/DummyMap';
import { cars } from "../../data/cars";
import { db } from "../../config/firebase"
import { collection, addDoc, deleteDoc, getDocs, query, where, doc } from "firebase/firestore"
import { useAuth } from "../../hooks/useAuth"
import { formatCurrency } from "../../utils/helpers"
import { CITIES } from "../../utils/constants"
import { StatusBar } from "expo-status-bar"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from "../../utils/theme"

const { width } = Dimensions.get("window")

const brands = [
  { id: 1, name: "BMW", logo: require("../../assets/brandlogos/bmw.png") },
  { id: 2, name: "Mercedes", logo: require("../../assets/brandlogos/mercedes.png") },
  { id: 3, name: "Audi", logo: require("../../assets/brandlogos/audi.png") },
  { id: 4, name: "Toyota", logo: require("../../assets/brandlogos/toyota.png") },
  { id: 5, name: "Honda", logo: require("../../assets/brandlogos/honda.png") },
  { id: 6, name: "Nissan", logo: require("../../assets/brandlogos/nissan.png") },
  { id: 7, name: "Ford", logo: require("../../assets/brandlogos/ford.png") },
  { id: 8, name: "Hyundai", logo: require("../../assets/brandlogos/hyundai.png") },
]

// Loại xe lấy trực tiếp từ dữ liệu xe (giữ thứ tự xuất hiện)
const CAR_TYPE_OPTIONS = Array.from(new Set(cars.map((car) => car.type)))

const FUEL_OPTIONS = ["Xăng", "Dầu diesel"]

const SEAT_OPTIONS = [4, 5, 7]

// Giá thuê trong dữ liệu từ 750.000đ đến 2.000.000đ/ngày. Khoảng [min, max)
const PRICE_RANGES = [
  { id: "under1", label: "Dưới 1 triệu", min: 0, max: 1000000 },
  { id: "1to1.5", label: "1 – 1,5 triệu", min: 1000000, max: 1500000 },
  { id: "1.5to2", label: "1,5 – 2 triệu", min: 1500000, max: 2000000 },
  { id: "over2", label: "Từ 2 triệu trở lên", min: 2000000, max: Infinity },
]

type CarFilters = {
  type: string | null
  fuel: string | null
  city: string | null
  minSeats: number | null
  priceRange: string | null
}

const EMPTY_FILTERS: CarFilters = {
  type: null,
  fuel: null,
  city: null,
  minSeats: null,
  priceRange: null,
}

const countActiveFilters = (f: CarFilters) =>
  [f.type, f.fuel, f.city, f.minSeats, f.priceRange].filter((v) => v !== null).length

type SearchParams = {
  brand?: string
  city?: string
  focus?: string
  openFilter?: string
  ts?: string
}

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [filters, setFilters] = useState<CarFilters>(EMPTY_FILTERS)
  const [draftFilters, setDraftFilters] = useState<CarFilters>(EMPTY_FILTERS)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const searchInputRef = useRef<TextInput>(null)
  const params = useLocalSearchParams<SearchParams>()
  const { user } = useAuth()
  const [likedCars, setLikedCars] = useState<string[]>([])
  const [showLikeModal, setShowLikeModal] = useState(false)
  const [likedCarName, setLikedCarName] = useState("")
  const [focusedField, setFocusedField] = useState<"search" | null>(null)

  const fetchLikedCars = async () => {
    if (!user?.id) return
    
    try {
      const q = query(
        collection(db, "likedCars"), 
        where("userId", "==", user.id)
      )
      const querySnapshot = await getDocs(q)
      const likedCarIds = querySnapshot.docs.map(doc => doc.data().carId)
      setLikedCars(likedCarIds)
    } catch (error) {
      console.error("Error fetching liked cars:", error)
    }
  }

  const handleLike = async (car: any) => {
    if (!user?.id) {
      Alert.alert("Vui lòng đăng nhập để lưu xe yêu thích")
      return
    }

    try {
      if (likedCars.includes(car.id)) {
        // Unlike
        const q = query(
          collection(db, "likedCars"),
          where("userId", "==", user.id),
          where("carId", "==", car.id)
        )
        const querySnapshot = await getDocs(q)
        querySnapshot.forEach(async (document) => {
          await deleteDoc(doc(db, "likedCars", document.id))
        })
        setLikedCars(prev => prev.filter(id => id !== car.id))
      } else {
        // Like
        await addDoc(collection(db, "likedCars"), {
          userId: user.id,
          carId: car.id,
          createdAt: new Date(),
        })
        setLikedCars(prev => [...prev, car.id])
        setLikedCarName(car.name)
        setShowLikeModal(true)
        setTimeout(() => setShowLikeModal(false), 2000)
      }
    } catch (error) {
      console.error("Error handling like:", error)
      Alert.alert("Lỗi", "Không thể xử lý yêu cầu. Vui lòng thử lại.")
    }
  }

  useEffect(() => {
    fetchLikedCars()
  }, [user])

  // Mỗi lần được mở từ Trang chủ (có `ts` mới) thì đặt lại tìm kiếm/bộ lọc rồi áp dụng tham số truyền sang
  useEffect(() => {
    if (!params.ts && !params.brand && !params.city) return

    const brandParam = typeof params.brand === "string" ? params.brand.trim().toLowerCase() : ""
    const matchedBrand = brandParam
      ? cars.find((car) => car.brand.toLowerCase() === brandParam)?.brand ?? null
      : null
    const cityParam = typeof params.city === "string" && CITIES.includes(params.city) ? params.city : null

    setSearchQuery("")
    setSelectedBrand(matchedBrand)
    setFilters({ ...EMPTY_FILTERS, city: cityParam })

    if (params.openFilter === "1") {
      setDraftFilters({ ...EMPTY_FILTERS, city: cityParam })
      setShowFilterModal(true)
    }

    if (params.focus === "1") {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 300)
      return () => clearTimeout(timer)
    }
  }, [params.ts, params.brand, params.city, params.focus, params.openFilter])

  const filteredCars = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase()
    const priceRange = PRICE_RANGES.find((range) => range.id === filters.priceRange)

    return cars.filter((car) => {
      if (!car) return false

      if (
        searchLower &&
        !(
          car.name.toLowerCase().includes(searchLower) ||
          car.brand.toLowerCase().includes(searchLower) ||
          car.model.toLowerCase().includes(searchLower)
        )
      ) {
        return false
      }

      if (selectedBrand && car.brand !== selectedBrand) return false
      if (filters.type && car.type !== filters.type) return false
      if (filters.fuel && car.fuel !== filters.fuel) return false
      if (filters.city && car.location !== filters.city) return false
      if (filters.minSeats && car.seats < filters.minSeats) return false
      if (priceRange && (car.pricePerDay < priceRange.min || car.pricePerDay >= priceRange.max)) return false

      return true
    })
  }, [searchQuery, selectedBrand, filters])

  const activeFilterCount = countActiveFilters(filters)
  const draftFilterCount = countActiveFilters(draftFilters)

  const openFilterModal = () => {
    setDraftFilters(filters)
    setShowFilterModal(true)
  }

  const applyFilters = () => {
    setFilters(draftFilters)
    setShowFilterModal(false)
  }

  const toggleDraft = <K extends keyof CarFilters>(key: K, value: CarFilters[K]) => {
    setDraftFilters((prev) => ({ ...prev, [key]: prev[key] === value ? null : value }))
  }

  const clearAll = () => {
    setSearchQuery("")
    setSelectedBrand(null)
    setFilters(EMPTY_FILTERS)
  }

  const handleBrandSelect = (brandName: string) => {
    if (selectedBrand === brandName) {
      // If clicking the same brand, clear the filter
      setSelectedBrand(null);
    } else {
      // Select the new brand
      setSelectedBrand(brandName);
    }
  }

  const renderBrandItem = ({ item }: { item: any }) => {
    const isSelected = selectedBrand === item.name
    return (
      <TouchableOpacity
        style={[styles.brandChip, isSelected && styles.brandChipActive]}
        onPress={() => handleBrandSelect(item.name)}
        activeOpacity={PRESS_OPACITY}
      >
        <Image source={item.logo} style={styles.brandLogoImg} resizeMode="contain" />
        <Text style={[styles.brandName, isSelected && styles.brandNameActive]}>{item.name}</Text>
      </TouchableOpacity>
    )
  }

  const getCardStyle = () => ({
    ...styles.carCard,
    maxWidth: selectedBrand ? width - SPACE.screen * 2 : (width - SPACE.screen * 2 - SPACE.md) / 2,
  });

  const renderCarItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={getCardStyle()}
      onPress={() => router.push({
        pathname: "/car-details/[id]",
        params: { id: item.id }
      })}
      activeOpacity={PRESS_OPACITY}
    >
      <View style={styles.carImageWrap}>
        <Image
          source={item.image}
          style={[styles.carImage, selectedBrand ? styles.carImageLarge : null]}
          resizeMode="cover"
        />
        <View style={styles.cardHeader}>
          <View style={styles.locationTag}>
            <Ionicons name="location" size={12} color={THEME_COLORS.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
          </View>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => handleLike(item)}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons
              name={likedCars.includes(item.id) ? "heart" : "heart-outline"}
              size={18}
              color={likedCars.includes(item.id) ? THEME_COLORS.danger : THEME_COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.carName} numberOfLines={1}>{item.name}</Text>

        <View style={styles.detailsRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={13} color={THEME_COLORS.accent} />
            <Text style={styles.metaText}>{typeof item.rating === "number" ? item.rating.toFixed(1) : "–"}</Text>
          </View>
          <View style={styles.seatsContainer}>
            <Ionicons name="people-outline" size={13} color={THEME_COLORS.textMuted} />
            <Text style={styles.metaText}>{item.seats} chỗ</Text>
          </View>
        </View>

        <Text style={styles.carPrice} numberOfLines={1}>{formatCurrency(item.pricePerDay)}/ngày</Text>

        <View style={styles.bottomRow}>
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      {/* Header trắng cố định: tiêu đề, ô tìm kiếm, chip hãng */}
      <View style={styles.topArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Tìm xe</Text>
          <TouchableOpacity
            style={styles.devsButton}
            onPress={() => router.push("/developers")}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons name="people-outline" size={16} color={THEME_COLORS.primary} />
            <Text style={styles.devsButtonText}>Nhóm phát triển</Text>
          </TouchableOpacity>
        </View>

        {/* Ô tìm kiếm */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, focusedField === "search" && styles.searchBarFocused]}>
            <Ionicons
              name="search"
              size={20}
              color={focusedField === "search" ? THEME_COLORS.primary : THEME_COLORS.textMuted}
            />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Tìm xe, hãng xe, mẫu xe..."
              placeholderTextColor={THEME_COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setFocusedField("search")}
              onBlur={() => setFocusedField(null)}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={PRESS_OPACITY}>
                <Ionicons name="close-circle" size={20} color={THEME_COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Top Brands */}
        <Text style={styles.brandsLabel}>Hãng xe phổ biến</Text>
        <FlatList
          key="brands"
          data={brands}
          renderItem={renderBrandItem}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.brandsRow}
        />
      </View>
      <View style={styles.divider} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Map View */}
        <View style={styles.mapSection}>
          <DummyMap />
        </View>

        {/* All Cars / Filtered Cars */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {selectedBrand ? `Xe ${selectedBrand}` : "Tất cả xe"} ({filteredCars.length})
            </Text>
            <TouchableOpacity
              style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
              onPress={openFilterModal}
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={activeFilterCount > 0 ? THEME_COLORS.primary : THEME_COLORS.textSecondary}
              />
              <Text style={[styles.filterText, activeFilterCount > 0 && styles.filterTextActive]}>
                Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Text>
            </TouchableOpacity>
          </View>

          {filteredCars.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="car-outline" size={32} color={THEME_COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Không tìm thấy xe phù hợp</Text>
              <Text style={styles.emptySubtitle}>Hãy thử đổi từ khoá hoặc bỏ bớt bộ lọc.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={clearAll} activeOpacity={PRESS_OPACITY}>
                <Text style={styles.emptyButtonText}>Xoá tìm kiếm và bộ lọc</Text>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            key={selectedBrand ? 'single' : 'double'}
            data={filteredCars}
            renderItem={renderCarItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={selectedBrand ? 1 : 2}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={selectedBrand ? null : styles.carRow}
          />
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.filterOverlay}>
          <TouchableOpacity style={styles.filterBackdrop} activeOpacity={1} onPress={() => setShowFilterModal(false)} />
          <View style={styles.filterSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Bộ lọc</Text>
              <TouchableOpacity
                style={styles.sheetCloseButton}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterLabel}>Loại xe</Text>
              <View style={styles.chipRow}>
                {CAR_TYPE_OPTIONS.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, draftFilters.type === type && styles.chipSelected]}
                    onPress={() => toggleDraft("type", type)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={[styles.chipText, draftFilters.type === type && styles.chipTextSelected]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Nhiên liệu</Text>
              <View style={styles.chipRow}>
                {FUEL_OPTIONS.map((fuel) => (
                  <TouchableOpacity
                    key={fuel}
                    style={[styles.chip, draftFilters.fuel === fuel && styles.chipSelected]}
                    onPress={() => toggleDraft("fuel", fuel)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={[styles.chipText, draftFilters.fuel === fuel && styles.chipTextSelected]}>{fuel}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Thành phố</Text>
              <View style={styles.chipRow}>
                {CITIES.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[styles.chip, draftFilters.city === city && styles.chipSelected]}
                    onPress={() => toggleDraft("city", city)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={[styles.chipText, draftFilters.city === city && styles.chipTextSelected]}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Số chỗ tối thiểu</Text>
              <View style={styles.chipRow}>
                {SEAT_OPTIONS.map((seats) => (
                  <TouchableOpacity
                    key={seats}
                    style={[styles.chip, draftFilters.minSeats === seats && styles.chipSelected]}
                    onPress={() => toggleDraft("minSeats", seats)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={[styles.chipText, draftFilters.minSeats === seats && styles.chipTextSelected]}>
                      Từ {seats} chỗ
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Giá thuê/ngày</Text>
              <View style={styles.chipRow}>
                {PRICE_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range.id}
                    style={[styles.chip, draftFilters.priceRange === range.id && styles.chipSelected]}
                    onPress={() => toggleDraft("priceRange", range.id)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={[styles.chipText, draftFilters.priceRange === range.id && styles.chipTextSelected]}>
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.filterFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => setDraftFilters(EMPTY_FILTERS)}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={styles.resetButtonText}>Đặt lại</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters} activeOpacity={PRESS_OPACITY}>
                <Text style={styles.applyButtonText}>
                  Áp dụng{draftFilterCount > 0 ? ` (${draftFilterCount})` : ""}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Like Car Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLikeModal}
        onRequestClose={() => setShowLikeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="heart" size={28} color={THEME_COLORS.danger} />
            </View>
            <Text style={styles.modalText}>Đã thêm {likedCarName} vào xe yêu thích!</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// Chiều cao thanh tab nổi (72) + khoảng cách đáy (20) + khoảng thở
const TAB_BAR_CLEARANCE = 120

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  topArea: {
    backgroundColor: THEME_COLORS.background,
    paddingBottom: SPACE.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.md,
  },
  title: {
    ...TYPOGRAPHY.h1,
  },
  devsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.primarySoft,
  },
  devsButtonText: {
    color: THEME_COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: SPACE.screen,
  },
  // Khung ô tìm kiếm (View bọc TextInput) theo UI.input
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: UI.input.height,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
    paddingHorizontal: SPACE.lg,
  },
  searchBarFocused: {
    ...UI.inputFocused,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    marginLeft: SPACE.md,
    fontSize: 15,
    color: THEME_COLORS.textPrimary,
  },
  brandsLabel: {
    ...TYPOGRAPHY.overline,
    paddingHorizontal: SPACE.screen,
    marginTop: SPACE.lg,
    marginBottom: SPACE.sm,
  },
  brandsRow: {
    paddingHorizontal: SPACE.screen,
    gap: SPACE.sm,
  },
  brandChip: {
    ...UI.chip,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
  },
  brandChipActive: {
    ...UI.chipActive,
  },
  brandLogoImg: {
    width: 22,
    height: 22,
  },
  brandName: {
    ...UI.chipText,
  },
  brandNameActive: {
    ...UI.chipTextActive,
  },
  divider: {
    ...UI.divider,
  },
  scrollContent: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE["2xl"],
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  mapSection: {
    marginBottom: SPACE.section,
  },
  section: {},
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACE.lg,
    gap: SPACE.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    flexShrink: 1,
  },
  filterButton: {
    ...UI.chip,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
  },
  filterText: {
    ...UI.chipText,
  },
  filterButtonActive: {
    ...UI.chipActive,
  },
  filterTextActive: {
    ...UI.chipTextActive,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACE.section,
    paddingHorizontal: SPACE.screen,
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
  emptyButton: {
    ...UI.secondaryButton,
    height: 44,
    marginTop: SPACE.xl,
    paddingHorizontal: SPACE.xl,
  },
  emptyButtonText: {
    ...UI.secondaryButtonText,
    fontSize: 14,
  },

  // Filter sheet
  filterOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  filterBackdrop: {
    flex: 1,
  },
  filterSheet: {
    backgroundColor: THEME_COLORS.surface,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.sm,
    paddingBottom: SPACE["3xl"],
    maxHeight: "85%",
    ...SHADOWS.raised,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.borderStrong,
    marginBottom: SPACE.md,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACE.sm,
  },
  filterTitle: {
    ...TYPOGRAPHY.h2,
  },
  sheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  filterLabel: {
    ...TYPOGRAPHY.overline,
    marginTop: SPACE["2xl"],
    marginBottom: SPACE.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE.sm,
  },
  chip: {
    ...UI.chip,
  },
  chipSelected: {
    ...UI.chipActive,
  },
  chipText: {
    ...UI.chipText,
  },
  chipTextSelected: {
    ...UI.chipTextActive,
  },
  filterFooter: {
    flexDirection: "row",
    gap: SPACE.md,
    marginTop: SPACE["2xl"],
  },
  resetButton: {
    ...UI.secondaryButton,
    flex: 1,
    paddingHorizontal: SPACE.lg,
  },
  resetButtonText: {
    ...UI.secondaryButtonText,
  },
  applyButton: {
    ...UI.primaryButton,
    flex: 2,
  },
  applyButtonText: {
    ...UI.primaryButtonText,
  },

  // Car card
  carCard: {
    ...UI.card,
    flex: 1,
    marginBottom: SPACE.md,
  },
  carImageWrap: {
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderTopLeftRadius: RADIUS.card - 1,
    borderTopRightRadius: RADIUS.card - 1,
    overflow: 'hidden',
  },
  cardHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACE.sm,
    gap: SPACE.xs,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    backgroundColor: THEME_COLORS.surface,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    gap: 3,
  },
  locationText: {
    color: THEME_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carImage: {
    width: '100%',
    height: 110,
  },
  carImageLarge: {
    height: 180,
  },
  cardContent: {
    padding: SPACE.md,
    flex: 1,
  },
  carName: {
    ...TYPOGRAPHY.bodyStrong,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACE.xs,
    gap: SPACE.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
  carPrice: {
    ...TYPOGRAPHY.price,
    fontSize: 15,
    marginTop: SPACE.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: SPACE.md,
  },
  conditionTag: {
    backgroundColor: THEME_COLORS.primarySoft,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  conditionText: {
    color: THEME_COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  arrowButton: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carRow: {
    gap: SPACE.md,
  },

  // Like modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACE.screen,
  },
  modalContent: {
    ...UI.card,
    ...SHADOWS.raised,
    paddingVertical: SPACE["2xl"],
    paddingHorizontal: SPACE.xl,
    alignItems: 'center',
    maxWidth: 320,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalText: {
    ...TYPOGRAPHY.bodyStrong,
    marginTop: SPACE.md,
    textAlign: 'center',
  },
})
