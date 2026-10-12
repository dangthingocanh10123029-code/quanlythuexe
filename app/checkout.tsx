"use client"

import { useEffect, useState } from "react"
import { type ViewStyle, View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Modal, Image, TextInput, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useCar, getCarImage } from "../hooks/useCars"
import { useAuth } from "../hooks/useAuth"
import { useBusyCarIds } from "../hooks/useCars"
import { useLicense } from "../hooks/useLicense"
import { calcBookingPrice, daysBetween } from "../utils/booking"
import { createBooking, isFirstBooking } from "../utils/bookingActions"
import { formatCurrency } from "../utils/helpers"
import { confirmDialog } from "../utils/dialog"
import { PICKUP_LOCATIONS, VAT_RATE } from "../utils/constants"
import { StatusBar } from "expo-status-bar"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"
import { AppHeader, CompensationPolicy, EmptyState, PrimaryButton, SearchBar } from "../components"
import DateTimeRangePicker from "../components/DateTimeRangePicker"


// UI.input dùng cho View (ô chọn / khung tìm kiếm có icon)
const INPUT_BOX = UI.input as ViewStyle

const addOns = [
  { id: 1, name: "Định vị GPS", price: 100000, selected: false },
  { id: 2, name: "Ghế trẻ em", price: 150000, selected: false },
  { id: 3, name: "Bảo hiểm mở rộng", price: 250000, selected: false },
  { id: 4, name: "Bộ phát WiFi", price: 80000, selected: false },
]

// Danh sách điểm nhận xe
const LOCATIONS = PICKUP_LOCATIONS

// Mặc định nhận xe 09:00 ngày mai
const defaultPickup = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d
}

const parseDateParam = (value?: string) => {
  const d = value ? new Date(value) : null
  return d && !isNaN(d.getTime()) ? d : null
}

