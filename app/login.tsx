"use client"

import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../config/firebase"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"
import type { TextStyle, ViewStyle } from "react-native"

// UI.input là TextStyle; khung chứa icon + ô nhập là View nên ép kiểu sang ViewStyle
const INPUT_BOX = UI.input as unknown as ViewStyle
const INPUT_FOCUSED_TEXT = UI.inputFocused as unknown as TextStyle

const getAuthErrorMessage = (code?: string) => {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "Email hoặc mật khẩu không đúng. Bạn kiểm tra lại nhé."
    case "auth/invalid-email":
      return "Email không hợp lệ."
    case "auth/user-disabled":
      return "Tài khoản này đã bị vô hiệu hoá. Vui lòng liên hệ bộ phận hỗ trợ."
    case "auth/too-many-requests":
      return "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút."
    case "auth/network-request-failed":
      return "Không có kết nối mạng. Vui lòng kiểm tra Internet và thử lại."
    default:
      return "Đã có lỗi xảy ra, vui lòng thử lại."
  }
}

const getResetErrorMessage = (code?: string) => {
  switch (code) {
    case "auth/user-not-found":
      return "Không tìm thấy tài khoản nào dùng email này."
    case "auth/missing-email":
      return "Vui lòng nhập email."
    default:
      return getAuthErrorMessage(code)
  }
}

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [adminModalVisible, setAdminModalVisible] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorModalVisible, setErrorModalVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [errorTitle, setErrorTitle] = useState("")
  const [resetModalVisible, setResetModalVisible] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState("")
  const [resetSuccess, setResetSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const openResetModal = () => {
    setResetEmail(email.trim())
    setResetError("")
    setResetSuccess(false)
    setResetModalVisible(true)
  }

  const closeResetModal = () => {
    setResetModalVisible(false)
    setResetError("")
    setResetSuccess(false)
  }

  const handlePasswordReset = async () => {
    const target = resetEmail.trim()
    if (!target) {
      setResetError("Vui lòng nhập email.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setResetError("Email không hợp lệ.")
      return
    }
    setResetLoading(true)
    setResetError("")
    try {
      await sendPasswordResetEmail(auth, target)
      setResetSuccess(true)
    } catch (error: any) {
      console.error("Password reset error:", error?.code, error?.message)
      setResetError(getResetErrorMessage(error?.code))
    } finally {
      setResetLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorTitle("Thiếu thông tin")
      setErrorMessage("Vui lòng nhập đầy đủ email và mật khẩu")
      setErrorModalVisible(true)
      return
    }

    setLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))

      if (!userDoc.exists()) {
        setErrorTitle("Lỗi")
        setErrorMessage("Không tìm thấy dữ liệu tài khoản. Vui lòng liên hệ bộ phận hỗ trợ.")
        setErrorModalVisible(true)
        return
      }

      // Tài khoản bị khoá từ trang quản trị
      const userData = userDoc.data()
      if (userData?.disabled === true || userData?.status === "inactive") {
        await auth.signOut()
        setErrorTitle("Tài khoản đã bị khoá")
        setErrorMessage("Tài khoản của bạn đang bị tạm khoá. Vui lòng liên hệ bộ phận hỗ trợ để được mở khoá.")
        setErrorModalVisible(true)
        return
      }

      router.replace("/(tabs)")
    } catch (error: any) {
      console.error("Login error:", error.code, error.message)
      setErrorTitle("Đăng nhập thất bại")
      setErrorMessage(getAuthErrorMessage(error?.code))
      setErrorModalVisible(true)
    } finally {
      setLoading(false)
    }
  }

  const handleAdminAccess = () => {
    if (adminPassword === "ADMIN123") {
      setAdminModalVisible(false)
      setAdminPassword("")
      router.replace("/admin")
    } else {
      setAdminModalVisible(false)
      setAdminPassword("")
      setShowErrorModal(true)
      // Auto dismiss error modal after 2 seconds
      setTimeout(() => {
        setShowErrorModal(false)
      }, 2000)
    }
  }


  const inputProps = (field: string) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField((current) => (current === field ? null : current)),
    placeholderTextColor: THEME_COLORS.textMuted,
  })

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Modal
        animationType="fade"
        transparent={true}
        visible={adminModalVisible}
        onRequestClose={() => setAdminModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="shield-checkmark-outline" size={24} color={THEME_COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>Bạn là quản trị viên?</Text>
            <TextInput
              style={[styles.modalInput, focusedField === "admin" && INPUT_FOCUSED_TEXT]}
              placeholder="Nhập mật khẩu quản trị"
              secureTextEntry
              value={adminPassword}
              onChangeText={setAdminPassword}
              onSubmitEditing={handleAdminAccess}
              returnKeyType="done"
              {...inputProps("admin")}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalSecondaryButton, styles.modalButtonFlex]}
                onPress={() => {
                  setAdminModalVisible(false)
                  setAdminPassword("")
                }}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={styles.modalSecondaryButtonText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonFlex]}
                onPress={handleAdminAccess}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={styles.modalButtonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showErrorModal}
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowErrorModal(false)}
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={[styles.modalIcon, styles.modalIconDanger]}>
              <Ionicons name="lock-closed-outline" size={24} color={THEME_COLORS.danger} />
            </View>
            <Text style={styles.errorTitle}>Truy cập bị từ chối</Text>
            <Text style={styles.errorMessage}>Rất tiếc! Chỉ quản trị viên mới được vào.</Text>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={errorModalVisible}
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setErrorModalVisible(false)}
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={[styles.modalIcon, styles.modalIconDanger]}>
              <Ionicons name="alert-circle-outline" size={24} color={THEME_COLORS.danger} />
            </View>
            <Text style={styles.errorTitle}>{errorTitle}</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonFull]}
              onPress={() => setErrorModalVisible(false)}
              activeOpacity={PRESS_OPACITY}
            >
              <Text style={styles.modalButtonText}>Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={resetModalVisible}
        onRequestClose={closeResetModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeResetModal} activeOpacity={PRESS_OPACITY}>
              <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={styles.modalIcon}>
              <Ionicons name={resetSuccess ? "mail-open-outline" : "key-outline"} size={24} color={THEME_COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>Quên mật khẩu</Text>
            {resetSuccess ? (
              <>
                <Text style={styles.resetInfoText}>
                  Chúng tôi đã gửi email đặt lại mật khẩu tới {resetEmail.trim()}. Bạn kiểm tra hộp thư (kể cả thư rác) và làm theo hướng dẫn nhé.
                </Text>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonFull]}
                  onPress={closeResetModal}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Text style={styles.modalButtonText}>Đã hiểu</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.resetInfoText}>
                  Nhập email đã đăng ký, chúng tôi sẽ gửi đường dẫn để bạn đặt lại mật khẩu.
                </Text>
                <TextInput
                  style={[styles.modalInput, focusedField === "reset" && INPUT_FOCUSED_TEXT]}
                  placeholder="Nhập email của bạn"
                  value={resetEmail}
                  onChangeText={(text) => {
                    setResetEmail(text)
                    if (resetError) setResetError("")
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handlePasswordReset}
                  {...inputProps("reset")}
                />
                {resetError ? <Text style={styles.resetErrorText}>{resetError}</Text> : null}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalSecondaryButton, styles.modalButtonFlex]}
                    onPress={closeResetModal}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={styles.modalSecondaryButtonText}>Huỷ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonFlex, resetLoading && styles.disabledButton]}
                    onPress={handlePasswordReset}
                    disabled={resetLoading}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={styles.modalButtonText}>{resetLoading ? "Đang gửi..." : "Gửi email"}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="car-sport" size={18} color={THEME_COLORS.primary} />
              </View>
              <Text style={styles.brandText}>RENTO</Text>
            </View>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => setAdminModalVisible(true)}
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons name="shield-outline" size={14} color={THEME_COLORS.textSecondary} />
              <Text style={styles.adminButtonText}>QUẢN TRỊ</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Chào mừng trở lại!</Text>
            <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrapper, focusedField === "email" && UI.inputFocused]}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={focusedField === "email" ? THEME_COLORS.primary : THEME_COLORS.textMuted}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email của bạn"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  {...inputProps("email")}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={[styles.inputWrapper, focusedField === "password" && UI.inputFocused]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedField === "password" ? THEME_COLORS.primary : THEME_COLORS.textMuted}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  {...inputProps("password")}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.forgotPassword} onPress={openResetModal} activeOpacity={PRESS_OPACITY}>
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={PRESS_OPACITY}
            >
              <Text style={styles.loginButtonText}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</Text>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push("/register")} activeOpacity={PRESS_OPACITY}>
                <Text style={styles.signupLink}>Đăng ký</Text>
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
    paddingBottom: SPACE.section,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SPACE.md,
    marginBottom: SPACE["4xl"],
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
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
  label: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
    marginBottom: SPACE.sm,
  },
  inputWrapper: {
    ...INPUT_BOX,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: THEME_COLORS.textPrimary,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: SPACE["2xl"],
    paddingVertical: SPACE.xs,
  },
  forgotPasswordText: {
    color: THEME_COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  loginButton: {
    ...UI.primaryButton,
    marginBottom: SPACE["2xl"],
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    ...UI.primaryButtonText,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupText: {
    ...TYPOGRAPHY.body,
  },
  signupLink: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.primary,
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
    height: 32,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
  },
  adminButtonText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: THEME_COLORS.textSecondary,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
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
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.lg,
  },
  modalIconDanger: {
    backgroundColor: THEME_COLORS.dangerSoft,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.md,
    textAlign: "center",
  },
  modalInput: {
    ...UI.input,
    width: "100%",
    marginBottom: SPACE.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: SPACE.md,
    width: "100%",
  },
  modalButtonFlex: {
    flex: 1,
    paddingHorizontal: SPACE.md,
  },
  modalButtonFull: {
    alignSelf: "stretch",
    marginTop: SPACE.lg,
  },
  modalButton: {
    ...UI.primaryButton,
    height: 48,
  },
  modalSecondaryButton: {
    ...UI.secondaryButton,
    height: 48,
  },
  modalSecondaryButtonText: {
    ...UI.secondaryButtonText,
    fontSize: 15,
  },
  modalButtonText: {
    ...UI.primaryButtonText,
    fontSize: 15,
  },
  resetInfoText: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginBottom: SPACE.lg,
  },
  resetErrorText: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.danger,
    textAlign: "center",
    marginTop: -SPACE.sm,
    marginBottom: SPACE.lg,
  },
  closeButton: {
    position: "absolute",
    top: SPACE.md,
    right: SPACE.md,
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  errorTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.sm,
    textAlign: "center",
  },
  errorMessage: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
  },
})
