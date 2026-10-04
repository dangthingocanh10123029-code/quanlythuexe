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

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={adminModalVisible}
        onRequestClose={() => setAdminModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bạn là quản trị viên?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập mật khẩu quản trị"
              secureTextEntry
              value={adminPassword}
              onChangeText={setAdminPassword}
              onSubmitEditing={handleAdminAccess} // Add this line
              returnKeyType="done" // Add this line
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={handleAdminAccess}
                activeOpacity={0.7} // Add this line
              >
                <Text style={styles.modalButtonText}>Xác nhận</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setAdminModalVisible(false)
                  setAdminPassword("")
                }}
                activeOpacity={0.7} // Add this line
              >
                <Text style={styles.modalButtonText}>Huỷ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add this error modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showErrorModal}
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, styles.errorModalContent]}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
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
          <View style={[styles.modalContent, styles.errorModalContent]}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.errorTitle}>{errorTitle}</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity 
              style={[styles.modalButton, { marginTop: 20 }]}
              onPress={() => setErrorModalVisible(false)}
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
            <TouchableOpacity style={styles.closeButton} onPress={closeResetModal}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Quên mật khẩu</Text>
            {resetSuccess ? (
              <>
                <Text style={styles.resetInfoText}>
                  Chúng tôi đã gửi email đặt lại mật khẩu tới {resetEmail.trim()}. Bạn kiểm tra hộp thư (kể cả thư rác) và làm theo hướng dẫn nhé.
                </Text>
                <TouchableOpacity style={[styles.modalButton, styles.resetPrimaryButton]} onPress={closeResetModal}>
                  <Text style={styles.modalButtonText}>Đã hiểu</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.resetInfoText}>
                  Nhập email đã đăng ký, chúng tôi sẽ gửi đường dẫn để bạn đặt lại mật khẩu.
                </Text>
                <TextInput
                  style={styles.modalInput}
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
                />
                {resetError ? <Text style={styles.resetErrorText}>{resetError}</Text> : null}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.resetPrimaryButton, resetLoading && styles.disabledButton]}
                    onPress={handlePasswordReset}
                    disabled={resetLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonText}>{resetLoading ? "Đang gửi..." : "Gửi email"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={closeResetModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonText}>Huỷ</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <TouchableOpacity 
        style={styles.adminButton}
        onPress={() => setAdminModalVisible(true)}
      >
        <Text style={styles.adminButtonText}>QUẢN TRỊ</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Chào mừng trở lại!</Text>
            <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập email của bạn"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.forgotPassword} onPress={openResetModal}>
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.loginButtonText}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</Text>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
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
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1054CF",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    color: "#666666",
    letterSpacing: 0.5,
  },
  form: {
    width: "100%",
    paddingHorizontal: 4,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: "#4169e1",
    fontSize: 14,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#1054CF",
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 24,
    marginTop: 16,
    shadowColor: "#1054CF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupText: {
    color: "#666666",
    fontSize: 16,
  },
  signupLink: {
    color: "#1054CF",
    fontSize: 16,
    fontWeight: "700",
  },
  adminButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#FFB700',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 4,
  },
  adminButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000000',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 25, // Changed from 12 to 25
    paddingHorizontal: 20, // Increased from 16 to 20
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    width: '100%',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    backgroundColor: '#FFB700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25, // Changed from 12 to 25
    minWidth: 100,
    alignItems: 'center',
  },
  resetPrimaryButton: {
    backgroundColor: '#1054CF',
  },
  resetInfoText: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  resetErrorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 16,
  },
  cancelButton: {
    backgroundColor: '#666666',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorModalContent: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    maxWidth: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666666',
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
})