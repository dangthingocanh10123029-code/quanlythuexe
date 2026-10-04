"use client"

import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Image, Animated, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from "../config/firebase"
import { formatCurrency } from "../utils/helpers"
import { PAYMENT_METHODS } from "../utils/constants"

const COLORS = {
  background: "#FFFFFF",
  primary: "#1054CF",
  text: "#4A4A4A",
  border: "#E8E8E8",
  white: "#FFFFFF",
  error: "#FF4444"
}

// Quay lại màn trước; nếu không có lịch sử (vào thẳng màn hình) thì về danh sách đơn
const goBackSafely = () => {
  if (router.canGoBack()) router.back()
  else router.replace("/(tabs)/bookings")
}

// Trả về thông báo lỗi tiếng Việt nếu hạn thẻ (MM/YY) không hợp lệ, ngược lại trả về null
const getExpiryError = (expiry: string): string | null => {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry)
  if (!match) return "Vui lòng nhập ngày hết hạn theo định dạng MM/YY"
  const month = parseInt(match[1], 10)
  const year = 2000 + parseInt(match[2], 10)
  if (month < 1 || month > 12) return "Tháng hết hạn phải từ 01 đến 12"
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  // Thẻ còn hiệu lực đến hết tháng ghi trên thẻ
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return "Thẻ đã hết hạn. Vui lòng dùng thẻ khác"
  }
  return null
}

