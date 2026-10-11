import { useEffect, useState } from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
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
import PaymentLogo from "./ui/PaymentLogo"
import DateTimeRangePicker from "./DateTimeRangePicker"
import { calcBookingPrice, daysBetween, getBookingRange } from "../utils/booking"
import { cancelBooking, previewRefund, rescheduleBooking, submitReview } from "../utils/bookingActions"
import { PAYMENT_METHODS } from "../utils/constants"
import { formatCurrency, formatDate } from "../utils/helpers"
import { confirmDialog, showAlert } from "../utils/dialog"
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
const HOUR = 3_600_000

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
            <Text style={styles.modalSubtitle} numberOfLines={2}>
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
// Pending/Confirmed: chọn lại giờ nhận + giờ trả, tính lại giá, đơn quay về "Chờ xác nhận".
// Upcoming (đã thanh toán): chỉ dời giờ nhận, giờ trả đi theo để giữ nguyên số giờ thuê nên giá giữ nguyên.
export function RescheduleSheet({
  booking,
  car,
  onClose,
}: {
  booking: Booking | null
  car?: Pick<Car, "pricePerDay"> | null
  onClose: () => void
}) {
  const [pickupAt, setPickupAt] = useState<Date>(new Date())
  const [returnAt, setReturnAt] = useState<Date>(new Date(Date.now() + DAY))
  const [span, setSpan] = useState(DAY) // số ms thuê hiện tại của đơn
  const [saving, setSaving] = useState(false)

  // Mỗi lần mở cho một đơn: lấy lịch hiện tại; giờ nhận đã qua thì gợi ý ngày mai cùng giờ
  useEffect(() => {
    if (!booking) return
    const range = getBookingRange(booking)
    const currentSpan = range ? Math.max(HOUR, range.end.getTime() - range.start.getTime()) : DAY
    let start = range?.start ?? new Date(Date.now() + DAY)
    if (start.getTime() <= Date.now()) {
      const tomorrow = new Date(Date.now() + DAY)
      tomorrow.setHours(start.getHours(), start.getMinutes(), 0, 0)
      start = tomorrow
    }
    setSpan(currentSpan)
    setPickupAt(start)
    setReturnAt(new Date(start.getTime() + currentSpan))
  }, [booking?.id])

  const paid = (booking?.status || "").toLowerCase() === "upcoming"
  // Đơn đã thanh toán: giờ trả luôn = giờ nhận mới + số giờ thuê cũ (rescheduleBooking cũng tính như vậy)
  const shownReturn = paid ? new Date(pickupAt.getTime() + span) : returnAt
  const days = daysBetween(pickupAt, shownReturn)

  // Giá dự kiến (rescheduleBooking tính lại chính xác khi lưu)
  const getPreviewPrice = (b: Booking) => {
    if (paid || !car) return Number(b.price) || 0
    const base = { pricePerDay: car.pricePerDay, days, addOns: b.selectedAddOns ?? [], pickupDate: pickupAt }
    const withPromo = calcBookingPrice({ ...base, promoCode: b.promoCode, isFirstBooking: true })
    return (withPromo.promoError ? calcBookingPrice(base) : withPromo).total
  }

  const save = async (b: Booking) => {
    try {
      setSaving(true)
      await rescheduleBooking(b.id, pickupAt, shownReturn)
      onClose()
      showAlert(
        "Đổi lịch thành công",
        paid
          ? `Thời gian nhận xe mới: ${formatDate(pickupAt, "datetime")}.`
          : `Nhận xe ${formatDate(pickupAt, "datetime")}, trả xe ${formatDate(shownReturn, "datetime")} • ${days} ngày. Đơn đang chờ RENTO xác nhận lại.`,
      )
    } catch (error: any) {
      console.error("Error rescheduling booking:", error)
      showAlert("Không thể đổi lịch", error?.message || "Vui lòng thử lại.")
    } finally {
      setSaving(false)
    }
  }

  const confirm = () => {
    if (!booking) return
    if (pickupAt.getTime() <= Date.now()) {
      showAlert("Thời gian không hợp lệ", "Vui lòng chọn thời gian nhận xe sau thời điểm hiện tại.")
      return
    }
    const message = paid
      ? "Đơn đã thanh toán chỉ được dời thời gian nhận xe, giữ nguyên số giờ thuê và tổng tiền."
      : `Tổng tiền dự kiến: ${formatCurrency(getPreviewPrice(booking))}.\n\nĐơn sẽ quay về trạng thái "Chờ xác nhận" để RENTO xác nhận lại lịch mới.`
    confirmDialog("Xác nhận đổi lịch", message, "Đồng ý", () => save(booking), { cancelText: "Quay lại" })
  }

  const previewPrice = booking ? getPreviewPrice(booking) : 0
  const priceDiff = booking ? previewPrice - (Number(booking.price) || 0) : 0

  return (
    <Modal visible={!!booking} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <SheetHeader title="Đổi lịch thuê xe" onClose={onClose} />

          {booking && (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalSubtitle}>{booking.carName}</Text>

              <Text style={styles.inputLabel}>Thời gian thuê</Text>
              <DateTimeRangePicker
                pickupAt={pickupAt}
                returnAt={shownReturn}
                onPickupChange={setPickupAt}
                onReturnChange={setReturnAt}
                returnLocked={paid}
              />
              <View style={styles.durationRow}>
                {paid && <Ionicons name="lock-closed" size={14} color={THEME_COLORS.textMuted} />}
                <Text style={styles.durationText}>Tổng thời gian thuê: {days} ngày</Text>
              </View>
              {paid && (
                <Text style={styles.lockedHint}>
                  Đơn đã thanh toán giữ nguyên số giờ thuê và tổng tiền, bạn chỉ có thể dời thời gian nhận xe.
                </Text>
              )}

              <View style={styles.reschedulePrice}>
                <Text style={styles.reschedulePriceLabel}>{paid ? "Tổng tiền" : "Tổng tiền mới"}</Text>
                <Text style={styles.reschedulePriceValue} numberOfLines={1}>{formatCurrency(previewPrice)}</Text>
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
            </ScrollView>
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
  // Lỗi hiện ngay trong sheet, không đóng sheet
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
      showAlert("Cảm ơn bạn!", "Đánh giá của bạn đã được gửi.")
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

  confirmDialog(
    "Huỷ chuyến",
    message,
    "Huỷ chuyến",
    async () => {
      try {
        await cancelBooking(booking.id, "user")
        showAlert("Đã huỷ chuyến", "Chuyến đi đã được chuyển vào mục Lịch sử.")
      } catch (error: any) {
        console.error("Error cancelling booking:", error)
        showAlert("Không thể huỷ chuyến", error?.message || "Vui lòng thử lại.")
      }
    },
    { destructive: true, cancelText: "Không" },
  )
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
  dateInputFocused: {
    ...UI.inputFocused,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SPACE.md,
  },
  durationText: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.primary,
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