export default function CheckoutScreen() {
  // `pickup`, `return`: ISO string truyền từ bộ chọn ngày ở Home/Search → Chi tiết xe
  const params = useLocalSearchParams<{ carId: string; pickup?: string; return?: string }>()
  const { carId } = params
  const { car, loading: carLoading } = useCar(carId)
  const { user } = useAuth()
  const { license } = useLicense()
  const licenseOk = license?.status === "pending" || license?.status === "verified"

  const [selectedAddOns, setSelectedAddOns] = useState(addOns)
  const [pickupAt, setPickupAt] = useState<Date>(() => parseDateParam(params.pickup) ?? defaultPickup())
  const [returnAt, setReturnAt] = useState<Date>(
    () => parseDateParam(params.return) ?? new Date((parseDateParam(params.pickup) ?? defaultPickup()).getTime() + 86_400_000),
  )
  const [pickupLocation, setPickupLocation] = useState(LOCATIONS[0])
  const [returnLocation, setReturnLocation] = useState(LOCATIONS[0])
  const [promoCode, setPromoCode] = useState("")
  const [agreedPolicy, setAgreedPolicy] = useState(false)
  const [showPolicyModal, setShowPolicyModal] = useState(false)
  const [promoDraft, setPromoDraft] = useState("")
  const [firstBooking, setFirstBooking] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Add these states
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [locationTarget, setLocationTarget] = useState<"pickup" | "return">("pickup")
  const [locationSearch, setLocationSearch] = useState("")
  const [filteredLocations, setFilteredLocations] = useState<string[]>(LOCATIONS)

  // Add these states at the top of your component
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [errorTitle, setErrorTitle] = useState("")

  // Điều kiện mã FIRST20 / WELCOME25 (chỉ để xem trước giá; createBooking kiểm tra lại)
  useEffect(() => {
    if (user?.id) isFirstBooking(user.id).then(setFirstBooking).catch(() => setFirstBooking(false))
  }, [user?.id])

  // Xe đã bị giữ trong khoảng ngày đang chọn
  const dateConflict = useBusyCarIds(pickupAt, returnAt).includes(carId)

  if (!car) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <AppHeader title="Xác nhận đặt xe" onBack={() => router.back()} />
        <View style={styles.center}>
          {carLoading ? (
            <ActivityIndicator size="large" color={THEME_COLORS.primary} />
          ) : (
            <EmptyState
              image="results"
              title="Không tìm thấy xe"
              description="Xe không tồn tại hoặc đã bị gỡ khỏi danh sách."
              actionLabel="Xem xe khác"
              onAction={() => router.replace("/(tabs)/search")}
            />
          )}
        </View>
      </SafeAreaView>
    )
  }

  const days = daysBetween(pickupAt, returnAt)
  const chosenAddOns = selectedAddOns.filter((addon) => addon.selected)
  // { subtotal, addOnTotal, discount, tax, total, promoError }
  const price = calcBookingPrice({
    pricePerDay: car.pricePerDay,
    days,
    addOns: chosenAddOns,
    promoCode,
    isFirstBooking: firstBooking,
    pickupDate: pickupAt,
  })
  const { subtotal, tax, total } = price

  const toggleAddOn = (id: number) => {
    setSelectedAddOns((prev) =>
      prev.map((addon) => (addon.id === id ? { ...addon, selected: !addon.selected } : addon)),
    )
  }

  const showError = (title: string, message: string) => {
    setErrorTitle(title)
    setErrorMessage(message)
    setShowErrorModal(true)
  }

  const goToLicense = (message: string) =>
    confirmDialog("Cần giấy phép lái xe", message, "Cập nhật GPLX", () => router.push("/profile/license"), {
      cancelText: "Để sau",
    })

  // Gửi yêu cầu đặt xe (đơn "Chờ xác nhận"); thanh toán sau khi RENTO xác nhận (D2)
  const handleConfirmBooking = async () => {
    if (!user) {
      showError("Bạn chưa đăng nhập", "Vui lòng đăng nhập để đặt xe nhé.")
      return
    }
    if (!licenseOk) {
      goToLicense("Bạn cần gửi giấy phép lái xe (GPLX) trước khi đặt xe.")
      return
    }

    setSubmitting(true)
    try {
      const bookingId = await createBooking({
        uid: user.id,
        car,
        pickupDate: pickupAt,
        returnDate: returnAt,
        location: pickupLocation,
        returnLocation,
        addOns: chosenAddOns,
        promoCode,
        agreedPolicy,
      })
      router.replace({ pathname: "/booking/[id]", params: { id: bookingId } })
    } catch (error: any) {
      console.error("Error creating booking:", error)
      if (error?.code === "license-required") goToLicense(error.message)
      else showError("Đặt xe không thành công", error?.message || "Không thể tạo đơn đặt xe. Vui lòng thử lại.")
    } finally {
      setSubmitting(false)
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
      <AppHeader title="Xác nhận đặt xe" onBack={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        {/* Car Summary */}
        <View style={styles.card}>
          <Text style={styles.overline}>Thông tin đặt xe</Text>
          <View style={styles.carSummary}>
            <View style={styles.carThumb}>
              <Image source={getCarImage(car)} style={styles.carThumbImage} resizeMode="contain" />
            </View>
            <View style={styles.carDetails}>
              <Text style={styles.carName} numberOfLines={1}>{car.name}</Text>
              <Text style={styles.carBrand} numberOfLines={1}>{car.brand}</Text>
              <View style={styles.carLocationRow}>
                <Ionicons name="location-outline" size={14} color={THEME_COLORS.textMuted} />
                <Text style={styles.carLocation} numberOfLines={1}>{car.location}</Text>
              </View>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.carPriceRow}>
            <Text style={styles.priceLabel}>Giá thuê</Text>
            <Text style={styles.carPrice}>{formatCurrency(car.pricePerDay)}/ngày</Text>
          </View>
        </View>

        {/* Rental dates */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thời gian thuê</Text>
          <DateTimeRangePicker
            pickupAt={pickupAt}
            returnAt={returnAt}
            onPickupChange={setPickupAt}
            onReturnChange={setReturnAt}
          />
          <View style={styles.durationSummary}>
            <Ionicons name="time-outline" size={18} color={THEME_COLORS.primary} />
            <Text style={styles.durationSummaryText}>Tổng thời gian thuê: {days} ngày</Text>
          </View>
          {dateConflict ? (
            <View style={styles.conflictMessage}>
              <Ionicons name="alert-circle" size={19} color={THEME_COLORS.danger} />
              <Text style={styles.conflictText}>Xe đã có lịch thuê trong khoảng thời gian này. Bạn vui lòng chọn thời gian khác.</Text>
            </View>
          ) : null}
        </View>

        {/* Location */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Điểm nhận và trả xe</Text>
          <Text style={styles.fieldLabel}>Điểm nhận xe</Text>
          <TouchableOpacity
            style={styles.locationInput}
            onPress={() => {
              setLocationTarget("pickup")
              setShowLocationModal(true)
            }}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons name="location-outline" size={20} color={THEME_COLORS.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{pickupLocation}</Text>
            <Ionicons name="chevron-down" size={18} color={THEME_COLORS.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.fieldLabel, styles.returnLocationLabel]}>Điểm trả xe</Text>
          <TouchableOpacity
            style={styles.locationInput}
            onPress={() => {
              setLocationTarget("return")
              setShowLocationModal(true)
            }}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons name="flag-outline" size={20} color={THEME_COLORS.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{returnLocation}</Text>
            <Ionicons name="chevron-down" size={18} color={THEME_COLORS.textMuted} />
          </TouchableOpacity>
          <Text style={styles.locationHint}>Điểm trả mặc định giống điểm nhận xe.</Text>
        </View>

        {/* Promo code */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mã giảm giá</Text>
          <View style={styles.promoRow}>
            <TextInput
              style={[styles.promoInput, !!price.promoError && styles.promoInputError]}
              value={promoDraft}
              onChangeText={setPromoDraft}
              onSubmitEditing={() => setPromoCode(promoDraft.trim().toUpperCase())}
              placeholder="Nhập mã giảm giá"
              placeholderTextColor={THEME_COLORS.textMuted}
              autoCapitalize="characters"
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.applyPromoButton}
              onPress={() => setPromoCode(promoDraft.trim().toUpperCase())}
              activeOpacity={PRESS_OPACITY}
            >
              <Text style={styles.applyPromoText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
          {price.promoError ? (
            <Text style={styles.promoError}>{price.promoError}</Text>
          ) : promoCode && price.discount > 0 ? (
            <View style={styles.promoSuccess}>
              <Ionicons name="checkmark-circle" size={17} color={THEME_COLORS.success} />
              <Text style={styles.promoSuccessText}>Đã áp dụng mã {promoCode}.</Text>
            </View>
          ) : null}
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
                {addon.selected && <Ionicons name="checkmark" size={14} color={THEME_COLORS.textInverse} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chính sách đền bù</Text>
          <Text style={styles.policyDescription}>
            Vui lòng xem chính sách trước khi gửi yêu cầu đặt xe.
          </Text>
          <TouchableOpacity
            style={[styles.policyAgreement, agreedPolicy && styles.policyAgreementActive]}
            onPress={() => setAgreedPolicy((value) => !value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedPolicy }}
            activeOpacity={PRESS_OPACITY}
          >
            <View style={[styles.checkbox, agreedPolicy && styles.checkedBox]}>
              {agreedPolicy ? <Ionicons name="checkmark" size={14} color={THEME_COLORS.textInverse} /> : null}
            </View>
            <Text style={styles.policyAgreementText}>Tôi đã đọc và đồng ý chính sách đền bù</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewPolicyButton}
            onPress={() => setShowPolicyModal(true)}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons name="document-text-outline" size={18} color={THEME_COLORS.primary} />
            <Text style={styles.viewPolicyText}>Xem chính sách</Text>
            <Ionicons name="chevron-forward" size={18} color={THEME_COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Price Breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chi tiết giá</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tiền thuê xe ({days} ngày)</Text>
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
            <Text style={[styles.priceLabel, price.discount > 0 && styles.discountLabel]}>Giảm giá</Text>
            <Text style={[styles.priceValue, price.discount > 0 && styles.discountValue]}>
              {price.discount > 0 ? "−" : ""}{formatCurrency(price.discount)}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Thuế VAT ({Math.round(VAT_RATE * 100)}%)</Text>
            <Text style={styles.priceValue}>{formatCurrency(tax)}</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
          <View style={styles.depositRow}>
            <View style={styles.depositIcon}>
              <Ionicons name="shield-checkmark-outline" size={18} color={THEME_COLORS.primary} />
            </View>
            <View style={styles.depositContent}>
              <Text style={styles.depositLabel}>Tiền cọc (trả khi nhận xe)</Text>
              <Text style={styles.depositHint}>Khoản này không cộng vào tổng thanh toán online.</Text>
            </View>
            <Text style={styles.depositValue}>{formatCurrency(car.deposit)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <SafeAreaView edges={["bottom"]} style={styles.confirmContainer}>
        <View style={styles.confirmInner}>
          <PrimaryButton
            title={`Gửi yêu cầu đặt xe • ${formatCurrency(total)}`}
            onPress={handleConfirmBooking}
            disabled={dateConflict || !agreedPolicy}
            loading={submitting}
            icon="arrow-forward"
          />
        </View>
      </SafeAreaView>

      <Modal
        visible={showPolicyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.policyModal}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chính sách đền bù</Text>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowPolicyModal(false)}
                accessibilityLabel="Đóng chính sách đền bù"
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.policyModalContent}>
              <CompensationPolicy />
            </ScrollView>
          </View>
        </View>
      </Modal>

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
              <Text style={styles.modalTitle}>Chọn điểm {locationTarget === "pickup" ? "nhận" : "trả"} xe</Text>
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowLocationModal(false)} activeOpacity={PRESS_OPACITY}>
                <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <SearchBar
              value={locationSearch}
              onChangeText={filterLocations}
              placeholder={`Tìm điểm ${locationTarget === "pickup" ? "nhận" : "trả"} xe...`}
              containerStyle={styles.searchBox}
            />
            <FlatList
              data={filteredLocations}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const active = item === (locationTarget === "pickup" ? pickupLocation : returnLocation)
                return (
                  <TouchableOpacity
                    style={[styles.locationItem, active && styles.optionSelected]}
                    onPress={() => {
                      if (locationTarget === "pickup") {
                        setReturnLocation((current) => current === pickupLocation ? item : current)
                        setPickupLocation(item)
                      } else {
                        setReturnLocation(item)
                      }
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
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACE.screen,
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
    flexShrink: 1,
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
  fieldLabel: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.textSecondary,
    marginBottom: SPACE.sm,
  },
  returnLocationLabel: {
    marginTop: SPACE.lg,
  },
  locationText: {
    ...TYPOGRAPHY.bodyStrong,
    marginLeft: SPACE.md,
    flex: 1,
  },
  locationHint: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACE.sm,
  },
  promoRow: {
    flexDirection: "row",
    gap: SPACE.sm,
  },
  promoInput: {
    ...UI.input,
    flex: 1,
    textTransform: "uppercase",
  },
  promoInputError: {
    borderColor: THEME_COLORS.danger,
  },
  applyPromoButton: {
    ...UI.secondaryButton,
    height: UI.input.height,
    paddingHorizontal: SPACE.lg,
  },
  applyPromoText: {
    ...UI.secondaryButtonText,
    color: THEME_COLORS.primary,
    fontSize: 14,
  },
  promoError: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.danger,
    marginTop: SPACE.sm,
  },
  promoSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
    marginTop: SPACE.sm,
  },
  promoSuccessText: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.success,
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
  policyDescription: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    marginBottom: SPACE.md,
  },
  policyAgreement: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surface,
  },
  policyAgreementActive: {
    borderColor: THEME_COLORS.primary,
    backgroundColor: THEME_COLORS.primarySoft,
  },
  policyAgreementText: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
    flex: 1,
  },
  viewPolicyButton: {
    ...UI.secondaryButton,
    marginTop: SPACE.md,
    height: 44,
    flexDirection: "row",
    gap: SPACE.sm,
  },
  viewPolicyText: {
    ...UI.secondaryButtonText,
    color: THEME_COLORS.primary,
    flex: 1,
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
  discountLabel: {
    ...TYPOGRAPHY.body,
    color: THEME_COLORS.success,
  },
  discountValue: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.success,
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
  depositRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    marginTop: SPACE.lg,
    padding: SPACE.md,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.primarySubtle,
  },
  depositIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME_COLORS.primarySoft,
  },
  depositContent: {
    flex: 1,
  },
  depositLabel: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
  },
  depositHint: {
    ...TYPOGRAPHY.caption,
    marginTop: 1,
  },
  depositValue: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.primary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME_COLORS.overlay,
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
  policyModal: {
    backgroundColor: THEME_COLORS.surface,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACE.screen,
    paddingBottom: SPACE["3xl"],
    height: "88%",
    ...SHADOWS.raised,
  },
  policyModalContent: {
    paddingBottom: SPACE["2xl"],
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
    marginBottom: SPACE.lg,
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
  durationSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    marginTop: SPACE.lg,
  },
  durationSummaryText: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.primary,
  },
  conflictMessage: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE.sm,
    marginTop: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.dangerSoft,
  },
  conflictText: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.danger,
    flex: 1,
  },
})
