"use client"

import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Modal, Alert, Share, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { formatCurrency, validatePhone } from '../utils/helpers'
import { PAYMENT_METHODS } from '../utils/constants'
import { PAYMENT_ASSETS } from '../data/assets'
import PaymentLogo from '../components/ui/PaymentLogo'
import { StatusBar } from 'expo-status-bar'
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from '../utils/theme'
import { AppHeader, PrimaryButton } from '../components'

const { width } = Dimensions.get('window')

// Màu thương hiệu MoMo: chỉ dùng cho logo, điểm nhấn và nút thanh toán
const MOMO_COLOR = PAYMENT_METHODS.MOMO.color // #A50064
const MOMO_SOFT = "#FDF2F8"
const MOMO_BUTTON_SHADOW = "0px 1px 2px rgba(165, 0, 100, 0.20), 0px 4px 12px rgba(165, 0, 100, 0.22)"

// Quay lại màn trước; nếu không có lịch sử (vào thẳng màn hình) thì về danh sách đơn
const goBackSafely = () => {
  if (router.canGoBack()) router.back()
  else router.replace("/(tabs)/bookings")
}

export default function MomoPayment() {
  const { amount: amountParam, bookingId } = useLocalSearchParams<{ amount: string, bookingId: string }>()
  const [showQRModal, setShowQRModal] = useState(true)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const amount = parseFloat(amountParam || "0")
  // Số dư ví giả lập: luôn đủ để thanh toán đơn khi demo
  const balance = Math.max(15000000, Math.ceil((amount + 5000000) / 100000) * 100000)
  const walletPhone = "0901 234 567"

  const [isProcessing, setIsProcessing] = useState(false)
  // Khoá đồng bộ để chặn bấm thanh toán 2 lần trước khi state kịp cập nhật
  const processingRef = useRef(false)

  // Vào thẳng màn hình mà không có mã đơn đặt xe → báo lỗi và quay lại
  useEffect(() => {
    if (!bookingId) {
      setShowQRModal(false)
      Alert.alert(
        "Không tìm thấy đơn đặt xe",
        "Thiếu thông tin đơn đặt xe cần thanh toán. Vui lòng đặt xe lại.",
        [{ text: "OK", onPress: goBackSafely }]
      )
    }
  }, [bookingId])

  const validatePayment = (): boolean => {
    if (!bookingId) {
      Alert.alert("Không tìm thấy đơn đặt xe", "Thiếu thông tin đơn đặt xe cần thanh toán. Vui lòng đặt xe lại.")
      return false
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      Alert.alert("Số tiền không hợp lệ", "Số tiền cần thanh toán không hợp lệ. Vui lòng đặt xe lại.")
      return false
    }
    if (!validatePhone(walletPhone)) {
      Alert.alert("Ví MoMo không hợp lệ", "Số điện thoại ví MoMo không hợp lệ")
      return false
    }
    return true
  }

  const handlePay = async () => {
    if (processingRef.current) return
    if (!validatePayment()) return

    processingRef.current = true
    setIsProcessing(true)
    try {
      // Update the booking status and add payment details
      await updateDoc(doc(db, "bookings", bookingId), {
        status: "Upcoming",
        payment: {
          method: "MoMo",
          amount: amount,
          transactionId: `MOMO-${Math.random().toString(36).substr(2, 9)}`,
          paidAt: new Date(),
          status: "Completed"
        }
      })

      // Chỉ báo thành công sau khi đã ghi dữ liệu xong; giữ khoá để không bấm lại được
      setShowSuccessModal(true)
      setTimeout(() => {
        setShowSuccessModal(false)
        router.replace("/(tabs)/bookings") // Use replace instead of push
      }, 2000)
    } catch (error) {
      console.error("Error updating booking:", error)
      processingRef.current = false
      setIsProcessing(false)
      Alert.alert("Thanh toán thất bại", "Không thể cập nhật đơn đặt xe. Vui lòng kiểm tra kết nối mạng và thử lại.")
    }
  }

  // Chia sẻ thông tin thanh toán (nút chia sẻ trên header)
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Thanh toán ${formatCurrency(amount)} cho RENTO - Thuê xe tự lái qua ${PAYMENT_METHODS.MOMO.label}.`
      })
    } catch (error) {
      console.error("Error sharing payment:", error)
      Alert.alert("Lỗi", "Không thể chia sẻ thông tin thanh toán")
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      {/* QR Code Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showQRModal}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={[styles.iconButton, styles.closeButton]}
              onPress={() => setShowQRModal(false)}
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
            </TouchableOpacity>

            <PaymentLogo method="momo" size={56} style={styles.modalLogo} />

            <Text style={styles.scanText}>Quét mã QR bằng ứng dụng MoMo</Text>

            <View style={styles.qrContainer}>
              <Image
                source={PAYMENT_ASSETS.qrCode}
                style={styles.qrCode}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.merchantText}>RENTO - Thuê xe tự lái</Text>
            <Text style={styles.amountText}>{formatCurrency(amount)}</Text>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark" size={36} color={THEME_COLORS.success} />
            </View>
            <Text style={styles.successTitle}>Thành công!</Text>
            <Text style={styles.successText}>Thanh toán hoàn tất.</Text>
          </View>
        </View>
      </Modal>

      <AppHeader
        title="Xác nhận thanh toán"
        onBack={goBackSafely}
        backIcon="close"
        sideWidth={92}
        right={(
          <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={handleShare} activeOpacity={PRESS_OPACITY}>
            <Ionicons name="share-social-outline" size={20} color={THEME_COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowQRModal(true)} disabled={isProcessing} activeOpacity={PRESS_OPACITY}>
            <Ionicons name="ellipsis-vertical" size={20} color={THEME_COLORS.textSecondary} />
          </TouchableOpacity>
          </View>
        )}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        <View style={styles.merchantBlock}>
          <PaymentLogo method="momo" size={72} style={styles.logo} />
          <Text style={styles.merchantName}>RENTO - Thuê xe tự lái</Text>
        </View>

        <View style={styles.paymentDetails}>
          <View style={styles.row}>
            <Text style={styles.label}>THANH TOÁN BẰNG</Text>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
              <Text style={styles.balance}>{formatCurrency(balance)}</Text>
            </View>
          </View>

          <View style={styles.paymentMethod}>
            <View style={styles.paymentMethodLeft}>
              <PaymentLogo method="momo" size={36} />
              <View>
                <Text style={styles.paymentMethodText}>{PAYMENT_METHODS.MOMO.label}</Text>
                <Text style={styles.walletPhone}>{walletPhone}</Text>
              </View>
            </View>
            <View style={styles.radio}>
              <View style={styles.radioInner} />
            </View>
          </View>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>SỐ TIỀN THANH TOÁN</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>{formatCurrency(amount)}</Text>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        <View style={styles.footerInner}>
          <PrimaryButton
            title={`Thanh toán ${formatCurrency(amount)}`}
            onPress={handlePay}
            loading={isProcessing}
            icon="shield-checkmark-outline"
            style={styles.payButton}
          />
        </View>
      </SafeAreaView>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: SPACE.sm,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.section,
    paddingBottom: SPACE.section,
  },
  merchantBlock: {
    alignItems: 'center',
    marginBottom: SPACE.section,
  },
  logo: {
    marginBottom: SPACE.lg,
  },
  merchantName: {
    ...TYPOGRAPHY.h2,
    textAlign: 'center',
  },
  paymentDetails: {
    ...UI.card,
    padding: SPACE.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACE.lg,
  },
  label: {
    ...TYPOGRAPHY.overline,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
  balance: {
    ...TYPOGRAPHY.bodyStrong,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: MOMO_COLOR,
    backgroundColor: MOMO_SOFT,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
  },
  paymentMethodText: {
    ...TYPOGRAPHY.bodyStrong,
  },
  walletPhone: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: MOMO_COLOR,
    backgroundColor: THEME_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: MOMO_COLOR,
  },
  amountSection: {
    marginTop: SPACE.section,
    alignItems: 'center',
  },
  amountLabel: {
    ...TYPOGRAPHY.overline,
    marginBottom: SPACE.sm,
  },
  amountRow: {
    alignItems: 'center',
  },
  amount: {
    ...TYPOGRAPHY.display,
  },
  footer: {
    backgroundColor: THEME_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
  },
  footerInner: {
    paddingHorizontal: SPACE.screen,
    paddingVertical: SPACE.md,
  },
  payButton: {
    backgroundColor: MOMO_COLOR,
    boxShadow: MOMO_BUTTON_SHADOW,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME_COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACE.screen,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: THEME_COLORS.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACE["2xl"],
    alignItems: 'center',
    position: 'relative',
    ...SHADOWS.raised,
  },
  closeButton: {
    position: 'absolute',
    top: SPACE.lg,
    right: SPACE.lg,
    zIndex: 1,
  },
  modalLogo: {
    marginTop: SPACE.sm,
    marginBottom: SPACE.lg,
  },
  scanText: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACE.xl,
    textAlign: 'center',
  },
  qrContainer: {
    width: width * 0.62,
    height: width * 0.62,
    maxWidth: 280,
    maxHeight: 280,
    backgroundColor: THEME_COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    padding: SPACE.md,
    marginBottom: SPACE.xl,
  },
  qrCode: {
    width: '100%',
    height: '100%',
  },
  merchantText: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACE.xs,
  },
  amountText: {
    ...TYPOGRAPHY.h2,
    color: MOMO_COLOR,
  },
  successModalContent: {
    backgroundColor: THEME_COLORS.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACE["3xl"],
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...SHADOWS.raised,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.xl,
  },
  successTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.sm,
  },
  successText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
  },
})
