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

  const renderBrandItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.brandCard, selectedBrand === item.name && styles.selectedBrandCard]}
      onPress={() => handleBrandSelect(item.name)}
    >
      <Image source={item.logo} style={styles.brandLogoImg} resizeMode="contain" />
      <Text style={[styles.brandName, selectedBrand === item.name && styles.selectedBrandName]}>{item.name}</Text>
    </TouchableOpacity>
  )

  const getCardStyle = () => ({
    ...styles.carCard,
    maxWidth: selectedBrand ? width - 32 : (width - 40) / 2,
    height: selectedBrand ? 340 : 280, // Only increase height when brand is selected
  });

  const renderCarItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={getCardStyle()} 
      onPress={() => router.push({
        pathname: "/car-details/[id]",
        params: { id: item.id }
      })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.locationTag}>
          <Ionicons name="location" size={16} color="#fff" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => handleLike(item)}
        >
          <Ionicons 
            name={likedCars.includes(item.id) ? "heart" : "heart-outline"} 
            size={20} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>

      <Image source={item.image} style={styles.carImage} />
      
      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.carName}>{item.name}</Text>
          <Text style={styles.carPrice}>{formatCurrency(item.pricePerDay)}/ngày</Text>
        </View>
        
        <View style={styles.detailsRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFB700" />
            <Text style={styles.ratingText}>{typeof item.rating === "number" ? item.rating.toFixed(1) : "–"}</Text>
          </View>
          
          <View style={styles.seatsContainer}>
            <Ionicons name="people" size={16} color="#fff" />
            <Text style={styles.seatsText}>{item.seats} chỗ</Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.conditionTag}>
            <Text style={styles.conditionText}>TỰ LÁI</Text>
          </View>
          
          <View style={styles.arrowButton}>
            <Ionicons name="arrow-forward" size={20} color="#FFB700" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Blue Background Rectangle */}
      <View style={styles.blueBackground}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: "#ffffff" }]}>Tìm xe</Text>
          <TouchableOpacity 
            style={[styles.devsButton, { backgroundColor: "#ffffff" }]} 
            onPress={() => router.push("/developers")}
          >
            <Text style={[styles.devsButtonText, { color: "#1054CF" }]}>Nhóm phát triển</Text>
          </TouchableOpacity>
        </View>

        {/* Top Brands */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: "#ffffff" }]}>Hãng xe phổ biến</Text>
          <FlatList
            key="brands"
            data={brands}
            renderItem={renderBrandItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={4}
            scrollEnabled={false}
            contentContainerStyle={styles.brandsGrid}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Ô tìm kiếm */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#666666" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Tìm xe, hãng xe, mẫu xe..."
              placeholderTextColor="#999999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#999999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Map View */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bản đồ</Text>
          <DummyMap />
        </View>
        
        {/* All Cars / Filtered Cars */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedBrand ? `Xe ${selectedBrand}` : "Tất cả xe"} ({filteredCars.length})
            </Text>
            <TouchableOpacity
              style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
              onPress={openFilterModal}
            >
              <Ionicons name="options" size={20} color={activeFilterCount > 0 ? "#ffffff" : "#4169e1"} />
              <Text style={[styles.filterText, activeFilterCount > 0 && styles.filterTextActive]}>
                Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Text>
            </TouchableOpacity>
          </View>

          {filteredCars.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color="#adb5bd" />
              <Text style={styles.emptyTitle}>Không tìm thấy xe phù hợp</Text>
              <Text style={styles.emptySubtitle}>Hãy thử đổi từ khoá hoặc bỏ bớt bộ lọc.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={clearAll}>
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

        {/* Add bottom spacing */}
        <View style={styles.bottomSpacing} />
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
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Bộ lọc</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#000000" />
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
                  >
                    <Text style={[styles.chipText, draftFilters.priceRange === range.id && styles.chipTextSelected]}>
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.filterFooter}>
              <TouchableOpacity style={styles.resetButton} onPress={() => setDraftFilters(EMPTY_FILTERS)}>
                <Text style={styles.resetButtonText}>Đặt lại</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
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
            <Ionicons name="heart" size={40} color="#FF4B4B" />
            <Text style={styles.modalText}>Đã thêm {likedCarName} vào xe yêu thích!</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ededed",
    paddingHorizontal: 20, // Add this to maintain margins for other content
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, // Reduced from 60
    paddingVertical: 15, // Adjusted padding
    marginBottom: 10, // Added bottom margin
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },
  devsButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  devsButtonText: {
    color: "#1054CF",
    fontSize: 14,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#000000",
  },
  section: {
    paddingHorizontal: 10,
    marginBottom: 10, // Reduced spacing between sections
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 10, // Reduced from 15
    marginTop: 5, // Reduced from 10
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#4169e1",
    fontWeight: "600",
  },
  filterButtonActive: {
    backgroundColor: "#1054CF",
    borderColor: "#1054CF",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#343a40",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 4,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 14,
    backgroundColor: "#1054CF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterBackdrop: {
    flex: 1,
  },
  filterSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    maxHeight: "85%",
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#343a40",
    marginTop: 14,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dee2e6",
    backgroundColor: "#f8f9fa",
  },
  chipSelected: {
    backgroundColor: "#1054CF",
    borderColor: "#1054CF",
  },
  chipText: {
    fontSize: 13,
    color: "#495057",
  },
  chipTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  filterFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1054CF",
    alignItems: "center",
  },
  resetButtonText: {
    color: "#1054CF",
    fontWeight: "600",
    fontSize: 15,
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#1054CF",
    alignItems: "center",
  },
  applyButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
  brandsGrid: {
    paddingHorizontal: 4,
    paddingTop: 0, // Removed extra top padding
    paddingBottom: 5, // Added small bottom padding
  },
  brandCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    margin: 8,
    borderWidth: 1,
    borderColor: "transparent",
    maxWidth: (width - 80) / 4,
    height: (width - 80) / 4,
  },
  selectedBrandCard: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  brandLogoImg: {
    width: 28, // Smaller logo
    height: 28, // Smaller logo
    marginBottom: 4, // Reduced margin
  },
  brandName: {
    fontSize: 10, // Smaller font
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
  },
  selectedBrandName: {
    color: "#1054CF",
  },
  mapContainer: {
    height: 200,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  mapPlaceholder: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: "#999999",
  },
  carCard: {
    flex: 1,
    backgroundColor: '#1054CF',
    borderRadius: 16,
    margin: 8,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    height: 280, // Reduced from 260 to 240
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8, // Reduced from 12 to 8
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationText: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 4,
  },
  favoriteButton: {
    padding: 4,
  },
  carImage: {
    width: '100%',
    height: 100, // Reduced from 120 to 100
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 12,
    flex: 1,
    justifyContent: 'flex-start', // Changed from 'space-between' to 'flex-start'
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // Increased from 8 to 12
  },
  carName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  carPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFB700',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // Changed from marginVertical to marginBottom
    gap: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Removed marginTop and paddingTop
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#fff',
    marginLeft: 2,
    fontSize: 12, // Reduced from 14 to 12
  },
  conditionTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conditionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatsText: {
    color: '#fff',
    marginLeft: 2,
    fontSize: 12, // Reduced from 14 to 12
  },
  arrowButton: {
    backgroundColor: 'rgba(255, 183, 0, 0.2)',
    padding: 8,
    borderRadius: 16,
  },
  carRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    color: '#000000',
  },
  blueBackground: {
    backgroundColor: "#1054CF",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 8, // Reduced from 10
    paddingBottom: 5, // Reduced from 8
    marginLeft: -20,
    marginRight: -20,
    paddingHorizontal: 5,
    paddingTop: 10, // Reduced from 15
  },
  bottomSpacing: {
    height: 80, // Adjust this value based on your tab bar height
  },
})
