"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Image, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useUserBookings } from "../../hooks/useBookings"
import { formatCurrency, formatDate } from "../../utils/helpers"
import { BOOKING_TABS } from "../../utils/constants"
import type { Booking as BookingDoc } from "../../types/booking"
import { useCars, getCarImage } from "../../hooks/useCars"
import type { Car } from "../../types/car"
import BookingStatusBadge from "../../components/BookingStatusBadge"
import EmptyState from "../../components/EmptyState"
import { PaymentMethodSheet, RescheduleSheet, confirmCancelBooking } from "../../components/BookingSheets"
import { StatusBar } from "expo-status-bar"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY, layout } from "../../utils/theme"

// Đơn cũ có thể còn carImage (chuỗi URL / data URI) và payment.method cũ ('GCash' | 'PayPal' | 'Credit Card')
type Booking = BookingDoc & { carImage?: any }

type TabKey = "upcoming" | "active" | "history"

const TABS: { key: TabKey; label: string; emptyTitle: string; emptyText: string }[] = [
  { key: "upcoming", label: "Sắp tới", emptyTitle: "Chưa có chuyến sắp tới", emptyText: "Không có chuyến nào đang chờ xác nhận, chờ thanh toán hoặc chờ nhận xe" },
  { key: "active", label: "Đang thuê", emptyTitle: "Chưa có chuyến đang thuê", emptyText: "Bạn không có chuyến nào đang thuê" },
  { key: "history", label: "Lịch sử", emptyTitle: "Lịch sử còn trống", emptyText: "Chưa có chuyến nào hoàn thành hoặc đã huỷ" },
]

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

// Mỗi đơn thuộc đúng một tab (BOOKING_TABS); trạng thái lạ xếp vào Sắp tới
const getTabForStatus = (status?: string): TabKey => {
  const key = normalizeStatus(status)
  if ((BOOKING_TABS.active as readonly string[]).includes(key)) return "active"
  if ((BOOKING_TABS.history as readonly string[]).includes(key)) return "history"
  return "upcoming"
}

// Đơn đã được RENTO xác nhận, chờ khách thanh toán (D2)
const isAwaitingPayment = (status?: string) => normalizeStatus(status) === "confirmed"
const canModifyStatus = (status?: string) => ["pending", "confirmed", "upcoming"].includes(normalizeStatus(status))

// Ảnh theo xe trên Firestore; đơn cũ có thể còn carImage dạng chuỗi (URL / data URI)
const resolveCarImage = (booking: Booking, cars: Car[]) => {
  const car = cars.find(c => c.id === booking.carId)
  if (car) return getCarImage(car)
  const image = booking.carImage
  if (typeof image === "string" && image.length > 0) return { uri: image }
  return null
}

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming")
  const { cars } = useCars()
  const { bookings, loading } = useUserBookings() as { bookings: Booking[]; loading: boolean }

  // Bottom sheet thanh toán / đổi lịch (components/BookingSheets)
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null)
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null)

  const bookingsByTab: Record<TabKey, Booking[]> = {
    upcoming: bookings.filter(b => getTabForStatus(b.status) === "upcoming"),
    active: bookings.filter(b => getTabForStatus(b.status) === "active"),
    history: bookings.filter(b => getTabForStatus(b.status) === "history"),
  }

  const openBookingDetails = (booking: Booking) =>
    router.push({ pathname: "/booking/[id]", params: { id: booking.id } })

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const isPending = isAwaitingPayment(item.status)
    const canModify = canModifyStatus(item.status)
    const imageSource = resolveCarImage(item, cars)
    const pickupRaw = toDate(item.pickupDate)

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => openBookingDetails(item)}
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
            <BookingStatusBadge status={item.status} style={styles.statusBadge} />
            <Text style={styles.price} numberOfLines={1}>{formatCurrency(item.price)}</Text>
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

          {/* Payment Info (giao dịch thất bại không có mã giao dịch / ngày trả) */}
          {item.payment && (normalizeStatus(item.payment.status) === "failed" ? (
            <Text style={[styles.paymentText, styles.paymentInfo, styles.dangerText]}>
              Giao dịch gần nhất thất bại, bạn có thể thanh toán lại
            </Text>
          ) : (
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentText}>
                Thanh toán qua {getPaymentMethodLabel(item.payment.method)} • {formatDate(toDate(item.payment.paidAt))}
              </Text>
              <Text style={styles.transactionId}>
                Mã giao dịch: {item.payment.transactionId}
              </Text>
              {item.payment.refundAmount ? (
                <Text style={[styles.transactionId, styles.successText]}>
                  Đã hoàn {formatCurrency(item.payment.refundAmount)}
                </Text>
              ) : null}
            </View>
          ))}

          {item.cancelledAt && (
            <Text style={[styles.paymentText, styles.paymentInfo]}>
              Đã huỷ ngày {formatDate(toDate(item.cancelledAt))}
            </Text>
          )}

          {item.rejectReason ? (
            <Text style={[styles.paymentText, styles.paymentInfo, styles.dangerText]} numberOfLines={2}>
              Lý do từ chối: {item.rejectReason}
            </Text>
          ) : null}
        </View>

        {(isPending || canModify) && (
          <View style={styles.actions}>
            {isPending && (
              <TouchableOpacity
                style={styles.payNowButton}
                onPress={() => setPayingBooking(item)}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons name="card-outline" size={18} color={THEME_COLORS.textInverse} />
                <Text style={styles.payNowButtonText}>Thanh toán ngay</Text>
              </TouchableOpacity>
            )}

            {/* Chỉ cho đổi lịch / huỷ với đơn chưa nhận xe (Pending | Confirmed | Upcoming) */}
            {canModify && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.modifyButton}
                  onPress={() => setReschedulingBooking(item)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="calendar-outline" size={16} color={THEME_COLORS.textPrimary} />
                  <Text style={styles.modifyButtonText}>Đổi lịch</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => confirmCancelBooking(item)}
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

  const renderEmptyState = () => (
    <EmptyState
      image="bookings"
      size={200}
      title="Bạn chưa có chuyến đi nào"
      description="Khám phá và đặt chiếc xe đầu tiên của bạn ngay nhé"
      actionLabel="Thuê xe ngay"
      onAction={() => router.push("/(tabs)/search")}
      primaryAction
      style={styles.emptyState}
    />
  )

  const currentTab = TABS.find(t => t.key === activeTab) ?? TABS[0]

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Chuyến đi của tôi</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={THEME_COLORS.primary} style={styles.loading} />
      ) : bookings.length === 0 ? (
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
                  <Text
                    style={[styles.tabText, selected && styles.activeTabText]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
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
              <EmptyState image="bookings" size={160} title={currentTab.emptyTitle} description={currentTab.emptyText} />
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

      <PaymentMethodSheet booking={payingBooking} onClose={() => setPayingBooking(null)} />
      <RescheduleSheet
        booking={reschedulingBooking}
        car={reschedulingBooking ? cars.find(c => c.id === reschedulingBooking.carId) : null}
        onClose={() => setReschedulingBooking(null)}
      />
    </SafeAreaView>
  )
}

// Chừa chỗ cho thanh tab nổi để thẻ cuối không bị che
const TAB_BAR_CLEARANCE = layout.tabBarClearance

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
    marginBottom: SPACE.sm,
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
  dangerText: {
    color: THEME_COLORS.danger,
  },
  successText: {
    color: THEME_COLORS.success,
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
  loading: {
    marginTop: SPACE.section,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: SPACE.screen,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
})
