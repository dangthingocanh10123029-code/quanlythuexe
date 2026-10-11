"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useBooking } from "../../hooks/useBookings"
import { useCar, getCarImage } from "../../hooks/useCars"
import { getBookingRange, toDate } from "../../utils/booking"
import { previewRefund } from "../../utils/bookingActions"
import { getBookingStatusLabel, PAYMENT_STATUS_LABELS, VAT_RATE } from "../../utils/constants"
import { formatCurrency, formatDate } from "../../utils/helpers"
import type { Booking, BookingPayment } from "../../types/booking"
import { AppHeader, PrimaryButton } from "../../components"
import BookingStatusBadge from "../../components/BookingStatusBadge"
import { PaymentMethodSheet, RescheduleSheet, confirmCancelBooking } from "../../components/BookingSheets"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../../utils/theme"

// Field ghi thêm khi thanh toán thất bại / hoàn tiền (utils/bookingActions), chưa khai báo trong types/booking
type Payment = BookingPayment & { refundPercent?: number; failReason?: string; failedAt?: any }
// Đơn cũ có thể còn carImage dạng chuỗi (URL / data URI)
type BookingDoc = Booking & { carImage?: unknown }

// Timeline theo luồng D2; `at` là thời điểm đơn vào bước đó
const STEPS: { status: string; at: (b: Booking) => any }[] = [
  { status: "Pending", at: (b) => b.createdAt },
  { status: "Confirmed", at: (b) => b.confirmedAt },
  { status: "Upcoming", at: (b) => b.payment?.paidAt },
  { status: "Active", at: (b) => b.handedOverAt ?? b.handover?.at },
  { status: "Completed", at: (b) => b.returnedAt ?? b.returnInspection?.at },
]

const STATUS_HINTS: Record<string, string> = {
  pending: "RENTO đang kiểm tra lịch xe và GPLX của bạn. Bạn sẽ nhận được thông báo khi đơn được xác nhận.",
  confirmed: "Đơn đã được xác nhận. Bạn hãy thanh toán để giữ xe.",
  upcoming: "Nhớ mang theo GPLX, CCCD và tiền cọc khi đến nhận xe.",
  active: "Chúc bạn có chuyến đi vui vẻ! Trả xe đúng giờ để tránh phí trễ hạn.",
}

const MODIFIABLE = ["pending", "confirmed", "upcoming"]

// Timestamp / Date / chuỗi → chuỗi ngày ("" nếu không có)
const fmt = (value: any, format = "datetime") => {
  const d = toDate(value)
  return d ? formatDate(d, format) : ""
}

// Hỗ trợ giá trị phương thức cũ của đơn trước khi Việt hoá
const getPaymentMethodLabel = (method?: string) => (method === "Credit Card" ? "Thẻ ngân hàng" : method || "")

