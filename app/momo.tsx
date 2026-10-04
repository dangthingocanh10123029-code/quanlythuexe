"use client"

import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Modal, Alert, ActivityIndicator, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { formatCurrency, validatePhone } from '../utils/helpers'
import { PAYMENT_METHODS } from '../utils/constants'
import PaymentLogo from '../components/ui/PaymentLogo'

const { width } = Dimensions.get('window')

const COLORS = {
  background: "#FFFFFF",
  primary: PAYMENT_METHODS.MOMO.color, // #A50064
  text: "#4A4A4A",
  border: "#E8E8E8",
  white: "#FFFFFF"
}

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
    <SafeAreaView style={styles.container}>
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
              style={styles.closeButton}
              onPress={() => setShowQRModal(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <PaymentLogo method="momo" size={56} style={styles.modalLogo} />
            
            <Text style={styles.scanText}>Quét mã QR bằng ứng dụng MoMo</Text>

            <View style={styles.qrContainer}>
              <Image 
                source={require('../assets/qr-code.jpg')} 
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
              <Ionicons name="checkmark" size={48} color={COLORS.white} />
            </View>
            <Text style={styles.successTitle}>Thành công!</Text>
            <Text style={styles.successText}>Thanh toán hoàn tất.</Text>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận thanh toán</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons name="share-social-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowQRModal(true)} disabled={isProcessing}>
            <Ionicons name="ellipsis-vertical" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <PaymentLogo method="momo" size={80} style={styles.logo} />

        <Text style={styles.merchantName}>RENTO - Thuê xe tự lái</Text>

        <View style={styles.paymentDetails}>
          <View style={styles.row}>
            <Text style={styles.label}>THANH TOÁN BẰNG</Text>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
              <Text style={styles.balance}>{formatCurrency(balance)}</Text>
            </View>
          </View>

          <View style={styles.paymentMethod}>
            <View>
              <Text style={styles.paymentMethodText}>{PAYMENT_METHODS.MOMO.label}</Text>
              <Text style={styles.walletPhone}>{walletPhone}</Text>
            </View>
            <View style={styles.radio}>
              <View style={styles.radioInner} />
            </View>
          </View>

          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>SỐ TIỀN THANH TOÁN</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amount}>{formatCurrency(amount)}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
            onPress={handlePay}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.payButtonText}>Thanh toán {formatCurrency(amount)}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 16,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 30,
    alignItems: 'center',
  },
  logo: {
    marginBottom: 16,
  },
  merchantName: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 32,
  },
  paymentDetails: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.6,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.6,
  },
  balance: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 32,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  walletPhone: {
    fontSize: 13,
    color: COLORS.text,
    opacity: 0.6,
    marginTop: 2,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  amountSection: {
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.6,
    marginBottom: 16,
  },
  amountRow: {
    alignItems: 'center',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 6,
  },
  modalLogo: {
    marginVertical: 20,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  scanText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrContainer: {
    width: width * 0.7,
    height: width * 0.7,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  qrCode: {
    width: '100%',
    height: '100%',
  },
  merchantText: {
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 8,
  },
  amountText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
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