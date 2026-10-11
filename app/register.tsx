"use client"

import { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  type TextInputProps,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { registerAccount, validateRegister, type RegisterInput } from "../utils/accountActions"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"
import { AppInput, PrimaryButton } from "../components"

type FieldKey = keyof RegisterInput | "confirmPassword"

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
    idNumber: "",
  })
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalMessage, setModalMessage] = useState("")
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})

  const handleInputChange = (field: FieldKey, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const showModal = (title: string, message: string) => {
    setModalTitle(title)
    setModalMessage(message)
    setModalVisible(true)
  }

  const handleRegister = async () => {
    const { confirmPassword, ...input } = formData

    // Lỗi từng ô (ô trống, SĐT, CCCD, độ dài mật khẩu…); registerAccount kiểm tra lại
    const fieldErrors: Partial<Record<FieldKey, string>> = validateRegister(input)
    if (input.password !== confirmPassword) fieldErrors.confirmPassword = "Mật khẩu xác nhận chưa khớp."
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      showModal("Thông tin chưa hợp lệ", "Vui lòng kiểm tra lại các ô được đánh dấu đỏ.")
      return
    }

    setLoading(true)
    try {
      // Tạo tài khoản + hồ sơ + giữ chỗ SĐT (trùng SĐT thì tài khoản bị xoá, ném code "phone-taken")
      await registerAccount(input)

      // Go to OTP screen
      router.push("/otp")
    } catch (error: any) {
      console.error("Registration error:", {
        code: error.code,
        message: error.message,
        stack: error.stack,
      })
      let errorMessage = "Đã có lỗi xảy ra, vui lòng thử lại."
      if (error.code === "phone-taken") {
        errorMessage = error.message
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email này đã được đăng ký. Bạn hãy đăng nhập hoặc dùng email khác."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email không hợp lệ."
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Mật khẩu quá yếu, vui lòng dùng ít nhất 6 ký tự."
      } else if (error.code === "auth/network-request-failed" || error.code === "unavailable") {
        errorMessage = "Không có kết nối mạng. Vui lòng kiểm tra Internet và thử lại."
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút."
      } else if (error.code === "permission-denied") {
        errorMessage = "Không có quyền ghi dữ liệu. Vui lòng liên hệ bộ phận hỗ trợ."
      }
      showModal("Đăng ký thất bại", errorMessage)
    } finally {
      setLoading(false)
    }
  }


  const fields: {
    key: FieldKey
    label: string
    placeholder: string
    icon: keyof typeof Ionicons.glyphMap
    helperText?: string
    input?: TextInputProps
  }[] = [
    { key: "fullName", label: "Họ và tên", placeholder: "Vd: Nguyễn Văn An", icon: "person-outline", input: { autoCapitalize: "words" } },
    {
      key: "email",
      label: "Email",
      placeholder: "Nhập email của bạn",
      icon: "mail-outline",
      input: { keyboardType: "email-address", autoCorrect: false },
    },
    {
      key: "phone",
      label: "Số điện thoại",
      placeholder: "Vd: 0912 345 678",
      icon: "call-outline",
      helperText: "Số di động Việt Nam, bắt đầu bằng 0 hoặc +84.",
      input: { keyboardType: "phone-pad", maxLength: 15 },
    },
    {
      key: "idNumber",
      label: "Số CCCD",
      placeholder: "Nhập 12 chữ số",
      icon: "card-outline",
      helperText: "Gồm 12 chữ số in trên thẻ căn cước.",
      input: { keyboardType: "number-pad", maxLength: 12 },
    },
    {
      key: "address",
      label: "Địa chỉ",
      placeholder: "Số nhà, đường, phường/xã, tỉnh/thành",
      icon: "home-outline",
      input: { autoCapitalize: "sentences" },
    },
    { key: "password", label: "Mật khẩu", placeholder: "Tối thiểu 6 ký tự", icon: "lock-closed-outline", input: { secureTextEntry: true } },
    {
      key: "confirmPassword",
      label: "Xác nhận mật khẩu",
      placeholder: "Nhập lại mật khẩu",
      icon: "shield-checkmark-outline",
      input: { secureTextEntry: true },
    },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="alert-circle-outline" size={24} color={THEME_COLORS.danger} />
            </View>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={PRESS_OPACITY}
            >
              <Text style={styles.modalButtonText}>Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons name="car-sport" size={18} color={THEME_COLORS.primary} />
            </View>
            <Text style={styles.brandText}>RENTO</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Đăng ký để bắt đầu hành trình</Text>
          </View>

          <View style={styles.form}>
            {fields.map((field) => (
              <AppInput
                key={field.key}
                label={field.label}
                icon={field.icon}
                placeholder={field.placeholder}
                value={formData[field.key]}
                // CCCD chỉ giữ chữ số (dán từ nơi khác có thể lẫn khoảng trắng)
                onChangeText={(value) => handleInputChange(field.key, field.key === "idNumber" ? value.replace(/\D/g, "") : value)}
                autoCapitalize="none"
                {...field.input}
                error={errors[field.key]}
                helperText={field.helperText}
                containerStyle={styles.inputContainer}
              />
            ))}

            <PrimaryButton
              title="Tạo tài khoản"
              onPress={handleRegister}
              loading={loading}
              icon="arrow-forward"
              style={styles.registerButton}
            />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push("/login")} activeOpacity={PRESS_OPACITY}>
                <Text style={styles.loginLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.section,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    marginBottom: SPACE["4xl"],
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    ...TYPOGRAPHY.h3,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: THEME_COLORS.primary,
  },
  header: {
    marginBottom: SPACE.section,
  },
  title: {
    ...TYPOGRAPHY.h1,
    marginBottom: SPACE.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: SPACE.lg,
  },
  registerButton: {
    marginTop: SPACE.sm,
    marginBottom: SPACE["2xl"],
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    ...TYPOGRAPHY.body,
  },
  loginLink: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME_COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACE["2xl"],
  },
  modalContent: {
    backgroundColor: THEME_COLORS.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACE["2xl"],
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    ...SHADOWS.raised,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.sm,
    textAlign: "center",
  },
  modalMessage: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACE["2xl"],
    textAlign: "center",
  },
  modalButton: {
    ...UI.primaryButton,
    height: 48,
    alignSelf: "stretch",
  },
  modalButtonText: {
    ...UI.primaryButtonText,
    fontSize: 15,
  },
})
