"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Image, Alert, Modal, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import DateTimePicker from "@react-native-community/datetimepicker"
import { db } from "../../config/firebase"
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { useAuth } from "../../hooks/useAuth"
import { formatCurrency, formatDate } from "../../utils/helpers"
import { getBookingStatusLabel, PAYMENT_METHODS } from "../../utils/constants"
import { cars } from "../../data/cars"
import PaymentLogo from "../../components/ui/PaymentLogo"
import { StatusBar } from "expo-status-bar"
import type { ViewStyle } from "react-native"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from "../../utils/theme"

// Update the interfaces section
interface AddOn {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

interface Payment {
  // Đơn cũ có thể còn lưu 'GCash' | 'PayPal' | 'Credit Card'
  method: 'MoMo' | 'ZaloPay' | 'Thẻ ngân hàng' | 'GCash' | 'PayPal' | 'Credit Card';
  amount: number;
  transactionId: string;
  paidAt: Date;
  status: 'Completed' | 'Failed';
  email?: string; // Optional for ZaloPay
  lastFourDigits?: string; // Optional for Credit Card
}

interface Booking {
  id: string;
  userId: string;
  carId: string;
  carName: string;
  carImage: any;
  duration: number;
  location: string;
  // Giá trị lưu Firestore: Pending | Upcoming | Active | Completed | Cancelled (dữ liệu cũ có thể viết thường)
  status: string;
  price: number;
  selectedAddOns: AddOn[];
  createdAt: Date;
  pickupDate?: any; // Date hoặc Firestore Timestamp (thêm khi đổi lịch)
  cancelledAt?: any;
  payment?: Payment; // Make payment optional since it might not exist for new bookings
}

type TabKey = "upcoming" | "active" | "history"
type PaymentRoute = "/credit-card" | "/momo" | "/zalopay"

const TABS: { key: TabKey; label: string; emptyText: string }[] = [
  { key: "upcoming", label: "Sắp tới", emptyText: "Không có chuyến nào đang chờ thanh toán hoặc chờ nhận xe" },
  { key: "active", label: "Đang thuê", emptyText: "Bạn không có chuyến nào đang thuê" },
  { key: "history", label: "Lịch sử", emptyText: "Chưa có chuyến nào hoàn thành hoặc đã huỷ" },
]

const PAYMENT_OPTIONS: { id: "credit-card" | "momo" | "zalopay"; route: PaymentRoute; name: string; subtitle: string }[] = [
  { id: PAYMENT_METHODS.CARD.id, route: "/credit-card", name: PAYMENT_METHODS.CARD.label, subtitle: "Thẻ ATM / Visa / Mastercard" },
  { id: PAYMENT_METHODS.MOMO.id, route: "/momo", name: PAYMENT_METHODS.MOMO.label, subtitle: "Thanh toán qua ví MoMo" },
  { id: PAYMENT_METHODS.ZALOPAY.id, route: "/zalopay", name: PAYMENT_METHODS.ZALOPAY.label, subtitle: "Thanh toán qua ví ZaloPay" },
]

const MIN_DURATION = 1
const MAX_DURATION = 30

// Ô chọn ngày dùng khung của UI.input (TextStyle) cho một TouchableOpacity
const DATE_INPUT_BOX = UI.input as unknown as ViewStyle

// Badge trạng thái: nền soft + chữ đậm cùng tông
const getStatusTone = (status?: string): { bg: string; fg: string } => {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return { bg: THEME_COLORS.warningSoft, fg: THEME_COLORS.warning }
    case "upcoming":
    case "confirmed":
      return { bg: THEME_COLORS.primarySoft, fg: THEME_COLORS.primary }
    case "active":
    case "completed":
      return { bg: THEME_COLORS.successSoft, fg: THEME_COLORS.success }
    case "cancelled":
    case "canceled":
      return { bg: THEME_COLORS.dangerSoft, fg: THEME_COLORS.danger }
    default:
      return { bg: THEME_COLORS.surfaceMuted, fg: THEME_COLORS.textSecondary }
  }
}

// Hiển thị phương thức thanh toán, hỗ trợ cả giá trị cũ (GCash/PayPal/Credit Card) của đơn cũ
const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case "Credit Card":
      return "Thẻ ngân hàng"
    default:
      return method
  }
}