const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/bookings"))

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { booking, loading } = useBooking(id)
  const { car } = useCar(booking?.carId)
  const [paying, setPaying] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)

  if (loading || !booking) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <AppHeader title="Chi tiết chuyến đi" onBack={goBack} />
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator size="large" color={THEME_COLORS.primary} />
          ) : (
            <>
              <View style={styles.emptyIcon}>
                <Ionicons name="document-text-outline" size={32} color={THEME_COLORS.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>Không tìm thấy chuyến đi</Text>
              <Text style={styles.emptyText}>Chuyến đi không tồn tại hoặc bạn không có quyền xem.</Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.replace("/(tabs)/bookings")}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={styles.secondaryButtonText}>Về Chuyến đi của tôi</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    )
  }

  const legacy = booking as BookingDoc
  const status = (booking.status || "").toLowerCase().replace("canceled", "cancelled")
  const range = getBookingRange(booking)
  const payment = booking.payment as Payment | undefined
  const paymentStatus = (payment?.status || "").toLowerCase()
  const isClosed = status === "cancelled" || status === "rejected"
  const canModify = MODIFIABLE.includes(status)
  const awaitingPayment = status === "confirmed"
  const refund = canModify && paymentStatus === "completed" ? previewRefund(booking) : null
  const imageSource = car
    ? getCarImage(car)
    : typeof legacy.carImage === "string" && legacy.carImage
      ? { uri: legacy.carImage }
      : null
  const currentStep = STEPS.findIndex((s) => s.status.toLowerCase() === status)

  const renderRow = (label: string, value: string, options: { strong?: boolean; tone?: string } = {}) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, options.strong && styles.rowValueStrong, options.tone ? { color: options.tone } : null]}
        selectable
      >
        {value || "—"}
      </Text>
    </View>
  )

  const renderTimeline = () => (
    <View style={styles.card}>
      {STEPS.map((step, index) => {
        // Bước cuối (Hoàn thành) khi đã tới thì hiện dấu tích thay vì vòng "đang ở bước này"
        const done = index < currentStep || (index === currentStep && status === "completed")
        const current = index === currentStep && !done
        const at = fmt(step.at(booking))
        const last = index === STEPS.length - 1
        return (
          <View key={step.status} style={styles.step}>
            <View style={styles.stepRail}>
              <View style={[styles.stepDot, done && styles.stepDotDone, current && styles.stepDotCurrent]}>
                {done ? <Ionicons name="checkmark" size={14} color={THEME_COLORS.textInverse} /> : null}
              </View>
              {!last && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
            </View>
            <View style={[styles.stepBody, !last && styles.stepBodySpaced]}>
              <Text style={[styles.stepLabel, (done || current) && styles.stepLabelActive]}>
                {getBookingStatusLabel(step.status)}
              </Text>
              {at && (done || current) ? <Text style={styles.stepTime}>{at}</Text> : null}
            </View>
          </View>
        )
      })}
      {STATUS_HINTS[status] ? (
        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={18} color={THEME_COLORS.primary} />
          <Text style={styles.hintText}>{STATUS_HINTS[status]}</Text>
        </View>
      ) : null}
    </View>
  )

  // Đơn bị từ chối / đã huỷ thay timeline bằng khối thông báo
  const renderClosedNotice = () => (
    <View style={[styles.card, styles.closedCard]}>
      <View style={styles.closedHeader}>
        <Ionicons name="close-circle" size={22} color={THEME_COLORS.danger} />
        <Text style={styles.closedTitle}>
          {status === "rejected" ? "RENTO đã từ chối đơn này" : booking.cancelledBy === "admin" ? "RENTO đã huỷ chuyến" : "Bạn đã huỷ chuyến"}
        </Text>
      </View>
      {status === "rejected" ? (
        <>
          {booking.rejectReason ? <Text style={styles.closedText}>Lý do: {booking.rejectReason}</Text> : null}
          {booking.rejectedAt ? <Text style={styles.closedTime}>{fmt(booking.rejectedAt)}</Text> : null}
        </>
      ) : booking.cancelledAt ? (
        <Text style={styles.closedTime}>{fmt(booking.cancelledAt)}</Text>
      ) : null}
    </View>
  )

  const renderPayment = () => {
    if (!payment) {
      return (
        <View style={styles.card}>
          {renderRow("Trạng thái", status === "pending" || awaitingPayment ? "Chưa thanh toán" : "Không có giao dịch")}
          {status === "pending" ? (
            <Text style={styles.cardNote}>Bạn có thể thanh toán sau khi RENTO xác nhận đơn.</Text>
          ) : null}
        </View>
      )
    }
    const failed = paymentStatus === "failed"
    const refunded = paymentStatus === "refunded"
    const statusTone = failed ? THEME_COLORS.danger : refunded ? THEME_COLORS.warning : THEME_COLORS.success
    return (
      <View style={styles.card}>
        {renderRow("Trạng thái", PAYMENT_STATUS_LABELS[paymentStatus] ?? payment.status, { strong: true, tone: statusTone })}
        {renderRow("Phương thức", getPaymentMethodLabel(payment.method))}
        {failed ? (
          <>
            {payment.failReason ? renderRow("Lý do", payment.failReason) : null}
            {payment.failedAt ? renderRow("Thời gian", fmt(payment.failedAt)) : null}
            <Text style={styles.cardNote}>Đơn vẫn đang chờ thanh toán, bạn có thể thử lại.</Text>
          </>
        ) : (
          <>
            {renderRow("Số tiền", formatCurrency(payment.amount ?? booking.price))}
            {payment.transactionId ? renderRow("Mã giao dịch", payment.transactionId) : null}
            {payment.paidAt ? renderRow("Thời gian", fmt(payment.paidAt)) : null}
          </>
        )}
        {refunded && payment.refundAmount ? (
          <>
            <View style={styles.divider} />
            {renderRow(
              "Đã hoàn",
              `${formatCurrency(payment.refundAmount)}${payment.refundPercent ? ` (${payment.refundPercent}%)` : ""}`,
              { strong: true, tone: THEME_COLORS.success },
            )}
            {payment.refundedAt ? renderRow("Ngày hoàn", fmt(payment.refundedAt)) : null}
          </>
        ) : null}
        {refund && refund.amount > 0 ? (
          <Text style={styles.cardNote}>
            Nếu huỷ bây giờ, bạn được hoàn {formatCurrency(refund.amount)} ({refund.percent}%).
          </Text>
        ) : null}
      </View>
    )
  }

  const discount = Number(booking.discount) || 0

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <AppHeader title="Chi tiết chuyến đi" subtitle={`Mã đơn ${booking.id}`} onBack={goBack} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        {/* Xe */}
        <TouchableOpacity
          style={[styles.card, styles.carCard]}
          onPress={() => car && router.push({ pathname: "/car-details/[id]", params: { id: car.id } })}
          disabled={!car}
          activeOpacity={PRESS_OPACITY}
        >
          <View style={styles.carImageBox}>
            {imageSource ? (
              <Image source={imageSource} style={styles.carImage} resizeMode="contain" />
            ) : (
              <Ionicons name="car-outline" size={32} color={THEME_COLORS.textMuted} />
            )}
          </View>
          <View style={styles.carInfo}>
            <Text style={styles.carName} numberOfLines={2}>{booking.carName}</Text>
            {car?.licensePlate ? <Text style={styles.carMeta}>{car.licensePlate}</Text> : null}
            <BookingStatusBadge status={booking.status} style={styles.badge} />
          </View>
          {car ? <Ionicons name="chevron-forward" size={20} color={THEME_COLORS.textMuted} /> : null}
        </TouchableOpacity>

        {/* Trạng thái */}
        <Text style={styles.sectionTitle}>Trạng thái</Text>
        {isClosed ? renderClosedNotice() : renderTimeline()}

        {/* Lịch trình */}
        <Text style={styles.sectionTitle}>Lịch trình</Text>
        <View style={styles.card}>
          <View style={styles.tripRow}>
            <View style={styles.tripIcon}>
              <Ionicons name="log-in-outline" size={18} color={THEME_COLORS.primary} />
            </View>
            <View style={styles.tripBody}>
              <Text style={styles.tripLabel}>Nhận xe</Text>
              <Text style={styles.tripTime}>{range ? formatDate(range.start, "datetime") : "Chưa có"}</Text>
              <Text style={styles.tripPlace}>{booking.location}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.tripRow}>
            <View style={styles.tripIcon}>
              <Ionicons name="log-out-outline" size={18} color={THEME_COLORS.primary} />
            </View>
            <View style={styles.tripBody}>
              <Text style={styles.tripLabel}>Trả xe</Text>
              <Text style={styles.tripTime}>{range ? formatDate(range.end, "datetime") : "Chưa có"}</Text>
              <Text style={styles.tripPlace}>{booking.returnLocation || booking.location}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          {renderRow("Thời gian thuê", `${booking.duration} ngày`)}
          {renderRow("Ngày đặt", fmt(booking.createdAt))}
        </View>

        {/* Chi tiết giá (đơn cũ chỉ có tổng cộng) */}
        <Text style={styles.sectionTitle}>Chi tiết giá</Text>
        <View style={styles.card}>
          {booking.subtotal != null ? renderRow(`Tiền thuê (${booking.duration} ngày)`, formatCurrency(booking.subtotal)) : null}
          {(booking.selectedAddOns ?? []).map((addOn, index) => (
            <View key={`${addOn.id ?? index}`}>{renderRow(addOn.name, formatCurrency(addOn.price))}</View>
          ))}
          {discount > 0
            ? renderRow(
                `Giảm giá${booking.promoCode ? ` (${booking.promoCode})` : ""}`,
                `-${formatCurrency(discount)}`,
                { tone: THEME_COLORS.success },
              )
            : null}
          {booking.tax != null ? renderRow(`VAT ${Math.round(VAT_RATE * 100)}%`, formatCurrency(booking.tax)) : null}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatCurrency(booking.price)}</Text>
          </View>
          {booking.deposit ? (
            <>
              {renderRow("Tiền cọc", formatCurrency(booking.deposit))}
              <Text style={styles.cardNote}>Tiền cọc trả khi nhận xe, được hoàn lại sau khi trả xe.</Text>
            </>
          ) : null}
        </View>

        {/* Thanh toán */}
        <Text style={styles.sectionTitle}>Thanh toán</Text>
        {renderPayment()}
      </ScrollView>

      {canModify && (
        <SafeAreaView edges={["bottom"]} style={styles.footer}>
          <View style={styles.footerInner}>
            {awaitingPayment && (
              <PrimaryButton
                title={`Thanh toán ${formatCurrency(booking.price)}`}
                icon="card-outline"
                iconPosition="left"
                onPress={() => setPaying(true)}
              />
            )}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.modifyButton}
                onPress={() => setRescheduling(true)}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons name="calendar-outline" size={16} color={THEME_COLORS.textPrimary} />
                <Text style={styles.modifyButtonText}>Đổi lịch</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => confirmCancelBooking(booking)}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons name="close-circle-outline" size={16} color={THEME_COLORS.danger} />
                <Text style={styles.cancelButtonText}>Huỷ chuyến</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      )}

      <PaymentMethodSheet booking={paying ? booking : null} onClose={() => setPaying(false)} />
      <RescheduleSheet booking={rescheduling ? booking : null} car={car} onClose={() => setRescheduling(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACE.screen,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    textAlign: "center",
    marginBottom: SPACE.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginBottom: SPACE["2xl"],
  },
  secondaryButton: {
    ...UI.secondaryButton,
    alignSelf: "stretch",
  },
  secondaryButtonText: {
    ...UI.secondaryButtonText,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.xl,
    paddingBottom: SPACE.section,
  },
  card: {
    ...UI.card,
    padding: SPACE.lg,
  },
  carCard: {
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
  carInfo: {
    flex: 1,
  },
  carName: {
    ...TYPOGRAPHY.h3,
  },
  carMeta: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  badge: {
    marginTop: SPACE.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.overline,
    marginTop: SPACE["2xl"],
    marginBottom: SPACE.md,
  },
  step: {
    flexDirection: "row",
  },
  stepRail: {
    width: 24,
    alignItems: "center",
    marginRight: SPACE.md,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: THEME_COLORS.borderStrong,
    backgroundColor: THEME_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: {
    borderColor: THEME_COLORS.primary,
    backgroundColor: THEME_COLORS.primary,
  },
  stepDotCurrent: {
    borderColor: THEME_COLORS.primary,
    borderWidth: 6,
  },
  stepLine: {
    flex: 1,
    width: 2,
    minHeight: 16,
    backgroundColor: THEME_COLORS.border,
  },
  stepLineDone: {
    backgroundColor: THEME_COLORS.primary,
  },
  stepBody: {
    flex: 1,
    paddingTop: 1,
  },
  stepBodySpaced: {
    paddingBottom: SPACE.lg,
  },
  stepLabel: {
    ...TYPOGRAPHY.body,
    color: THEME_COLORS.textMuted,
  },
  stepLabelActive: {
    ...TYPOGRAPHY.bodyStrong,
  },
  stepTime: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  hint: {
    flexDirection: "row",
    gap: SPACE.sm,
    marginTop: SPACE.lg,
    padding: SPACE.md,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.primarySoft,
  },
  hintText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  closedCard: {
    backgroundColor: THEME_COLORS.dangerSoft,
    borderColor: THEME_COLORS.dangerSoft,
  },
  closedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
  },
  closedTitle: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.danger,
    flex: 1,
  },
  closedText: {
    ...TYPOGRAPHY.body,
    marginTop: SPACE.sm,
  },
  closedTime: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACE.xs,
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tripIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACE.md,
  },
  tripBody: {
    flex: 1,
  },
  tripLabel: {
    ...TYPOGRAPHY.caption,
  },
  tripTime: {
    ...TYPOGRAPHY.bodyStrong,
    marginTop: 2,
  },
  tripPlace: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    ...UI.divider,
    marginVertical: SPACE.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACE.lg,
    paddingVertical: SPACE.xs,
  },
  rowLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    flexShrink: 1,
  },
  rowValue: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: THEME_COLORS.textPrimary,
    textAlign: "right",
    flexShrink: 1,
  },
  rowValueStrong: {
    fontWeight: "700",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACE.xs,
  },
  totalLabel: {
    ...TYPOGRAPHY.h3,
  },
  totalValue: {
    ...TYPOGRAPHY.price,
    fontSize: 20,
  },
  cardNote: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACE.sm,
  },
  footer: {
    backgroundColor: THEME_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
  },
  footerInner: {
    paddingHorizontal: SPACE.screen,
    paddingVertical: SPACE.md,
    gap: SPACE.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: SPACE.sm,
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
})
