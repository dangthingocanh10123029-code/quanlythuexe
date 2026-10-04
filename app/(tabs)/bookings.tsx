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

const COLORS = {
  primary: "#4169e1",
  white: "#ffffff",
  black: "#000000",
  gray: "#666666",
  lightGray: "#e0e0e0",
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

  const getStatusColor = (status: string) => {
    switch (normalizeStatus(status)) {
      case "pending":
        return "#FFB700"
      case "active":
        return "#00bb02"
      case "upcoming":
        return "#4169e1"
      case "completed":
        return "#666666"
      case "cancelled":
      case "canceled":
        return "#ff4444"
      default:
        return "#666666"
    }
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
    const isPastBooking = getTabForStatus(item.status) === "history"
    const isPending = isPendingStatus(item.status)
    const canModify = canModifyStatus(item.status)
    const imageSource = resolveCarImage(item)
    const pickupRaw = toDate(item.pickupDate)
    const textColor = isPastBooking ? COLORS.gray : COLORS.white

    return (
      <TouchableOpacity
        style={[styles.bookingCard, { backgroundColor: isPastBooking ? COLORS.white : COLORS.primary }]}
        onPress={() => openCarDetails(item)}
        activeOpacity={0.8}
      >
        {imageSource ? (
          <Image source={imageSource} style={styles.carImage} />
        ) : (
          <View style={[styles.carImage, styles.carImagePlaceholder]}>
            <Ionicons name="car-outline" size={36} color={COLORS.gray} />
          </View>
        )}
        <View style={styles.bookingInfo}>
          <View style={styles.bookingHeader}>
            <Text style={[styles.carName, { color: isPastBooking ? COLORS.black : COLORS.white }]}>
              {item.carName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getBookingStatusLabel(item.status)}</Text>
            </View>
          </View>

          <Text style={[styles.price, { color: isPastBooking ? COLORS.primary : "#FFB700" }]}>
            {formatCurrency(item.price)}
          </Text>

          <View style={styles.locationContainer}>
            <Ionicons
              name="location"
              size={16}
              color={textColor}
            />
            <Text style={[styles.locationText, { color: textColor }]}>
              {item.location}
            </Text>
          </View>

          <View style={styles.locationContainer}>
            <Ionicons name="calendar" size={16} color={textColor} />
            <Text style={[styles.locationText, { color: textColor }]}>
              {pickupRaw ? `Nhận xe: ${formatDate(pickupRaw)} • ` : ""}{item.duration} ngày
            </Text>
          </View>

          {/* Payment Info */}
          {item.payment && (
            <View style={styles.paymentInfo}>
              <Text style={[styles.paymentText, { color: textColor }]}>
                Thanh toán qua {getPaymentMethodLabel(item.payment.method)} • {formatDate(toDate(item.payment.paidAt))}
              </Text>
              <Text style={[styles.transactionId, { color: textColor }]}>
                Mã giao dịch: {item.payment.transactionId}
              </Text>
            </View>
          )}

          {item.cancelledAt && (
            <Text style={[styles.paymentText, styles.paymentInfo, { color: textColor }]}>
              Đã huỷ ngày {formatDate(toDate(item.cancelledAt))}
            </Text>
          )}

          {isPending && (
            <TouchableOpacity style={styles.payNowButton} onPress={() => setPayingBooking(item)}>
              <Ionicons name="card" size={16} color={COLORS.primary} />
              <Text style={styles.payNowButtonText}>Thanh toán ngay</Text>
            </TouchableOpacity>
          )}

          {/* Chỉ cho đổi lịch / huỷ với đơn Pending hoặc Upcoming */}
          {canModify && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.modifyButton} onPress={() => openReschedule(item)}>
                <Text style={styles.modifyButtonText}>Đổi lịch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancel(item)}>
                <Text style={styles.cancelButtonText}>Huỷ chuyến</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  // Add this function to render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="car-outline" size={80} color={COLORS.gray} />
      <Text style={styles.emptyTitle}>Bạn chưa có chuyến đi nào</Text>
      <Text style={styles.emptyText}>Khám phá và đặt chiếc xe đầu tiên của bạn ngay nhé</Text>
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push("/(tabs)/search")}
      >
        <Text style={styles.startButtonText}>Thuê xe ngay</Text>
      </TouchableOpacity>
    </View>
  )

  const currentTab = TABS.find(t => t.key === activeTab) ?? TABS[0]
  const reschedulePreviewPrice = reschedulingBooking ? getReschedulePrice(reschedulingBooking, newDuration) : 0
  const reschedulePriceDiff = reschedulingBooking ? reschedulePreviewPrice - (Number(reschedulingBooking.price) || 0) : 0

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chuyến đi của tôi</Text>
      </View>

      {bookings.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <View style={styles.tabContainer}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                  {tab.label} ({bookingsByTab[tab.key].length})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {bookingsByTab[activeTab].length === 0 ? (
              <View style={styles.tabEmpty}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.gray} />
                <Text style={styles.tabEmptyText}>{currentTab.emptyText}</Text>
              </View>
            ) : (
              <FlatList
                data={bookingsByTab[activeTab]}
                renderItem={renderBookingCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn phương thức thanh toán</Text>
              <TouchableOpacity onPress={() => setPayingBooking(null)}>
                <Ionicons name="close" size={24} color={COLORS.black} />
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
              >
                <PaymentLogo method={option.id} size={36} />
                <View style={styles.paymentOptionInfo}>
                  <Text style={styles.paymentOptionName}>{option.name}</Text>
                  <Text style={styles.paymentOptionSubtitle}>{option.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi lịch thuê xe</Text>
              <TouchableOpacity onPress={closeReschedule}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            {reschedulingBooking && (
              <>
                <Text style={styles.modalSubtitle}>{reschedulingBooking.carName}</Text>

                <Text style={styles.inputLabel}>Ngày nhận xe</Text>
                <TouchableOpacity style={styles.locationInput} onPress={() => setShowDatePicker(true)}>
                  <Ionicons name="calendar" size={20} color={COLORS.primary} />
                  <Text style={styles.dateValueText}>{formatDate(newPickupDate, "long")}</Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
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

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Thời gian thuê</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperButton, newDuration <= MIN_DURATION && styles.stepperButtonDisabled]}
                    onPress={() => setNewDuration(d => Math.max(MIN_DURATION, d - 1))}
                    disabled={newDuration <= MIN_DURATION}
                  >
                    <Ionicons name="remove" size={20} color={COLORS.white} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{newDuration} ngày</Text>
                  <TouchableOpacity
                    style={[styles.stepperButton, newDuration >= MAX_DURATION && styles.stepperButtonDisabled]}
                    onPress={() => setNewDuration(d => Math.min(MAX_DURATION, d + 1))}
                    disabled={newDuration >= MAX_DURATION}
                  >
                    <Ionicons name="add" size={20} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                <View style={styles.reschedulePrice}>
                  <Text style={styles.paymentText}>Tổng tiền mới</Text>
                  <Text style={styles.reschedulePriceValue}>{formatCurrency(reschedulePreviewPrice)}</Text>
                </View>
                {reschedulePriceDiff !== 0 && (
                  <Text style={[styles.priceDiffText, { color: reschedulePriceDiff > 0 ? "#ff4444" : "#00bb02" }]}>
                    {reschedulePriceDiff > 0 ? "Tăng" : "Giảm"} {formatCurrency(Math.abs(reschedulePriceDiff))} so với giá hiện tại
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.confirmButton, saving && { opacity: 0.6 }]}
                  onPress={confirmReschedule}
                  disabled={saving}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ededed",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "#4169e1",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
  },
  activeTabText: {
    color: "#ffffff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  bookingCard: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  carImage: {
    width: 100,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  carName: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    backgroundColor: "#FFB700",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    color: "#333333",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modifyButton: {
    flex: 1,
    backgroundColor: "#FFB700",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4169e1",
  },
  modifyButtonText: {
    color: "#4169e1",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#fff5f5",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  cancelButtonText: {
    color: "#ff4444",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: "#000000",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#666666",
    textAlign: 'center',
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: "#4169e1",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  locationInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    padding: 12,
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  durationBox: {
    width: '23%',
    aspectRatio: 0.7,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  selectedDurationBox: {
    backgroundColor: "#4169e1",
    borderColor: "#4169e1",
  },
  durationDays: {
    fontSize: 24,
    fontWeight: 'bold',
    color: "#000000",
    marginBottom: 4,
  },
  durationLabel: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  durationPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: "#4169e1",
  },
  selectedDurationText: {
    color: "#ffffff",
  },
  paymentInfo: {
    marginBottom: 12,
  },
  paymentText: {
    fontSize: 14,
    color: "#666666",
  },
  transactionId: {
    fontSize: 12,
    color: "#999999",
  },
  carImagePlaceholder: {
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    justifyContent: "center",
  },
  payNowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  payNowButtonText: {
    color: "#4169e1",
    fontSize: 14,
    fontWeight: "700",
  },
  tabEmpty: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  tabEmptyText: {
    fontSize: 15,
    color: "#666666",
    textAlign: "center",
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentOptionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  paymentOptionSubtitle: {
    fontSize: 12,
    color: "#666666",
    marginTop: 2,
  },
  dateValueText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#000000",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    padding: 8,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4169e1",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonDisabled: {
    backgroundColor: "#cccccc",
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  reschedulePrice: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  reschedulePriceValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4169e1",
  },
  priceDiffText: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "right",
  },
  confirmButton: {
    backgroundColor: "#FFB700",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
})
