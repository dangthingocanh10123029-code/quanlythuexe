"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import PaymentLogo from "../../components/ui/PaymentLogo"

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phương thức thanh toán</Text>
        <TouchableOpacity onPress={() => setShowAddCard(!showAddCard)}>
          <Ionicons name="add" size={24} color="#4169e1" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Add Card Form */}
        {showAddCard && (
          <View style={styles.addCardForm}>
            <Text style={styles.formTitle}>Thêm thẻ ngân hàng</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số thẻ</Text>
              <TextInput
                style={styles.input}
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
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>Ngày hết hạn</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  value={newCard.expiryDate}
                  onChangeText={(text) => {
                    const d = text.replace(/\D/g, "").slice(0, 4)
                    setNewCard({ ...newCard, expiryDate: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d })
                  }}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  value={newCard.cvv}
                  onChangeText={(text) => setNewCard({ ...newCard, cvv: text.replace(/\D/g, "") })}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên chủ thẻ</Text>
              <TextInput
                style={styles.input}
                placeholder="NGUYEN VAN AN"
                value={newCard.cardholderName}
                onChangeText={(text) => setNewCard({ ...newCard, cardholderName: text.toUpperCase() })}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddCard(false)}>
                <Text style={styles.cancelButtonText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={handleAddCard}>
                <Text style={styles.addButtonText}>Thêm thẻ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Payment Methods List */}
        <View style={styles.methodsList}>
          <Text style={styles.sectionTitle}>Phương thức đã lưu</Text>

          {methods.map((method) => (
            <View key={method.id} style={styles.methodCard}>
              <View style={styles.methodInfo}>
                <View style={styles.methodHeader}>
                  <PaymentLogo method={LOGO_BY_TYPE[method.type]} size={40} />
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    {method.type === "card" && <Text style={styles.methodSubtext}>Hết hạn {method.expiryDate}</Text>}
                    {(method.type === "momo" || method.type === "zalopay") && (
                      <Text style={styles.methodSubtext}>Liên kết với số {method.phone}</Text>
                    )}
                  </View>
                </View>

                {method.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Mặc định</Text>
                  </View>
                )}
              </View>

              <View style={styles.methodActions}>
                {!method.isDefault && (
                  <TouchableOpacity style={styles.setDefaultButton} onPress={() => setDefaultPayment(method.id)}>
                    <Text style={styles.setDefaultText}>Đặt làm mặc định</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.removeButton} onPress={() => removePaymentMethod(method.id)}>
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Security Info */}
        <View style={styles.securitySection}>
          <View style={styles.securityHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#00bb02" />
            <Text style={styles.securityTitle}>Thanh toán an toàn</Text>
          </View>
          <Text style={styles.securityText}>
            Thông tin thanh toán của bạn được mã hoá và bảo mật. RENTO không bao giờ lưu đầy đủ thông tin thẻ trên máy chủ.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ededed",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  content: {
    flex: 1,
  },
  addCardForm: {
    backgroundColor: "#f8f9fa",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  row: {
    flexDirection: "row",
  },
  formButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cancelButtonText: {
    color: "#666666",
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    flex: 1,
    backgroundColor: "#1054CF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  methodsList: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 16,
  },
  methodCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  methodInfo: {
    marginBottom: 12,
  },
  methodHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  methodDetails: {
    marginLeft: 12,
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 2,
  },
  methodSubtext: {
    fontSize: 14,
    color: "#666666",
  },
  defaultBadge: {
    backgroundColor: "#00bb02",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  defaultText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  methodActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  setDefaultButton: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4169e1",
  },
  setDefaultText: {
    color: "#4169e1",
    fontSize: 14,
    fontWeight: "600",
  },
  removeButton: {
    padding: 8,
  },
  securitySection: {
    backgroundColor: "#f8fff8",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8f5e8",
  },
  securityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#00bb02",
    marginLeft: 12,
  },
  securityText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
})
