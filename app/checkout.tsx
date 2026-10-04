"use client"

import { useState } from "react"
import { type ViewStyle, View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList, Modal, TextInput, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { cars } from "../data/cars"
import { db } from "../config/firebase"
import { collection, addDoc } from "firebase/firestore"
import { useAuth } from "../hooks/useAuth"
import { formatCurrency } from "../utils/helpers"
import { PICKUP_LOCATIONS, VAT_RATE, PAYMENT_METHODS } from "../utils/constants"
import PaymentLogo from "../components/ui/PaymentLogo"
import { StatusBar } from "expo-status-bar"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"


// UI.input dùng cho View (ô chọn / khung tìm kiếm có icon)
const INPUT_BOX = UI.input as ViewStyle

const addOns = [
  { id: 1, name: "Định vị GPS", price: 100000, selected: false },
  { id: 2, name: "Ghế trẻ em", price: 150000, selected: false },
  { id: 3, name: "Bảo hiểm mở rộng", price: 250000, selected: false },
  { id: 4, name: "Bộ phát WiFi", price: 80000, selected: false },
]

// Add payment methods constant at the top with other constants
const paymentMethods: { id: PaymentMethod; name: string; subtitle: string }[] = [
  { id: PAYMENT_METHODS.CARD.id, name: PAYMENT_METHODS.CARD.label, subtitle: 'Thẻ ATM / Visa / Mastercard' },
  { id: PAYMENT_METHODS.MOMO.id, name: PAYMENT_METHODS.MOMO.label, subtitle: 'Thanh toán qua ví MoMo' },
  { id: PAYMENT_METHODS.ZALOPAY.id, name: PAYMENT_METHODS.ZALOPAY.label, subtitle: 'Thanh toán qua ví ZaloPay' },
]

// Add type for payment routes
type PaymentRoute = '/credit-card' | '/momo' | '/zalopay';

// Danh sách điểm nhận xe
const LOCATIONS = PICKUP_LOCATIONS

// Add rental durations constant
const DURATIONS = [
  { id: 1, days: 1, label: '1 ngày' },
  { id: 2, days: 2, label: '2 ngày' },
  { id: 3, days: 3, label: '3 ngày' },
  { id: 4, days: 4, label: '4 ngày' },
]

// Add this type for payment methods
type PaymentMethod = 'momo' | 'zalopay' | 'credit-card';

export default function CheckoutScreen() {
  const { carId } = useLocalSearchParams<{ carId: string }>()
  const car = cars.find(c => c.id === carId)
  const { user } = useAuth()

  const [selectedAddOns, setSelectedAddOns] = useState(addOns)
  // Update payment state to use string IDs
  const [selectedPayment, setSelectedPayment] = useState<string>('credit-card')
  const [pickupDate, setPickupDate] = useState("25/12/2024")
  const [dropoffDate, setDropoffDate] = useState("28/12/2024")
  const [pickupLocation, setPickupLocation] = useState(LOCATIONS[0])
  // Add state for rental duration
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0])

  // Add these states
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [locationSearch, setLocationSearch] = useState("")
  const [filteredLocations, setFilteredLocations] = useState<string[]>(LOCATIONS)

  // Add these states at the top of your component
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [errorTitle, setErrorTitle] = useState("")
  const [focusedField, setFocusedField] = useState<string | null>(null)

  if (!car) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.priceLabel}>Không tìm thấy xe</Text>
      </View>
    )
  }

  // Update the price calculations
  const basePrice = car.pricePerDay
  const subtotal = basePrice * selectedDuration.days // Use selected duration
  const addOnTotal = selectedAddOns.filter((addon) => addon.selected).reduce((sum, addon) => sum + addon.price, 0)
  const tax = Math.round((subtotal + addOnTotal) * VAT_RATE)
  const total = subtotal + addOnTotal + tax

  const toggleAddOn = (id: number) => {
    setSelectedAddOns((prev) =>
      prev.map((addon) => (addon.id === id ? { ...addon, selected: !addon.selected } : addon)),
    )
  }

  // Update handleConfirmBooking function
  const handleConfirmBooking = async () => {
    if (!user) {
      setErrorTitle("Bạn chưa đăng nhập")
      setErrorMessage("Vui lòng đăng nhập để đặt xe nhé.")
      setShowErrorModal(true)
      return
    }

    if (!selectedPayment) {
      setErrorTitle("Chưa chọn phương thức thanh toán")
      setErrorMessage("Vui lòng chọn phương thức thanh toán để tiếp tục.")
      setShowErrorModal(true)
      return
    }

    if (!selectedDuration) {
      setErrorTitle("Chưa chọn thời gian thuê")
      setErrorMessage("Vui lòng chọn thời gian thuê xe.")
      setShowErrorModal(true)
      return
    }

    try {
      // Create booking data
      const bookingData = {
        userId: user.id,
        carId: car.id,
        carName: car.name,
        carImage: car.image,
        duration: selectedDuration.days,
        location: pickupLocation,
        status: "Pending",
        price: total,
        selectedAddOns: selectedAddOns.filter(addon => addon.selected),
        createdAt: new Date(),
      }

      // Save booking to Firestore first
      const bookingRef = await addDoc(collection(db, "bookings"), bookingData)

      // Navigate with booking ID and amount
      const navigateToPayment = (method: PaymentMethod) => {
        router.push({
          pathname: `/${method}`,
          params: { 
            amount: total.toString(),
            bookingId: bookingRef.id
          }
        })
      }

      switch (selectedPayment) {
        case 'momo':
          navigateToPayment('momo')
          break
        case 'zalopay':
          navigateToPayment('zalopay')
          break
        case 'credit-card':
          navigateToPayment('credit-card')
          break
        default:
          Alert.alert("Lỗi", "Phương thức thanh toán không hợp lệ")
      }
    } catch (error) {
      console.error("Error creating booking:", error)
      setErrorTitle("Đặt xe không thành công")
      setErrorMessage("Không thể tạo đơn đặt xe. Vui lòng thử lại.")
      setShowErrorModal(true)
    }
  }

  // Add this function to filter locations
  const filterLocations = (text: string) => {
    const filtered = LOCATIONS.filter(location =>
      location.toLowerCase().includes(text.toLowerCase())
    )
    setFilteredLocations(filtered)
    setLocationSearch(text)
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="arrow-back" size={22} color={THEME_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận đặt xe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        {/* Car Summary */}
        <View style={styles.card}>
          <Text style={styles.overline}>Thông tin đặt xe</Text>
          <View style={styles.carSummary}>
            <View style={styles.carThumb}>
              <Image source={car.image} style={styles.carThumbImage} resizeMode="contain" />
            </View>
            <View style={styles.carDetails}>
              <Text style={styles.carName} numberOfLines={1}>{car.name}</Text>
              <Text style={styles.carBrand}>{car.brand}</Text>
              <View style={styles.carLocationRow}>
                <Ionicons name="location-outline" size={14} color={THEME_COLORS.textMuted} />
                <Text style={styles.carLocation}>{car.location}</Text>
              </View>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.carPriceRow}>
            <Text style={styles.priceLabel}>Giá thuê</Text>
            <Text style={styles.carPrice}>{formatCurrency(car.pricePerDay)}/ngày</Text>
          </View>
        </View>

        {/* Duration */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thời gian thuê</Text>
          <View style={styles.durationContainer}>
            {DURATIONS.map((duration) => (
              <TouchableOpacity
                key={duration.id}
                style={[
                  styles.durationBox,
                  selectedDuration.id === duration.id && styles.selectedDurationBox
                ]}
                onPress={() => setSelectedDuration(duration)}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={[
                  styles.durationDays,
                  selectedDuration.id === duration.id && styles.selectedDurationText
                ]}>
                  {duration.days}
                </Text>
                <Text style={[
                  styles.durationLabel,
                  selectedDuration.id === duration.id && styles.selectedDurationText
                ]}>
                  ngày
                </Text>
                <Text
                  style={[
                    styles.durationPrice,
                    selectedDuration.id === duration.id && styles.selectedDurationText
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatCurrency(car.pricePerDay * duration.days)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Điểm nhận xe</Text>
          <TouchableOpacity
            style={styles.locationInput}
            onPress={() => setShowLocationModal(true)}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons name="location-outline" size={20} color={THEME_COLORS.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{pickupLocation}</Text>
            <Ionicons name="chevron-down" size={18} color={THEME_COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Add-ons */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dịch vụ thêm</Text>
          {selectedAddOns.map((addon, index) => (
            <TouchableOpacity
              key={addon.id}
              style={[styles.addonItem, index === selectedAddOns.length - 1 && styles.lastOption, addon.selected && styles.optionSelected]}
              onPress={() => toggleAddOn(addon.id)}
              activeOpacity={PRESS_OPACITY}
            >
              <View style={styles.addonInfo}>
                <Text style={[styles.addonName, addon.selected && styles.optionNameSelected]}>{addon.name}</Text>
                <Text style={styles.addonPrice}>{formatCurrency(addon.price)}/chuyến</Text>
              </View>
              <View style={[styles.checkbox, addon.selected && styles.checkedBox]}>
                {addon.selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          {paymentMethods.map((method, index) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                index === paymentMethods.length - 1 && styles.lastOption,
                selectedPayment === method.id && styles.optionSelected
              ]}
              onPress={() => setSelectedPayment(method.id)}
              activeOpacity={PRESS_OPACITY}
            >
              <View style={styles.paymentInfo}>
                <PaymentLogo method={method.id} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.paymentName,
                    selectedPayment === method.id && styles.optionNameSelected
                  ]}>
                    {method.name}
                  </Text>
                  <Text style={styles.paymentSubtitle}>{method.subtitle}</Text>
                </View>
              </View>
              <View style={[
                styles.radio,
                selectedPayment === method.id && styles.selectedRadio
              ]}>
                {selectedPayment === method.id && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Price Breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chi tiết giá</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tiền thuê xe ({selectedDuration.days} ngày)</Text>
            <Text style={styles.priceValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {selectedAddOns
            .filter((addon) => addon.selected)
            .map((addon) => (
              <View key={addon.id} style={styles.priceRow}>
                <Text style={styles.priceLabel}>{addon.name}</Text>
                <Text style={styles.priceValue}>{formatCurrency(addon.price)}</Text>
              </View>
            ))}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Thuế VAT ({Math.round(VAT_RATE * 100)}%)</Text>
            <Text style={styles.priceValue}>{formatCurrency(tax)}</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <SafeAreaView edges={["bottom"]} style={styles.confirmContainer}>
        <View style={styles.confirmInner}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!selectedPayment || !selectedDuration) && styles.disabledButton
            ]}
            onPress={handleConfirmBooking}
            disabled={!selectedPayment || !selectedDuration}
            activeOpacity={PRESS_OPACITY}
          >
            <Text style={styles.continueButtonText}>
              Tiếp tục thanh toán • {formatCurrency(total)}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationModal}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn điểm nhận xe</Text>
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowLocationModal(false)} activeOpacity={PRESS_OPACITY}>
                <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchBox, focusedField === "search" && styles.inputFocused]}>
              <Ionicons name="search" size={18} color={focusedField === "search" ? THEME_COLORS.primary : THEME_COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm điểm nhận xe..."
                placeholderTextColor={THEME_COLORS.textMuted}
                value={locationSearch}
                onChangeText={filterLocations}
                onFocus={() => setFocusedField("search")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <FlatList
              data={filteredLocations}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const active = item === pickupLocation
                return (
                  <TouchableOpacity
                    style={[styles.locationItem, active && styles.optionSelected]}
                    onPress={() => {
                      setPickupLocation(item)
                      setShowLocationModal(false)
                    }}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <View style={[styles.locationIcon, active && styles.locationIconActive]}>
                      <Ionicons name="location-outline" size={18} color={active ? THEME_COLORS.primary : THEME_COLORS.textSecondary} />
                    </View>
                    <Text style={[styles.locationItemText, active && styles.optionNameSelected]}>{item}</Text>
                    {active && <Ionicons name="checkmark" size={18} color={THEME_COLORS.primary} />}
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={[styles.modalOverlay, styles.modalOverlayCenter]}>
          <View style={styles.errorModal}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle-outline" size={32} color={THEME_COLORS.warning} />
            </View>
            <Text style={styles.errorTitle}>{errorTitle}</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => setShowErrorModal(false)}
              activeOpacity={PRESS_OPACITY}
            >
              <Text style={styles.errorButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE["2xl"],
    paddingBottom: SPACE.section,
    gap: SPACE["2xl"],
  },
  card: {
    ...UI.card,
    padding: SPACE.lg,
  },
  overline: {
    ...TYPOGRAPHY.overline,
    marginBottom: SPACE.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACE.lg,
  },
  carSummary: {
    flexDirection: "row",
    alignItems: "center",
  },
  carThumb: {
    width: 96,
    height: 68,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACE.md,
  },
  carThumbImage: {
    width: 84,
    height: 56,
  },
  carDetails: {
    flex: 1,
  },
  carName: {
    ...TYPOGRAPHY.h3,
    marginBottom: 2,
  },
  carBrand: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
  },
  carLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  carLocation: {
    ...TYPOGRAPHY.caption,
    marginLeft: SPACE.xs,
  },
  cardDivider: {
    ...UI.divider,
    marginVertical: SPACE.lg,
  },
  carPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  carPrice: {
    ...TYPOGRAPHY.price,
  },
  locationInput: {
    ...INPUT_BOX,
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    ...TYPOGRAPHY.bodyStrong,
    marginLeft: SPACE.md,
    flex: 1,
  },
  lastOption: {
    marginBottom: 0,
  },
  optionSelected: {
    borderColor: THEME_COLORS.primary,
    backgroundColor: THEME_COLORS.primarySoft,
  },
  optionNameSelected: {
    color: THEME_COLORS.primary,
  },
  addonItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    marginBottom: SPACE.sm,
  },
  addonInfo: {
    flex: 1,
  },
  addonName: {
    ...TYPOGRAPHY.bodyStrong,
    marginBottom: 2,
  },
  addonPrice: {
    ...TYPOGRAPHY.caption,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: THEME_COLORS.borderStrong,
    backgroundColor: THEME_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkedBox: {
    backgroundColor: THEME_COLORS.primary,
    borderColor: THEME_COLORS.primary,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.lg,
    backgroundColor: THEME_COLORS.surface,
    borderRadius: RADIUS.control,
    marginBottom: SPACE.sm,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  paymentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginRight: SPACE.md,
  },
  paymentName: {
    ...TYPOGRAPHY.bodyStrong,
  },
  paymentSubtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: THEME_COLORS.borderStrong,
    backgroundColor: THEME_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadio: {
    borderColor: THEME_COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primary,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACE.sm,
  },
  priceLabel: {
    ...TYPOGRAPHY.body,
    flex: 1,
    marginRight: SPACE.md,
  },
  priceValue: {
    ...TYPOGRAPHY.bodyStrong,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
    marginTop: SPACE.sm,
    paddingTop: SPACE.lg,
  },
  totalLabel: {
    ...TYPOGRAPHY.h3,
  },
  totalValue: {
    ...TYPOGRAPHY.price,
    fontSize: 20,
  },
  confirmContainer: {
    backgroundColor: THEME_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
  },
  confirmInner: {
    paddingHorizontal: SPACE.screen,
    paddingVertical: SPACE.md,
  },
  continueButton: {
    ...UI.primaryButton,
  },
  continueButtonText: {
    ...UI.primaryButtonText,
  },
  disabledButton: {
    backgroundColor: THEME_COLORS.borderStrong,
    boxShadow: "none",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACE.screen,
  },
  locationModal: {
    backgroundColor: THEME_COLORS.surface,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACE.screen,
    paddingBottom: SPACE["3xl"],
    maxHeight: '80%',
    ...SHADOWS.raised,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.border,
    marginTop: SPACE.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
  },
  searchBox: {
    ...INPUT_BOX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE.md,
    marginBottom: SPACE.lg,
  },
  inputFocused: {
    ...UI.inputFocused,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: SPACE.sm,
    fontSize: 15,
    color: THEME_COLORS.textPrimary,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: SPACE.xs,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIconActive: {
    backgroundColor: THEME_COLORS.surface,
  },
  locationItemText: {
    ...TYPOGRAPHY.body,
    color: THEME_COLORS.textPrimary,
    marginLeft: SPACE.md,
    flex: 1,
  },
  errorModal: {
    backgroundColor: THEME_COLORS.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACE["2xl"],
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...SHADOWS.raised,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.lg,
  },
  errorTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.sm,
    textAlign: 'center',
  },
  errorMessage: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginBottom: SPACE["2xl"],
  },
  errorButton: {
    ...UI.primaryButton,
    alignSelf: 'stretch',
  },
  errorButtonText: {
    ...UI.primaryButtonText,
  },
  durationContainer: {
    flexDirection: "row",
    gap: SPACE.sm,
  },
  durationBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.xs,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surface,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  selectedDurationBox: {
    backgroundColor: THEME_COLORS.primarySoft,
    borderColor: THEME_COLORS.primary,
  },
  durationDays: {
    ...TYPOGRAPHY.h2,
  },
  durationLabel: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACE.xs,
  },
  durationPrice: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME_COLORS.textSecondary,
  },
  selectedDurationText: {
    color: THEME_COLORS.primary,
  },
})
