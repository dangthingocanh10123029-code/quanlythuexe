"use client"

import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Linking, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { formatCurrency, validatePhone } from '../utils/helpers'
import { PAYMENT_METHODS } from '../utils/constants'
import PaymentLogo from '../components/ui/PaymentLogo'
import { StatusBar } from 'expo-status-bar'
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from '../utils/theme'
import { AppHeader, AppInput, PrimaryButton } from '../components'

// Màu thương hiệu ZaloPay: chỉ dùng cho logo, điểm nhấn và nút thanh toán
const ZALOPAY_COLOR = PAYMENT_METHODS.ZALOPAY.color // #0068FF
const ZALOPAY_SOFT = "#EFF6FF"
const ZALOPAY_BUTTON_SHADOW = "0px 1px 2px rgba(0, 104, 255, 0.20), 0px 4px 12px rgba(0, 104, 255, 0.22)"

// Quay lại màn trước; nếu không có lịch sử (vào thẳng màn hình) thì về danh sách đơn
const goBackSafely = () => {
  if (router.canGoBack()) router.back()
  else router.replace("/(tabs)/bookings")
}

const ZALOPAY_URL = "https://zalopay.vn"

export default function ZaloPayPayment() {
  const { amount, bookingId } = useLocalSearchParams<{ amount: string, bookingId: string }>()
  const parsedAmount = parseFloat(amount || "0")

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const [isProcessing, setIsProcessing] = useState(false)
  // Khoá đồng bộ để chặn bấm thanh toán 2 lần trước khi state kịp cập nhật
  const processingRef = useRef(false)

  // Vào thẳng màn hình mà không có mã đơn đặt xe → báo lỗi và quay lại
  useEffect(() => {
    if (!bookingId) {
      Alert.alert(
        "Không tìm thấy đơn đặt xe",
        "Thiếu thông tin đơn đặt xe cần thanh toán. Vui lòng đặt xe lại.",
        [{ text: "OK", onPress: goBackSafely }]
      )
    }
  }, [bookingId])

  // Kiểm tra số điện thoại và mã PIN (dùng cho cả bước đăng nhập và bước thanh toán)
  const validateCredentials = (): boolean => {
    if (!validatePhone(phone)) {
      Alert.alert("Số điện thoại không hợp lệ", "Vui lòng nhập số điện thoại Việt Nam hợp lệ")
      return false
    }
    if (!/^\d{6}$/.test(pin)) {
      Alert.alert("Mã PIN không hợp lệ", "Mã PIN ZaloPay gồm 6 chữ số")
      return false
    }
    return true
  }

  const validatePayment = (): boolean => {
    if (!bookingId) {
      Alert.alert("Không tìm thấy đơn đặt xe", "Thiếu thông tin đơn đặt xe cần thanh toán. Vui lòng đặt xe lại.")
      return false
    }
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Số tiền không hợp lệ", "Số tiền cần thanh toán không hợp lệ. Vui lòng đặt xe lại.")
      return false
    }
    return validateCredentials()
  }

  const handlePay = async () => {
    if (processingRef.current) return
    if (!validatePayment()) return

    processingRef.current = true
    setIsProcessing(true)
    try {
      // Update the booking status to "Upcoming" after successful payment
      await updateDoc(doc(db, "bookings", bookingId), {
        status: "Upcoming",
        payment: {
          method: "ZaloPay",
          amount: parsedAmount,
          transactionId: `ZLP-${Math.random().toString(36).substr(2, 9)}`,
          paidAt: new Date(),
          status: "Completed",
          phone: phone
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

  const openZaloPay = async () => {
    try {
      await Linking.openURL(ZALOPAY_URL)
    } catch (error) {
      console.error("Error opening ZaloPay:", error)
      Alert.alert("Lỗi", "Không thể mở trang ZaloPay. Vui lòng thử lại sau.")
    }
  }

  const handleForgotPin = () => {
    Alert.alert(
      "Quên mã PIN?",
      "Mã PIN được đặt lại trong ứng dụng ZaloPay: mở ZaloPay → Cá nhân → Cài đặt bảo mật → Đổi mã PIN.",
      [
        { text: "Đóng", style: "cancel" },
        { text: "Mở ZaloPay", onPress: openZaloPay }
      ]
    )
  }

  if (isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar style="dark" />
        <AppHeader title="Xác nhận thanh toán" onBack={goBackSafely} />

        <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PaymentLogo method="zalopay" size={72} style={styles.iconContainer} />

          <Text style={styles.paymentTitle}>Thanh toán ZaloPay</Text>
          <View style={styles.accountChip}>
            <Ionicons name="person-circle-outline" size={16} color={ZALOPAY_COLOR} />
            <Text style={styles.emailText}>{phone}</Text>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Số tiền cần thanh toán</Text>
            <Text style={styles.amount}>{formatCurrency(parsedAmount)}</Text>
          </View>
        </ScrollView>

        <SafeAreaView edges={["bottom"]} style={styles.footer}>
          <View style={styles.footerInner}>
            <PrimaryButton
              title={`Thanh toán ${formatCurrency(parsedAmount)}`}
              onPress={handlePay}
              loading={isProcessing}
              icon="shield-checkmark-outline"
              style={styles.payButton}
            />
          </View>
        </SafeAreaView>

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
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <AppHeader title="Thanh toán ZaloPay" subtitle="Kết nối ví để tiếp tục" onBack={goBackSafely} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PaymentLogo method="zalopay" size={80} style={styles.logo} />
        <Text style={styles.loginHint}>Đăng nhập bằng số điện thoại Zalo của bạn</Text>

        <View style={styles.loginSection}>
          <AppInput
            icon="call-outline"
            placeholder="Số điện thoại (vd: 0901 234 567)"
            keyboardType="phone-pad"
            autoCapitalize="none"
            value={phone}
            onChangeText={setPhone}
            containerStyle={styles.input}
          />

          <AppInput
            icon="lock-closed-outline"
            placeholder="Mã PIN ZaloPay (6 số)"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            value={pin}
            onChangeText={(text) => setPin(text.replace(/\D/g, ''))}
            containerStyle={styles.input}
          />

          <PrimaryButton
            title="Đăng nhập"
            icon="arrow-forward"
            style={styles.loginButton}
            onPress={() => {
              if (!validateCredentials()) return
              setIsLoggedIn(true)
            }}
          />

          <TouchableOpacity onPress={handleForgotPin} activeOpacity={PRESS_OPACITY} style={styles.forgotButton}>
            <Text style={styles.forgotText}>Quên mã PIN?</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>hoặc</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity style={styles.signupButton} onPress={openZaloPay} activeOpacity={PRESS_OPACITY}>
            <Text style={styles.signupButtonText}>Đăng ký ZaloPay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE["4xl"],
    paddingBottom: SPACE.section,
    alignItems: 'center',
  },
  logo: {
    marginBottom: SPACE.xl,
  },
  loginHint: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACE.section,
    textAlign: 'center',
  },
  loginSection: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    marginBottom: SPACE.md,
  },
  loginButton: {
    width: '100%',
    marginTop: SPACE.sm,
    backgroundColor: ZALOPAY_COLOR,
    boxShadow: ZALOPAY_BUTTON_SHADOW,
  },
  forgotButton: {
    paddingVertical: SPACE.md,
    marginTop: SPACE.xs,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: ZALOPAY_COLOR,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: SPACE.lg,
  },
  line: {
    ...UI.divider,
    flex: 1,
  },
  orText: {
    ...TYPOGRAPHY.caption,
    paddingHorizontal: SPACE.lg,
  },
  signupButton: {
    ...UI.secondaryButton,
    width: '100%',
  },
  signupButtonText: {
    ...UI.secondaryButtonText,
  },
  iconContainer: {
    marginBottom: SPACE.xl,
  },
  paymentTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.sm,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACE.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: ZALOPAY_SOFT,
    marginBottom: SPACE.section,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '600',
    color: ZALOPAY_COLOR,
  },
  amountContainer: {
    ...UI.card,
    width: '100%',
    paddingVertical: SPACE["2xl"],
    paddingHorizontal: SPACE.lg,
    alignItems: 'center',
  },
  amountLabel: {
    ...TYPOGRAPHY.overline,
    marginBottom: SPACE.sm,
  },
  amount: {
    ...TYPOGRAPHY.display,
    textAlign: 'center',
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
    backgroundColor: ZALOPAY_COLOR,
    boxShadow: ZALOPAY_BUTTON_SHADOW,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME_COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACE.screen,
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
