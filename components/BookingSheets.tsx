import { useEffect, useState } from "react"
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import DateTimePicker from "@react-native-community/datetimepicker"
import PaymentLogo from "./ui/PaymentLogo"
import { calcBookingPrice, toDate } from "../utils/booking"
import { cancelBooking, previewRefund, rescheduleBooking, submitReview } from "../utils/bookingActions"
import { PAYMENT_METHODS } from "../utils/constants"
import { formatCurrency, formatDate } from "../utils/helpers"
import type { Booking } from "../types/booking"
import type { Car } from "../types/car"
import { PRESS_OPACITY, RADIUS, SHADOWS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../utils/theme"

// Bottom sheet chọn phương thức thanh toán, đổi lịch, đánh giá và hộp thoại huỷ chuyến —
// dùng chung cho tab Chuyến đi và màn chi tiết đơn (app/booking/[id].tsx)

type PaymentRoute = "/credit-card" | "/momo" | "/zalopay"

const PAYMENT_OPTIONS: { id: "credit-card" | "momo" | "zalopay"; route: PaymentRoute; name: string; subtitle: string }[] = [
  { id: PAYMENT_METHODS.CARD.id, route: "/credit-card", name: PAYMENT_METHODS.CARD.label, subtitle: "Thẻ ATM / Visa / Mastercard" },
  { id: PAYMENT_METHODS.MOMO.id, route: "/momo", name: PAYMENT_METHODS.MOMO.label, subtitle: "Thanh toán qua ví MoMo" },
  { id: PAYMENT_METHODS.ZALOPAY.id, route: "/zalopay", name: PAYMENT_METHODS.ZALOPAY.label, subtitle: "Thanh toán qua ví ZaloPay" },
]

const DAY = 86_400_000
const MIN_DURATION = 1
const MAX_DURATION = 30

// Ô chọn ngày dùng khung của UI.input (TextStyle) cho một TouchableOpacity
const DATE_INPUT_BOX = UI.input as unknown as ViewStyle

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <>
      <View style={styles.sheetHandle} />
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{title}</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng"
          activeOpacity={PRESS_OPACITY}
        >
          <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </>
  )
}

// ===== Chọn phương thức thanh toán (đơn Confirmed) =====
export function PaymentMethodSheet({
  booking,
  onClose,
}: {
  booking: Pick<Booking, "id" | "carName" | "price"> | null
  onClose: () => void
}) {
  const goToPayment = (route: PaymentRoute) => {
    if (!booking) return
    onClose()
    router.push({
      pathname: route,
      params: { amount: String(Math.round(Number(booking.price) || 0)), bookingId: booking.id },
    })
  }

  return (
    <Modal visible={!!booking} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <SheetHeader title="Chọn phương thức thanh toán" onClose={onClose} />
          {booking && (
            <Text style={styles.modalSubtitle}>
              {booking.carName} • {formatCurrency(booking.price)}
            </Text>
          )}
          {PAYMENT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.paymentOption}
              onPress={() => goToPayment(option.route)}
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
  )
}