export default function CreditCardScreen() {
  // Get params at component level
  const { amount: amountParam, bookingId } = useLocalSearchParams<{ amount: string, bookingId: string }>()
  const amount = parseFloat(amountParam || "0")
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  // Khoá đồng bộ để chặn bấm thanh toán 2 lần trước khi state kịp cập nhật
  const processingRef = useRef(false)

  // Add states for card details
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [isFlipped, setIsFlipped] = useState(false)
  const flipAnimation = useRef(new Animated.Value(0)).current

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

  const validateCard = (): boolean => {
    if (!bookingId) {
      Alert.alert("Không tìm thấy đơn đặt xe", "Thiếu thông tin đơn đặt xe cần thanh toán. Vui lòng đặt xe lại.")
      return false
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      Alert.alert("Số tiền không hợp lệ", "Số tiền cần thanh toán không hợp lệ. Vui lòng đặt xe lại.")
      return false
    }
    if (!/^\d{16}$/.test(cardNumber)) {
      Alert.alert("Số thẻ không hợp lệ", "Số thẻ phải gồm đủ 16 chữ số")
      return false
    }
    const name = cardName.trim()
    if (!name) {
      Alert.alert("Thiếu tên chủ thẻ", "Vui lòng nhập tên chủ thẻ")
      return false
    }
    if (!/^[A-Za-z ]+$/.test(name)) {
      Alert.alert("Tên chủ thẻ không hợp lệ", "Tên chủ thẻ chỉ gồm chữ cái không dấu, ví dụ: NGUYEN VAN A")
      return false
    }
    const expiryError = getExpiryError(expiry)
    if (expiryError) {
      Alert.alert("Ngày hết hạn không hợp lệ", expiryError)
      return false
    }
    if (!/^\d{3}$/.test(cvv)) {
      Alert.alert("CVV không hợp lệ", "Mã CVV phải gồm 3 chữ số ở mặt sau thẻ")
      return false
    }
    return true
  }

  const handlePay = async () => {
    if (processingRef.current) return
    if (!validateCard()) return

    processingRef.current = true
    setIsProcessing(true)
    try {
      // Update the booking status to "Upcoming" after successful payment
      await updateDoc(doc(db, "bookings", bookingId), {
        status: "Upcoming",
        payment: {
          method: PAYMENT_METHODS.CARD.label,
          amount: amount,
          transactionId: `CARD-${Math.random().toString(36).substr(2, 9)}`,
          paidAt: new Date(),
          status: "Completed",
          lastFourDigits: cardNumber.slice(-4),
          cardholderName: cardName.trim().toUpperCase()
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

  // Format card number with spaces
  const formatCardNumber = (number: string) => {
    const digits = number.replace(/\s/g, '')
    const groups = digits.match(/.{1,4}/g) || []
    return groups.join(' ')
  }


  const displayCardNumber = () => {
    const formatted = formatCardNumber(cardNumber)
    const remaining = 16 - cardNumber.length
    return formatted + '•'.repeat(remaining)
  }

  // Add flip animation function
  const flipCard = (showBack: boolean) => {
    if (showBack === isFlipped) return; // Prevent double animation
    setIsFlipped(showBack);
    Animated.spring(flipAnimation, {
      toValue: showBack ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }

  // Add interpolation for the flip animation
  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg']
  })

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg']
  })

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }]
  }
  
  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }]
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán bằng thẻ</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.cardContainer}>
          {/* Front of card */}
          <Animated.View style={[styles.cardPreview, frontAnimatedStyle]}>
            <View style={styles.cardTopRow}>
              <Image
                source={require('../assets/card-chip.png')}
                style={styles.chip}
                resizeMode="contain"
              />
              <Image
                source={require('../assets/creditcard-logo.png')}
                style={styles.cardLogoLarge}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.cardNumber}>
              {formatCardNumber(displayCardNumber())}
            </Text>
            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.cardLabel}>CHỦ THẺ</Text>
                <Text style={styles.cardValue}>
                  {cardName || 'HỌ VÀ TÊN'}
                </Text>
              </View>
              <View>
                <Text style={styles.cardLabel}>HẾT HẠN</Text>
                <Text style={styles.cardValue}>
                  {expiry || 'MM/YY'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Back of card */}
          <Animated.View style={[styles.cardPreview, styles.cardBack, backAnimatedStyle]}>
            <View style={styles.magneticStrip} />
            <View style={styles.cvvBackRow}>
              <View style={styles.cvvLabelBox}>
                <Text style={styles.cvvLabelBack}>CVV</Text>
                <View style={styles.cvvBoxBack}>
                  <Text style={styles.cvvText}>{cvv || '•••'}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Thông tin thẻ</Text>
          
          <TextInput 
            style={styles.input}
            placeholder="Số thẻ"
            keyboardType="numeric"
            maxLength={16}
            value={cardNumber}
            onChangeText={(text) => {
              const cleaned = text.replace(/\D/g, '')
              setCardNumber(cleaned)
            }}
          />
          
          <View style={styles.row}>
            <TextInput 
              style={[styles.input, styles.expiryInput]}
              placeholder="MM/YY"
              keyboardType="numeric"
              maxLength={5}
              value={expiry}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, '')
                if (cleaned.length >= 2) {
                  setExpiry(cleaned.slice(0, 2) + '/' + cleaned.slice(2))
                } else {
                  setExpiry(cleaned)
                }
              }}
            />
            <TextInput 
              style={[styles.input, styles.cvvInput]}
              placeholder="CVV"
              keyboardType="numeric"
              maxLength={3}
              value={cvv}
              onFocus={() => flipCard(true)}
              onBlur={() => flipCard(false)}
              onChangeText={(text) => setCvv(text.replace(/\D/g, ''))}
              secureTextEntry
            />
          </View>

          <TextInput 
            style={styles.input}
            placeholder="Tên chủ thẻ (không dấu)"
            autoCapitalize="characters"
            value={cardName}
            onChangeText={setCardName}
          />
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Số tiền cần thanh toán</Text>
          <Text style={styles.amount}>{formatCurrency(amount)}</Text>
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
  },
  cardContainer: {
    height: 200,
    marginBottom: 24,
  },
  cardPreview: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    height: 200,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chip: {
    width: 40,
    height: 24,
  },
  cardLogoLarge: {
    width: 80,
    height: 40,
  },
  cardNumber: {
    color: COLORS.white,
    fontSize: 24,
    letterSpacing: 2,
    marginBottom: 20,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: COLORS.white,
    fontSize: 10,
    opacity: 0.8,
    marginBottom: 4,
  },
  cardValue: {
    color: COLORS.white,
    fontSize: 14,
    letterSpacing: 1,
  },
  amountContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    alignItems: 'center',
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
  },
  cardSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  halfInput: {
    flex: 1,
  },
  expiryInput: {
    flex: 0.7,      // less than 1, so it's shorter
    marginRight: 8,
  },
  cvvInput: {
    flex: 1.3,      // more than 1, so it's wider
  },
  payButton: {
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
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    backfaceVisibility: 'hidden',
  },
  magneticStrip: {
    height: 36,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    marginTop: 12,
    marginBottom: 24,
    width: '100%',
  },
  cvvContainer: {
    padding: 20,
    alignItems: 'flex-end',
  },
  cvvLabel: {
    color: COLORS.white,
    fontSize: 10,
    marginBottom: 4,
  },
  cvvBox: {
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 4,
    width: 60,
    alignItems: 'center',
  },
  cvvText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  cvvBackRow: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cvvLabelBox: {
    alignItems: 'center',
  },
  cvvLabelBack: {
    color: COLORS.text,
    fontSize: 12,
    marginBottom: 4,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cvvBoxBack: {
    backgroundColor: COLORS.white,
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
})