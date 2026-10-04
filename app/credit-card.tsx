"use client"

import { View, Text, StyleSheet, Modal, Image, Animated, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from "../config/firebase"
import { formatCurrency } from "../utils/helpers"
import { PAYMENT_METHODS } from "../utils/constants"
import { PAYMENT_ASSETS } from "../data/assets"
import { StatusBar } from "expo-status-bar"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI } from "../utils/theme"
import { AppHeader, AppInput, PrimaryButton } from "../components"


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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <AppHeader title="Thanh toán bằng thẻ" subtitle="Bảo mật và xác thực an toàn" onBack={goBackSafely} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardContainer}>
          {/* Front of card */}
          <Animated.View style={[styles.cardPreview, frontAnimatedStyle]}>
            <View style={styles.cardTopRow}>
              <Image
                source={PAYMENT_ASSETS.cardChip}
                style={styles.chip}
                resizeMode="contain"
              />
              <Image
                source={PAYMENT_ASSETS.cardNetwork}
                style={styles.cardLogoLarge}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.cardNumber} numberOfLines={1} adjustsFontSizeToFit>
              {formatCardNumber(displayCardNumber())}
            </Text>
            <View style={styles.cardBottom}>
              <View style={{ flex: 1, marginRight: SPACE.lg }}>
                <Text style={styles.cardLabel}>CHỦ THẺ</Text>
                <Text style={styles.cardValue} numberOfLines={1}>
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

          <AppInput
            icon="card-outline"
            placeholder="Số thẻ"
            keyboardType="numeric"
            maxLength={16}
            value={cardNumber}
            onChangeText={(text) => {
              const cleaned = text.replace(/\D/g, '')
              setCardNumber(cleaned)
            }}
            containerStyle={styles.inputField}
          />

          <View style={styles.row}>
            <AppInput
              icon="calendar-outline"
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
              containerStyle={styles.expiryInput}
            />
            <AppInput
              icon="lock-closed-outline"
              placeholder="CVV"
              keyboardType="numeric"
              maxLength={3}
              value={cvv}
              onFocus={() => {
                flipCard(true)
              }}
              onBlur={() => {
                flipCard(false)
              }}
              onChangeText={(text) => setCvv(text.replace(/\D/g, ''))}
              secureTextEntry
              containerStyle={styles.cvvInput}
            />
          </View>

          <AppInput
            icon="person-outline"
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
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        <View style={styles.footerInner}>
          <PrimaryButton
            title={`Thanh toán ${formatCurrency(amount)}`}
            onPress={handlePay}
            loading={isProcessing}
            icon="shield-checkmark-outline"
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

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE["2xl"],
    paddingBottom: SPACE.section,
  },
  cardContainer: {
    height: 200,
    marginBottom: SPACE.section,
  },
  // Mặt thẻ minh hoạ: giữ màu riêng của thẻ
  cardPreview: {
    backgroundColor: THEME_COLORS.primary,
    borderRadius: RADIUS.card,
    padding: SPACE["2xl"],
    height: 200,
    justifyContent: 'space-between',
    backfaceVisibility: 'hidden',
    ...SHADOWS.raised,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: SPACE.xs,
  },
  cardValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  amountContainer: {
    ...UI.card,
    padding: SPACE.lg,
    marginTop: SPACE["2xl"],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    ...TYPOGRAPHY.body,
    flex: 1,
    marginRight: SPACE.md,
  },
  amount: {
    ...TYPOGRAPHY.price,
    fontSize: 22,
  },
  cardSection: {
    ...UI.card,
    padding: SPACE.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACE.lg,
  },
  inputField: {
    marginBottom: SPACE.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACE.md,
    marginBottom: SPACE.md,
  },
  expiryInput: {
    flex: 1,
  },
  cvvInput: {
    flex: 1,
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
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME_COLORS.primaryPressed,
    justifyContent: 'flex-start',
    paddingHorizontal: 0,
  },
  magneticStrip: {
    height: 36,
    backgroundColor: THEME_COLORS.textPrimary,
    marginTop: SPACE.xs,
    width: '100%',
  },
  cvvText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME_COLORS.textPrimary,
    letterSpacing: 2,
  },
  cvvBackRow: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: SPACE["2xl"],
  },
  cvvLabelBox: {
    alignItems: 'center',
  },
  cvvLabelBack: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginBottom: SPACE.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cvvBoxBack: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
})
