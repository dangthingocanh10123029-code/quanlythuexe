"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, type TextStyle } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import PaymentLogo from "../../components/ui/PaymentLogo"
import { PRESS_OPACITY, RADIUS, SHADOWS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../../utils/theme"

type SavedPaymentType = "card" | "momo" | "zalopay"

// Ánh xạ loại phương thức đã lưu sang id logo/route thanh toán
const LOGO_BY_TYPE: Record<SavedPaymentType, "credit-card" | "momo" | "zalopay"> = {
  card: "credit-card",
  momo: "momo",
  zalopay: "zalopay",
}

type SavedPaymentMethod = {
  id: number
  type: SavedPaymentType
  name: string
  isDefault: boolean
  expiryDate?: string
  phone?: string
}

const paymentMethods: SavedPaymentMethod[] = [
  {
    id: 1,
    type: "card",
    name: "Thẻ Visa •••• 1234",
    isDefault: true,
    expiryDate: "12/28",
  },
  {
    id: 2,
    type: "momo",
    name: "Ví MoMo",
    isDefault: false,
    phone: "0901 234 567",
  },
  {
    id: 3,
    type: "zalopay",
    name: "ZaloPay",
    isDefault: false,
    phone: "0901 234 567",
  },
]

export default function PaymentScreen() {
  const [methods, setMethods] = useState(paymentMethods)
  const [showAddCard, setShowAddCard] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [newCard, setNewCard] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  })

  const setDefaultPayment = (id: number) => {
    setMethods(
      methods.map((method) => ({
        ...method,
        isDefault: method.id === id,
      })),
    )
    Alert.alert("Thành công", "Đã đặt làm phương thức thanh toán mặc định")
  }

  const removePaymentMethod = (id: number) => {
    Alert.alert("Xoá phương thức thanh toán", "Bạn có chắc muốn xoá phương thức thanh toán này?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: () => {
          setMethods((prev) => {
            const remaining = prev.filter((method) => method.id !== id)
            // Nếu xoá phương thức mặc định thì chọn phương thức đầu tiên còn lại làm mặc định
            if (remaining.length > 0 && !remaining.some((m) => m.isDefault)) {
              return remaining.map((m, index) => ({ ...m, isDefault: index === 0 }))
            }
            return remaining
          })
          Alert.alert("Thành công", "Đã xoá phương thức thanh toán")
        },
      },
    ])
  }

  const handleAddCard = () => {
    if (!newCard.cardNumber || !newCard.expiryDate || !newCard.cvv || !newCard.cardholderName) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin thẻ")
      return
    }

    const digits = newCard.cardNumber.replace(/\D/g, "")
    if (digits.length !== 16) {
      Alert.alert("Số thẻ không hợp lệ", "Số thẻ phải gồm đủ 16 chữ số")
      return
    }
    const expiryMatch = newCard.expiryDate.match(/^(\d{2})\/(\d{2})$/)
    const expMonth = expiryMatch ? Number(expiryMatch[1]) : 0
    const expYear = expiryMatch ? 2000 + Number(expiryMatch[2]) : 0
    const now = new Date()
    if (
      !expiryMatch ||
      expMonth < 1 ||
      expMonth > 12 ||
      expYear < now.getFullYear() ||
      (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)
    ) {
      Alert.alert("Ngày hết hạn không hợp lệ", "Vui lòng nhập ngày hết hạn dạng MM/YY và thẻ phải còn hạn")
      return
    }
    if (!/^\d{3,4}$/.test(newCard.cvv)) {
      Alert.alert("CVV không hợp lệ", "Mã CVV phải gồm 3 hoặc 4 chữ số")
      return
    }

    // Chỉ lưu 4 số cuối để hiển thị, không lưu số thẻ đầy đủ / CVV
    const brand = digits.startsWith("4") ? "Visa" : digits.startsWith("5") ? "Mastercard" : "ngân hàng"
    setMethods((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "card",
        name: `Thẻ ${brand} •••• ${digits.slice(-4)}`,
        isDefault: prev.length === 0,
        expiryDate: newCard.expiryDate,
      },
    ])

    Alert.alert("Thành công", "Đã thêm thẻ ngân hàng!", [
      {
        text: "OK",
        onPress: () => {
          setShowAddCard(false)
          setNewCard({
            cardNumber: "",
            expiryDate: "",
            cvv: "",
            cardholderName: "",
          })
        },
      },
    ])
  }

  const focusProps = (field: string) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField((prev) => (prev === field ? null : prev)),
    placeholderTextColor: THEME_COLORS.textMuted,
  })
  const inputStyle = (field: string) => [styles.input, focusedField === field && styles.inputFocused]

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="arrow-back" size={22} color={THEME_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phương thức thanh toán</Text>
        <TouchableOpacity
          style={[styles.headerButton, styles.headerAddButton]}
          onPress={() => setShowAddCard(!showAddCard)}
          activeOpacity={PRESS_OPACITY}
        >
          <Ionicons name={showAddCard ? "close" : "add"} size={22} color={THEME_COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Add Card Form */}
        {showAddCard && (
          <View style={styles.addCardForm}>
            <Text style={styles.formTitle}>Thêm thẻ ngân hàng</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số thẻ</Text>
              <TextInput
                style={inputStyle("cardNumber")}
                placeholder="1234 5678 9012 3456"
                value={newCard.cardNumber}
                onChangeText={(text) =>
                  setNewCard({
                    ...newCard,
                    cardNumber: text
                      .replace(/\D/g, "")
                      .slice(0, 16)
                      .replace(/(\d{4})(?=\d)/g, "$1 "),
                  })
                }
                keyboardType="numeric"
                maxLength={19}
                {...focusProps("cardNumber")}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.rowItem]}>
                <Text style={styles.inputLabel}>Ngày hết hạn</Text>
                <TextInput
                  style={inputStyle("expiryDate")}
                  placeholder="MM/YY"
                  value={newCard.expiryDate}
                  onChangeText={(text) => {
                    const d = text.replace(/\D/g, "").slice(0, 4)
                    setNewCard({ ...newCard, expiryDate: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d })
                  }}
                  keyboardType="numeric"
                  maxLength={5}
                  {...focusProps("expiryDate")}
                />
              </View>

              <View style={[styles.inputGroup, styles.rowItem]}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={inputStyle("cvv")}
                  placeholder="123"
                  value={newCard.cvv}
                  onChangeText={(text) => setNewCard({ ...newCard, cvv: text.replace(/\D/g, "") })}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  {...focusProps("cvv")}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên chủ thẻ</Text>
              <TextInput
                style={inputStyle("cardholderName")}
                placeholder="NGUYEN VAN AN"
                value={newCard.cardholderName}
                onChangeText={(text) => setNewCard({ ...newCard, cardholderName: text.toUpperCase() })}
                autoCapitalize="characters"
                {...focusProps("cardholderName")}
              />
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddCard(false)}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={styles.cancelButtonText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={handleAddCard} activeOpacity={PRESS_OPACITY}>
                <Text style={styles.addButtonText}>Thêm thẻ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Payment Methods List */}
        <View style={styles.methodsList}>
          <Text style={styles.sectionTitle}>Phương thức đã lưu</Text>

          {methods.map((method) => (
            <View key={method.id} style={[styles.methodCard, method.isDefault && styles.methodCardDefault]}>
              <View style={styles.methodHeader}>
                <PaymentLogo method={LOGO_BY_TYPE[method.type]} size={44} />
                <View style={styles.methodDetails}>
                  <Text style={styles.methodName} numberOfLines={1}>{method.name}</Text>
                  {method.type === "card" && <Text style={styles.methodSubtext}>Hết hạn {method.expiryDate}</Text>}
                  {(method.type === "momo" || method.type === "zalopay") && (
                    <Text style={styles.methodSubtext}>Liên kết với số {method.phone}</Text>
                  )}
                </View>
                {method.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Mặc định</Text>
                  </View>
                )}
              </View>

              <View style={styles.methodDivider} />

              <View style={styles.methodActions}>
                {!method.isDefault ? (
                  <TouchableOpacity
                    style={styles.setDefaultButton}
                    onPress={() => setDefaultPayment(method.id)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={styles.setDefaultText}>Đặt làm mặc định</Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePaymentMethod(method.id)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="trash-outline" size={18} color={THEME_COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Security Info */}
        <View style={styles.securitySection}>
          <View style={styles.securityIcon}>
            <Ionicons name="shield-checkmark" size={22} color={THEME_COLORS.success} />
          </View>
          <View style={styles.securityBody}>
            <Text style={styles.securityTitle}>Thanh toán an toàn</Text>
            <Text style={styles.securityText}>
              Thông tin thanh toán của bạn được mã hoá và bảo mật. RENTO không bao giờ lưu đầy đủ thông tin thẻ trên máy chủ.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACE.screen,
    paddingVertical: SPACE.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAddButton: {
    backgroundColor: THEME_COLORS.primarySoft,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACE["2xl"],
    paddingBottom: SPACE["4xl"],
  },
  addCardForm: {
    ...UI.card,
    ...SHADOWS.raised,
    marginHorizontal: SPACE.screen,
    marginBottom: SPACE.section,
    padding: SPACE.xl,
  },
  formTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACE.xl,
  },
  inputGroup: {
    marginBottom: SPACE.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
    marginBottom: SPACE.sm,
  },
  input: {
    ...UI.input,
  },
  inputFocused: {
    ...(UI.inputFocused as TextStyle),
  },
  row: {
    flexDirection: "row",
    gap: SPACE.md,
  },
  rowItem: {
    flex: 1,
  },
  formButtons: {
    flexDirection: "row",
    gap: SPACE.md,
    marginTop: SPACE.sm,
  },
  cancelButton: {
    ...UI.secondaryButton,
    flex: 1,
    height: 48,
    paddingHorizontal: SPACE.lg,
  },
  cancelButtonText: {
    ...UI.secondaryButtonText,
    fontSize: 15,
  },
  addButton: {
    ...UI.primaryButton,
    flex: 1,
    height: 48,
    paddingHorizontal: SPACE.lg,
  },
  addButtonText: {
    ...UI.primaryButtonText,
    fontSize: 15,
  },
  methodsList: {
    paddingHorizontal: SPACE.screen,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.lg,
  },
  methodCard: {
    ...UI.card,
    padding: SPACE.lg,
    marginBottom: SPACE.md,
  },
  methodCardDefault: {
    borderColor: THEME_COLORS.primary,
  },
  methodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    ...TYPOGRAPHY.bodyStrong,
    marginBottom: 2,
  },
  methodSubtext: {
    ...TYPOGRAPHY.caption,
  },
  defaultBadge: {
    backgroundColor: THEME_COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  defaultText: {
    color: THEME_COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  methodDivider: {
    ...UI.divider,
    marginVertical: SPACE.md,
  },
  methodActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  setDefaultButton: {
    height: 36,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
    justifyContent: "center",
  },
  setDefaultText: {
    color: THEME_COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  securitySection: {
    flexDirection: "row",
    gap: SPACE.md,
    marginHorizontal: SPACE.screen,
    marginTop: SPACE.section - SPACE.md,
    padding: SPACE.lg,
    borderRadius: RADIUS.card,
    backgroundColor: THEME_COLORS.successSoft,
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  securityBody: {
    flex: 1,
  },
  securityTitle: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.success,
    marginBottom: SPACE.xs,
  },
  securityText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
  },
})
