"use client"

import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { formatCurrency, validatePhone } from '../utils/helpers'
import { PAYMENT_METHODS } from '../utils/constants'
import PaymentLogo from '../components/ui/PaymentLogo'

const COLORS = {
  background: "#FFFFFF",
  primary: PAYMENT_METHODS.ZALOPAY.color, // #0068FF
  secondary: "#00B14F", // xanh lá ZaloPay
  text: "#4A4A4A",
  border: "#E8E8E8",
  white: "#FFFFFF"
}

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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xác nhận thanh toán</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <PaymentLogo method="zalopay" size={80} style={styles.iconContainer} />

          <Text style={styles.paymentTitle}>Thanh toán ZaloPay</Text>
          <Text style={styles.emailText}>{phone}</Text>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Số tiền cần thanh toán</Text>
            <Text style={styles.amount}>{formatCurrency(parsedAmount)}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
            onPress={handlePay}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.payButtonText}>Thanh toán {formatCurrency(parsedAmount)}</Text>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          animationType="fade"
          transparent={true}
          visible={showSuccessModal}
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.successModalContent}>
              <View style={styles.iconCircle}>
                <Ionicons name="checkmark" size={48} color={COLORS.white} />
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán ZaloPay</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <PaymentLogo method="zalopay" size={96} style={styles.logo} />
        <Text style={styles.loginHint}>Đăng nhập bằng số điện thoại Zalo của bạn</Text>

        <View style={styles.loginSection}>
          <TextInput 
            style={styles.input}
            placeholder="Số điện thoại (vd: 0901 234 567)"
            keyboardType="phone-pad"
            autoCapitalize="none"
            value={phone}
            onChangeText={setPhone}
          />

          <TextInput 
            style={styles.input}
            placeholder="Mã PIN ZaloPay (6 số)"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            value={pin}
            onChangeText={(text) => setPin(text.replace(/\D/g, ''))}
          />

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => {
              if (!validateCredentials()) return
              setIsLoggedIn(true)
            }}
          >
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForgotPin}>
            <Text style={styles.forgotText}>Quên mã PIN?</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>hoặc</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity style={styles.signupButton} onPress={openZaloPay}>
            <Text style={styles.signupButtonText}>Đăng ký ZaloPay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  logo: {
    marginTop: 40,
    marginBottom: 16,
  },
  loginHint: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  loginSection: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  loginButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  forgotText: {
    color: COLORS.secondary,
    fontSize: 14,
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  orText: {
    color: COLORS.text,
    paddingHorizontal: 16,
  },
  signupButton: {
    width: '100%',
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signupButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  iconContainer: {
    marginBottom: 24,
  },
  paymentTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 32,
  },
  amountContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 2,
  },
  amountLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  payButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    elevation: 5,
    width: '80%',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00C851',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: COLORS.text,
    opacity: 0.8,
  },
})