// paidAt có thể là Firestore Timestamp, Date hoặc chuỗi
const toDate = (value: any) => (value && typeof value.toDate === "function" ? value.toDate() : value)

const normalizeStatus = (status?: string) => (status || "").toLowerCase()

// Mỗi đơn thuộc đúng một tab
const getTabForStatus = (status?: string): TabKey => {
  switch (normalizeStatus(status)) {
    case "active":
      return "active"
    case "completed":
    case "cancelled":
    case "canceled":
      return "history"
    default:
      // pending, upcoming, confirmed và các trạng thái chưa xác định
      return "upcoming"
  }
}

const isPendingStatus = (status?: string) => normalizeStatus(status) === "pending"
const canModifyStatus = (status?: string) => ["pending", "upcoming"].includes(normalizeStatus(status))

// Đơn đã thanh toán: có payment thành công hoặc đã chuyển sang Upcoming
const isPaidBooking = (booking: Booking) =>
  normalizeStatus(booking.payment?.status) === "completed" || normalizeStatus(booking.status) === "upcoming"

// Ưu tiên ảnh trong data/cars theo carId; nếu không có thì xử lý cả số (require) lẫn chuỗi URL
const resolveCarImage = (booking: Booking) => {
  const car = cars.find(c => c.id === booking.carId)
  if (car?.image) return car.image
  const image = booking.carImage
  if (typeof image === "number") return image
  if (typeof image === "string" && image.length > 0) return { uri: image }
  if (image && typeof image === "object" && typeof image.uri === "string") return { uri: image.uri }
  return null
}

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming")
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  // Chọn phương thức thanh toán cho đơn Pending
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null)

  // Đổi lịch
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null)
  const [newPickupDate, setNewPickupDate] = useState<Date>(new Date())
  const [newDuration, setNewDuration] = useState(1)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchBookings = () => {
      const bookingsRef = collection(db, "bookings")
      const q = query(
        bookingsRef,
        where("userId", "==", user.id),
        orderBy("createdAt", "desc")
      )

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Booking[]
        setBookings(bookingsData)
        setLoading(false)
      }, (error) => {
        console.error("Error fetching bookings:", error)
        Alert.alert("Lỗi", "Không thể tải danh sách chuyến đi")
        setLoading(false)
      })

      return unsubscribe
    }

    return fetchBookings()
  }, [user])

  const bookingsByTab: Record<TabKey, Booking[]> = {
    upcoming: bookings.filter(b => getTabForStatus(b.status) === "upcoming"),
    active: bookings.filter(b => getTabForStatus(b.status) === "active"),
    history: bookings.filter(b => getTabForStatus(b.status) === "history"),
  }

  // ===== Thanh toán =====
  const goToPayment = (booking: Booking, route: PaymentRoute) => {
    setPayingBooking(null)
    router.push({
      pathname: route,
      params: {
        amount: String(Math.round(Number(booking.price) || 0)),
        bookingId: booking.id,
      },
    })
  }

  // ===== Đổi lịch =====
  const openReschedule = (booking: Booking) => {
    if (!canModifyStatus(booking.status)) {
      Alert.alert("Không thể đổi lịch", "Chỉ có thể đổi lịch chuyến đang chờ thanh toán hoặc chờ nhận xe.")
      return
    }
    const current = toDate(booking.pickupDate)
    const currentDate = current ? new Date(current) : null
    const today = startOfToday()
    setNewPickupDate(currentDate && !isNaN(currentDate.getTime()) && currentDate >= today ? currentDate : new Date())
    setNewDuration(Math.max(MIN_DURATION, Number(booking.duration) || MIN_DURATION))
    setShowDatePicker(false)
    setReschedulingBooking(booking)
  }

  const closeReschedule = () => {
    setShowDatePicker(false)
    setReschedulingBooking(null)
  }

  const onPickupDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === "ios")
    if (event?.type === "dismissed" || !selected) return
    setNewPickupDate(selected)
  }

  const getReschedulePrice = (booking: Booking, days: number) => {
    const oldDuration = Number(booking.duration) || 1
    const oldPrice = Number(booking.price) || 0
    if (days === oldDuration) return oldPrice
    const pricePerDay = oldPrice / oldDuration
    return Math.round(pricePerDay * days)
  }

  const saveReschedule = async (booking: Booking, pickupDate: Date, duration: number, price: number) => {
    try {
      setSaving(true)
      await updateDoc(doc(db, "bookings", booking.id), {
        pickupDate,
        duration,
        price,
      })
      closeReschedule()
      Alert.alert("Đổi lịch thành công", `Ngày nhận xe mới: ${formatDate(pickupDate)} • ${duration} ngày`)
    } catch (error) {
      console.error("Error rescheduling booking:", error)
      Alert.alert("Lỗi", "Không thể đổi lịch. Vui lòng thử lại.")
    } finally {
      setSaving(false)
    }
  }

  const confirmReschedule = () => {
    const booking = reschedulingBooking
    if (!booking) return

    if (newPickupDate < startOfToday()) {
      Alert.alert("Ngày không hợp lệ", "Vui lòng chọn ngày nhận xe từ hôm nay trở đi.")
      return
    }

    const oldPrice = Number(booking.price) || 0
    const newPrice = getReschedulePrice(booking, newDuration)
    const diff = newPrice - oldPrice

    if (diff === 0) {
      saveReschedule(booking, newPickupDate, newDuration, newPrice)
      return
    }

    let message =
      `Thời gian thuê thay đổi từ ${booking.duration} ngày thành ${newDuration} ngày.\n` +
      `Tổng tiền mới: ${formatCurrency(newPrice)} (${diff > 0 ? "tăng" : "giảm"} ${formatCurrency(Math.abs(diff))}).`
    if (isPaidBooking(booking)) {
      message += diff > 0
        ? `\n\nĐơn đã thanh toán: bạn cần trả thêm ${formatCurrency(diff)} khi nhận xe.`
        : `\n\nĐơn đã thanh toán: ${formatCurrency(Math.abs(diff))} chênh lệch sẽ được hoàn về phương thức bạn đã dùng để thanh toán.`
    } else {
      message += "\n\nSố tiền thanh toán sẽ được cập nhật theo giá mới."
    }

    Alert.alert("Xác nhận đổi lịch", message, [
      { text: "Quay lại", style: "cancel" },
      { text: "Đồng ý", onPress: () => saveReschedule(booking, newPickupDate, newDuration, newPrice) },
    ])
  }

  // ===== Huỷ chuyến =====
  const handleCancel = (booking: Booking) => {
    if (!canModifyStatus(booking.status)) {
      Alert.alert("Không thể huỷ", "Chỉ có thể huỷ chuyến đang chờ thanh toán hoặc chờ nhận xe.")
      return
    }

    let message = `Bạn có chắc muốn huỷ chuyến ${booking.carName}?`
    if (isPaidBooking(booking)) {
      // Chính sách huỷ theo app/profile/support.tsx
      message +=
        "\n\nChính sách huỷ: huỷ trước giờ nhận xe từ 24 giờ trở lên được hoàn 100% tiền thuê; " +
        "huỷ trong vòng 24 giờ trước giờ nhận xe sẽ mất phí 30% tiền thuê. " +
        "Tiền hoàn sẽ về MoMo, ZaloPay hoặc tài khoản ngân hàng bạn đã dùng để thanh toán."
      const pickup = toDate(booking.pickupDate)
      const pickupDate = pickup ? new Date(pickup) : null
      if (pickupDate && !isNaN(pickupDate.getTime())) {
        const hoursLeft = (pickupDate.getTime() - Date.now()) / (1000 * 60 * 60)
        const paid = Number(booking.payment?.amount ?? booking.price) || 0
        message += hoursLeft >= 24
          ? `\n\nDự kiến hoàn: ${formatCurrency(paid)} (100%).`
          : `\n\nDự kiến hoàn: ${formatCurrency(Math.round(paid * 0.7))} (đã trừ phí 30%).`
      }
    }

    Alert.alert("Huỷ chuyến", message, [
      { text: "Không", style: "cancel" },
      {
        text: "Huỷ chuyến",
        style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "bookings", booking.id), {
              status: "Cancelled",
              cancelledAt: new Date(),
            })
            Alert.alert("Đã huỷ chuyến", "Chuyến đi đã được chuyển vào mục Lịch sử.")
          } catch (error) {
            console.error("Error cancelling booking:", error)
            Alert.alert("Lỗi", "Không thể huỷ chuyến. Vui lòng thử lại.")
          }
        },
      },
    ])
  }

  const openCarDetails = (booking: Booking) => {
    if (!cars.some(c => c.id === booking.carId)) return
    router.push({ pathname: "/car-details/[id]", params: { id: booking.carId } })
  }

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const isPending = isPendingStatus(item.status)
    const canModify = canModifyStatus(item.status)
    const imageSource = resolveCarImage(item)
    const pickupRaw = toDate(item.pickupDate)
    const tone = getStatusTone(item.status)

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => openCarDetails(item)}
        activeOpacity={PRESS_OPACITY}
      >
        <View style={styles.cardTop}>
          <View style={styles.carImageBox}>
            {imageSource ? (
              <Image source={imageSource} style={styles.carImage} resizeMode="contain" />
            ) : (
              <Ionicons name="car-outline" size={32} color={THEME_COLORS.textMuted} />
            )}
          </View>
          <View style={styles.bookingInfo}>
            <Text style={styles.carName} numberOfLines={1}>
              {item.carName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
              <Text style={[styles.statusText, { color: tone.fg }]}>{getBookingStatusLabel(item.status)}</Text>
            </View>
            <Text style={styles.price}>{formatCurrency(item.price)}</Text>
          </View>
        </View>

        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={THEME_COLORS.textMuted} />
            <Text style={styles.infoText} numberOfLines={2}>
              {item.location}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={THEME_COLORS.textMuted} />
            <Text style={styles.infoText}>
              {pickupRaw ? `Nhận xe: ${formatDate(pickupRaw)} • ` : ""}{item.duration} ngày
            </Text>
          </View>

          {/* Payment Info */}
          {item.payment && (
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentText}>
                Thanh toán qua {getPaymentMethodLabel(item.payment.method)} • {formatDate(toDate(item.payment.paidAt))}
              </Text>
              <Text style={styles.transactionId}>
                Mã giao dịch: {item.payment.transactionId}
              </Text>
            </View>
          )}

          {item.cancelledAt && (
            <Text style={[styles.paymentText, styles.paymentInfo]}>
              Đã huỷ ngày {formatDate(toDate(item.cancelledAt))}
            </Text>
          )}
        </View>

        {(isPending || canModify) && (
          <View style={styles.actions}>
            {isPending && (
              <TouchableOpacity
                style={styles.payNowButton}
                onPress={() => setPayingBooking(item)}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                <Text style={styles.payNowButtonText}>Thanh toán ngay</Text>
              </TouchableOpacity>
            )}

            {/* Chỉ cho đổi lịch / huỷ với đơn Pending hoặc Upcoming */}
            {canModify && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.modifyButton}
                  onPress={() => openReschedule(item)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="calendar-outline" size={16} color={THEME_COLORS.textPrimary} />
                  <Text style={styles.modifyButtonText}>Đổi lịch</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancel(item)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="close-circle-outline" size={16} color={THEME_COLORS.danger} />
                  <Text style={styles.cancelButtonText}>Huỷ chuyến</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    )
  }

  // Add this function to render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="car-outline" size={44} color={THEME_COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Bạn chưa có chuyến đi nào</Text>
      <Text style={styles.emptyText}>Khám phá và đặt chiếc xe đầu tiên của bạn ngay nhé</Text>
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push("/(tabs)/search")}
        activeOpacity={PRESS_OPACITY}
      >
        <Text style={styles.startButtonText}>Thuê xe ngay</Text>
      </TouchableOpacity>
    </View>
  )

  const currentTab = TABS.find(t => t.key === activeTab) ?? TABS[0]
  const reschedulePreviewPrice = reschedulingBooking ? getReschedulePrice(reschedulingBooking, newDuration) : 0
  const reschedulePriceDiff = reschedulingBooking ? reschedulePreviewPrice - (Number(reschedulingBooking.price) || 0) : 0

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Chuyến đi của tôi</Text>
      </View>

      {bookings.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <View style={styles.tabContainer}>
            {TABS.map(tab => {
              const selected = activeTab === tab.key
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, selected && styles.activeTab]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Text style={[styles.tabText, selected && styles.activeTabText]} numberOfLines={1}>
                    {tab.label} ({bookingsByTab[tab.key].length})
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {bookingsByTab[activeTab].length === 0 ? (
              <View style={styles.tabEmpty}>
                <View style={styles.tabEmptyIcon}>
                  <Ionicons name="calendar-outline" size={32} color={THEME_COLORS.textSecondary} />
                </View>
                <Text style={styles.tabEmptyText}>{currentTab.emptyText}</Text>
              </View>
            ) : (
              <FlatList
                data={bookingsByTab[activeTab]}
                renderItem={renderBookingCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
              />
            )}
          </ScrollView>
        </>
      )}

      {/* Chọn phương thức thanh toán cho đơn chờ thanh toán */}
      <Modal
        visible={!!payingBooking}
        transparent
        animationType="slide"
        onRequestClose={() => setPayingBooking(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn phương thức thanh toán</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setPayingBooking(null)}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {payingBooking && (
              <Text style={styles.modalSubtitle}>
                {payingBooking.carName} • {formatCurrency(payingBooking.price)}
              </Text>
            )}
            {PAYMENT_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={styles.paymentOption}
                onPress={() => payingBooking && goToPayment(payingBooking, option.route)}
                activeOpacity={PRESS_OPACITY}
              >
                <PaymentLogo method={option.id} size={40} />
                <View style={styles.paymentOptionInfo}>
                  <Text style={styles.paymentOptionName}>{option.name}</Text>
                  <Text style={styles.paymentOptionSubtitle}>{option.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={THEME_COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Đổi lịch */}
      <Modal
        visible={!!reschedulingBooking}
        transparent
        animationType="slide"
        onRequestClose={closeReschedule}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi lịch thuê xe</Text>
              <TouchableOpacity style={styles.closeButton} onPress={closeReschedule} activeOpacity={PRESS_OPACITY}>
                <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {reschedulingBooking && (
              <>
                <Text style={styles.modalSubtitle}>{reschedulingBooking.carName}</Text>

                <Text style={styles.inputLabel}>Ngày nhận xe</Text>
                <TouchableOpacity
                  style={[styles.dateInput, showDatePicker && styles.dateInputFocused]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="calendar-outline" size={20} color={THEME_COLORS.primary} />
                  <Text style={styles.dateValueText}>{formatDate(newPickupDate, "long")}</Text>
                  <Ionicons name="chevron-down" size={20} color={THEME_COLORS.textMuted} />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={newPickupDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    minimumDate={startOfToday()}
                    onChange={onPickupDateChange}
                  />
                )}

                <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>Thời gian thuê</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperButton, newDuration <= MIN_DURATION && styles.stepperButtonDisabled]}
                    onPress={() => setNewDuration(d => Math.max(MIN_DURATION, d - 1))}
                    disabled={newDuration <= MIN_DURATION}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color={newDuration <= MIN_DURATION ? THEME_COLORS.textMuted : THEME_COLORS.primary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{newDuration} ngày</Text>
                  <TouchableOpacity
                    style={[styles.stepperButton, newDuration >= MAX_DURATION && styles.stepperButtonDisabled]}
                    onPress={() => setNewDuration(d => Math.min(MAX_DURATION, d + 1))}
                    disabled={newDuration >= MAX_DURATION}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={newDuration >= MAX_DURATION ? THEME_COLORS.textMuted : THEME_COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.reschedulePrice}>
                  <Text style={styles.reschedulePriceLabel}>Tổng tiền mới</Text>
                  <Text style={styles.reschedulePriceValue}>{formatCurrency(reschedulePreviewPrice)}</Text>
                </View>
                {reschedulePriceDiff !== 0 && (
                  <Text
                    style={[
                      styles.priceDiffText,
                      { color: reschedulePriceDiff > 0 ? THEME_COLORS.danger : THEME_COLORS.success },
                    ]}
                  >
                    {reschedulePriceDiff > 0 ? "Tăng" : "Giảm"} {formatCurrency(Math.abs(reschedulePriceDiff))} so với giá hiện tại
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.confirmButton, saving && styles.disabledButton]}
                  onPress={confirmReschedule}
                  disabled={saving}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Text style={styles.confirmButtonText}>{saving ? "Đang lưu..." : "Xác nhận đổi lịch"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// Thanh tab nổi: cao 72 + cách đáy 20 → chừa ~120px để thẻ cuối không bị che
const TAB_BAR_CLEARANCE = 120

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  header: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.sm,
  },
  title: {
    ...TYPOGRAPHY.h1,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    marginHorizontal: SPACE.screen,
    marginTop: SPACE.lg,
    borderRadius: RADIUS.control,
    padding: SPACE.xs,
  },
  tab: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingHorizontal: SPACE.xs,
  },
  activeTab: {
    backgroundColor: THEME_COLORS.surface,
    ...SHADOWS.card,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: THEME_COLORS.textSecondary,
  },
  activeTabText: {
    color: THEME_COLORS.primary,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.xl,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  listContainer: {
    gap: SPACE.lg,
  },
  bookingCard: {
    ...UI.card,
    padding: SPACE.lg,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  carImageBox: {
    width: 104,
    height: 84,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACE.lg,
    overflow: "hidden",
  },
  carImage: {
    width: "90%",
    height: "90%",
  },
  bookingInfo: {
    flex: 1,
    alignItems: "flex-start",
  },
  carName: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACE.sm,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    marginBottom: SPACE.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  price: {
    ...TYPOGRAPHY.price,
  },
  infoBlock: {
    marginTop: SPACE.lg,
    paddingTop: SPACE.md,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
    gap: SPACE.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
  },
  infoText: {
    ...TYPOGRAPHY.bodyStrong,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  paymentInfo: {
    marginTop: SPACE.xs,
  },
  paymentText: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.textSecondary,
  },
  transactionId: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    marginTop: SPACE.lg,
    gap: SPACE.sm,
  },
  actionButtons: {
    flexDirection: "row",
    gap: SPACE.sm,
  },
  payNowButton: {
    ...UI.primaryButton,
    height: 44,
    flexDirection: "row",
    gap: SPACE.sm,
  },
  payNowButtonText: {
    ...UI.primaryButtonText,
    fontSize: 15,
  },
  modifyButton: {
    ...UI.secondaryButton,
    flex: 1,
    height: 44,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: SPACE.md,
  },
  modifyButtonText: {
    ...UI.secondaryButtonText,
    fontSize: 14,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.dangerSoft,
  },
  cancelButtonText: {
    color: THEME_COLORS.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACE["4xl"],
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.xl,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.sm,
    textAlign: "center",
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginBottom: SPACE.section,
  },
  startButton: {
    ...UI.primaryButton,
    alignSelf: "stretch",
  },
  startButtonText: {
    ...UI.primaryButtonText,
  },
  tabEmpty: {
    alignItems: "center",
    paddingVertical: SPACE["4xl"],
    paddingHorizontal: SPACE.screen,
  },
  tabEmptyIcon: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.lg,
  },
  tabEmptyText: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: THEME_COLORS.surface,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.sm,
    paddingBottom: SPACE["4xl"],
    maxHeight: "90%",
    ...SHADOWS.raised,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.borderStrong,
    marginBottom: SPACE.sm,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACE.sm,
    paddingBottom: SPACE.xs,
    gap: SPACE.md,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    marginBottom: SPACE.xl,
  },
  paymentOption: {
    ...UI.card,
    flexDirection: "row",
    alignItems: "center",
    padding: SPACE.lg,
    borderRadius: RADIUS.control,
    marginBottom: SPACE.md,
  },
  paymentOptionInfo: {
    flex: 1,
    marginLeft: SPACE.md,
  },
  paymentOptionName: {
    ...TYPOGRAPHY.bodyStrong,
  },
  paymentOptionSubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  inputLabel: {
    ...TYPOGRAPHY.overline,
    marginBottom: SPACE.sm,
  },
  inputLabelSpaced: {
    marginTop: SPACE.xl,
  },
  dateInput: {
    ...DATE_INPUT_BOX,
    flexDirection: "row",
    alignItems: "center",
  },
  dateInputFocused: {
    ...UI.inputFocused,
  },
  dateValueText: {
    ...TYPOGRAPHY.bodyStrong,
    flex: 1,
    marginLeft: SPACE.md,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: RADIUS.control,
    padding: 6,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonDisabled: {
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  stepperValue: {
    ...TYPOGRAPHY.h3,
  },
  reschedulePrice: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACE["2xl"],
    paddingTop: SPACE.lg,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
  },
  reschedulePriceLabel: {
    ...TYPOGRAPHY.body,
  },
  reschedulePriceValue: {
    ...TYPOGRAPHY.price,
    fontSize: 20,
  },
  priceDiffText: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACE.xs,
    textAlign: "right",
  },
  confirmButton: {
    ...UI.primaryButton,
    marginTop: SPACE["2xl"],
  },
  disabledButton: {
    opacity: 0.6,
  },
  confirmButtonText: {
    ...UI.primaryButtonText,
  },
})