// ===== Đổi lịch (D7) =====
// Pending/Confirmed: đổi ngày + số ngày, tính lại giá, đơn quay về "Chờ xác nhận".
// Upcoming (đã thanh toán): chỉ dời ngày nhận, khoá số ngày thuê nên giá giữ nguyên.
export function RescheduleSheet({
  booking,
  car,
  onClose,
}: {
  booking: Booking | null
  car?: Pick<Car, "pricePerDay"> | null
  onClose: () => void
}) {
  const [pickupDate, setPickupDate] = useState<Date>(new Date())
  const [duration, setDuration] = useState(MIN_DURATION)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [saving, setSaving] = useState(false)

  // Mỗi lần mở cho một đơn: lấy ngày nhận hiện tại (giữ giờ nhận); đã qua thì gợi ý ngày mai
  useEffect(() => {
    if (!booking) return
    const current = toDate(booking.pickupDate)
    setPickupDate(current && current.getTime() > Date.now() ? current : new Date(Date.now() + DAY))
    setDuration(Math.max(MIN_DURATION, Number(booking.duration) || MIN_DURATION))
    setShowDatePicker(false)
  }, [booking?.id])

  const close = () => {
    setShowDatePicker(false)
    onClose()
  }

  const paid = (booking?.status || "").toLowerCase() === "upcoming"

  // Giá dự kiến (rescheduleBooking tính lại chính xác khi lưu)
  const getPreviewPrice = (b: Booking) => {
    if (paid || !car) return Number(b.price) || 0
    const base = { pricePerDay: car.pricePerDay, days: duration, addOns: b.selectedAddOns ?? [], pickupDate }
    const withPromo = calcBookingPrice({ ...base, promoCode: b.promoCode, isFirstBooking: true })
    return (withPromo.promoError ? calcBookingPrice(base) : withPromo).total
  }

  const onPickupDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === "ios")
    if (event?.type === "dismissed" || !selected) return
    setPickupDate(selected)
  }

  const save = async (b: Booking, days: number) => {
    try {
      setSaving(true)
      await rescheduleBooking(b.id, pickupDate, new Date(pickupDate.getTime() + days * DAY))
      close()
      Alert.alert(
        "Đổi lịch thành công",
        paid
          ? `Ngày nhận xe mới: ${formatDate(pickupDate)}.`
          : `Ngày nhận xe mới: ${formatDate(pickupDate)} • ${days} ngày. Đơn đang chờ RENTO xác nhận lại.`,
      )
    } catch (error: any) {
      console.error("Error rescheduling booking:", error)
      Alert.alert("Không thể đổi lịch", error?.message || "Vui lòng thử lại.")
    } finally {
      setSaving(false)
    }
  }

  const confirm = () => {
    if (!booking) return
    if (pickupDate < startOfToday()) {
      Alert.alert("Ngày không hợp lệ", "Vui lòng chọn ngày nhận xe từ hôm nay trở đi.")
      return
    }
    const days = paid ? Number(booking.duration) || MIN_DURATION : duration
    const message = paid
      ? "Đơn đã thanh toán chỉ được dời ngày nhận xe, giữ nguyên số ngày thuê và tổng tiền."
      : `Tổng tiền dự kiến: ${formatCurrency(getPreviewPrice(booking))}.\n\nĐơn sẽ quay về trạng thái "Chờ xác nhận" để RENTO xác nhận lại lịch mới.`
    Alert.alert("Xác nhận đổi lịch", message, [
      { text: "Quay lại", style: "cancel" },
      { text: "Đồng ý", onPress: () => save(booking, days) },
    ])
  }

  const previewPrice = booking ? getPreviewPrice(booking) : 0
  const priceDiff = booking ? previewPrice - (Number(booking.price) || 0) : 0
  const canDecrease = !paid && duration > MIN_DURATION
  const canIncrease = !paid && duration < MAX_DURATION

  return (
    <Modal visible={!!booking} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <SheetHeader title="Đổi lịch thuê xe" onClose={close} />

          {booking && (
            <>
              <Text style={styles.modalSubtitle}>{booking.carName}</Text>

              <Text style={styles.inputLabel}>Ngày nhận xe</Text>
              <TouchableOpacity
                style={[styles.dateInput, showDatePicker && styles.dateInputFocused]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons name="calendar-outline" size={20} color={THEME_COLORS.primary} />
                <Text style={styles.dateValueText}>{formatDate(pickupDate, "long")}</Text>
                <Ionicons name="chevron-down" size={20} color={THEME_COLORS.textMuted} />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={pickupDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  minimumDate={startOfToday()}
                  onChange={onPickupDateChange}
                />
              )}

              <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>Thời gian thuê</Text>
              <View style={[styles.stepper, paid && styles.stepperLocked]}>
                <TouchableOpacity
                  style={[styles.stepperButton, !canDecrease && styles.stepperButtonDisabled]}
                  onPress={() => setDuration((d) => Math.max(MIN_DURATION, d - 1))}
                  disabled={!canDecrease}
                  accessibilityLabel="Giảm số ngày thuê"
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="remove" size={20} color={canDecrease ? THEME_COLORS.primary : THEME_COLORS.textMuted} />
                </TouchableOpacity>
                <View style={styles.stepperCenter}>
                  {paid && <Ionicons name="lock-closed" size={14} color={THEME_COLORS.textMuted} />}
                  <Text style={styles.stepperValue}>{duration} ngày</Text>
                </View>
                <TouchableOpacity
                  style={[styles.stepperButton, !canIncrease && styles.stepperButtonDisabled]}
                  onPress={() => setDuration((d) => Math.min(MAX_DURATION, d + 1))}
                  disabled={!canIncrease}
                  accessibilityLabel="Tăng số ngày thuê"
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="add" size={20} color={canIncrease ? THEME_COLORS.primary : THEME_COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              {paid && (
                <Text style={styles.lockedHint}>
                  Đơn đã thanh toán giữ nguyên số ngày thuê và tổng tiền, bạn chỉ có thể dời ngày nhận xe.
                </Text>
              )}

              <View style={styles.reschedulePrice}>
                <Text style={styles.reschedulePriceLabel}>{paid ? "Tổng tiền" : "Tổng tiền mới"}</Text>
                <Text style={styles.reschedulePriceValue}>{formatCurrency(previewPrice)}</Text>
              </View>
              {priceDiff !== 0 && (
                <Text style={[styles.priceDiffText, { color: priceDiff > 0 ? THEME_COLORS.danger : THEME_COLORS.success }]}>
                  {priceDiff > 0 ? "Tăng" : "Giảm"} {formatCurrency(Math.abs(priceDiff))} so với giá hiện tại
                </Text>
              )}

              <TouchableOpacity
                style={[styles.confirmButton, saving && styles.disabledButton]}
                onPress={confirm}
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
  )
}

// ===== Đánh giá chuyến đi (G5): đơn Completed chưa đánh giá =====
const RATING_LABELS = ["", "Rất tệ", "Chưa hài lòng", "Bình thường", "Hài lòng", "Tuyệt vời"]
const MAX_COMMENT = 500

export function ReviewSheet({
  booking,
  onClose,
}: {
  booking: Pick<Booking, "id" | "carName"> | null
  onClose: () => void
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [focused, setFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  // Lỗi hiện ngay trong sheet (Alert không hiện trên web)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!booking) return
    setRating(0)
    setComment("")
    setError(null)
  }, [booking?.id])

  const submit = async () => {
    if (!booking || !rating || saving) return
    try {
      setSaving(true)
      setError(null)
      await submitReview(booking.id, rating, comment)
      onClose()
      Alert.alert("Cảm ơn bạn!", "Đánh giá của bạn đã được gửi.")
    } catch (e: any) {
      console.error("Error submitting review:", e)
      setError(e?.message || "Không gửi được đánh giá. Vui lòng thử lại.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={!!booking} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.modalSheet}>
          <SheetHeader title="Đánh giá chuyến đi" onClose={onClose} />
          {booking && <Text style={styles.modalSubtitle}>{booking.carName}</Text>}

          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                accessibilityRole="button"
                accessibilityLabel={`${star} sao`}
                accessibilityState={{ selected: star <= rating }}
                hitSlop={6}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={40}
                  color={star <= rating ? THEME_COLORS.accent : THEME_COLORS.borderStrong}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingLabel}>{rating ? RATING_LABELS[rating] : "Chạm để chọn số sao"}</Text>

          <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>Nhận xét (không bắt buộc)</Text>
          <TextInput
            style={[styles.commentInput, focused && (styles.dateInputFocused as TextStyle)]}
            value={comment}
            onChangeText={setComment}
            placeholder="Chia sẻ trải nghiệm của bạn về xe và dịch vụ..."
            placeholderTextColor={THEME_COLORS.textMuted}
            maxLength={MAX_COMMENT}
            multiline
            textAlignVertical="top"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <Text style={styles.commentCounter}>
            {comment.length}/{MAX_COMMENT}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={THEME_COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.confirmButton, (!rating || saving) && styles.disabledButton]}
            onPress={submit}
            disabled={!rating || saving}
            activeOpacity={PRESS_OPACITY}
          >
            <Text style={styles.confirmButtonText}>{saving ? "Đang gửi..." : "Gửi đánh giá"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ===== Huỷ chuyến (D5): hộp thoại hiện số tiền được hoàn =====
export function confirmCancelBooking(booking: Booking) {
  const refund = previewRefund(booking)
  let message = `Bạn có chắc muốn huỷ chuyến ${booking.carName}?`
  if (refund.amount > 0) {
    message +=
      `\n\nBạn sẽ được hoàn ${formatCurrency(refund.amount)} (${refund.percent}% số tiền đã thanh toán) ` +
      "về MoMo, ZaloPay hoặc tài khoản ngân hàng bạn đã dùng để thanh toán."
    if (refund.percent < 100) message += "\n\nHuỷ trong vòng 24 giờ trước giờ nhận xe chỉ được hoàn 70%."
  } else {
    message += "\n\nĐơn chưa thanh toán nên không phát sinh hoàn tiền."
  }

  Alert.alert("Huỷ chuyến", message, [
    { text: "Không", style: "cancel" },
    {
      text: "Huỷ chuyến",
      style: "destructive",
      onPress: async () => {
        try {
          await cancelBooking(booking.id, "user")
          Alert.alert("Đã huỷ chuyến", "Chuyến đi đã được chuyển vào mục Lịch sử.")
        } catch (error: any) {
          console.error("Error cancelling booking:", error)
          Alert.alert("Không thể huỷ chuyến", error?.message || "Vui lòng thử lại.")
        }
      },
    },
  ])
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME_COLORS.overlay,
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
  stepperLocked: {
    backgroundColor: THEME_COLORS.surfaceMuted,
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
  stepperCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepperValue: {
    ...TYPOGRAPHY.h3,
  },
  lockedHint: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACE.sm,
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
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACE.md,
  },
  ratingLabel: {
    ...TYPOGRAPHY.bodyStrong,
    textAlign: "center",
    marginTop: SPACE.sm,
  },
  commentInput: {
    ...UI.input,
    height: 120,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.md,
  },
  commentCounter: {
    ...TYPOGRAPHY.caption,
    textAlign: "right",
    marginTop: SPACE.xs,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE.sm,
    marginTop: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.dangerSoft,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
    color: THEME_COLORS.danger,
    flex: 1,
  },
})
