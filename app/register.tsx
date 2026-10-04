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
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, db } from "../config/firebase"

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalMessage, setModalMessage] = useState("")

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const showModal = (title: string, message: string) => {
    setModalTitle(title)
    setModalMessage(message)
    setModalVisible(true)
  }

  const handleRegister = async () => {
    const { fullName, email, password, confirmPassword } = formData

    if (!fullName || !email || !password || !confirmPassword) {
      showModal("Thiếu thông tin", "Vui lòng điền đầy đủ các trường")
      return
    }

    if (password !== confirmPassword) {
      showModal("Mật khẩu chưa khớp", "Mật khẩu xác nhận không trùng với mật khẩu đã nhập")
      return
    }

    if (password.length < 6) {
      showModal("Mật khẩu quá ngắn", "Mật khẩu cần có ít nhất 6 ký tự")
      return
    }

    setLoading(true)
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update user profile
      await updateProfile(user, {
        displayName: fullName,
      })

      // Create user document in Firestore
      const userData = {
        id: user.uid,
        email,
        fullName,
        phone: null,
        avatar: null,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        dateOfBirth: "",
        address: "",
        emergencyContact: "",
      }

      // Write to Firestore
      await setDoc(doc(db, "users", user.uid), userData)
      console.log("User document written to Firestore for UID:", user.uid)

      // Verify the document was created
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (!userDoc.exists()) {
        throw new Error("Failed to verify user document in Firestore")
      }

      // Go to OTP screen
      router.push("/otp")
    } catch (error: any) {
      console.error("Registration error:", {
        code: error.code,
        message: error.message,
        stack: error.stack,
      })
      let errorMessage = "Đã có lỗi xảy ra, vui lòng thử lại."
      if (error.code === "auth/email-already-in-use") {
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

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Đăng ký để bắt đầu hành trình</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                placeholder="Vd: Nguyễn Văn An"
                value={formData.fullName}
                onChangeText={(value) => handleInputChange("fullName", value)}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập email của bạn"
                value={formData.email}
                onChangeText={(value) => handleInputChange("email", value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="Tối thiểu 6 ký tự"
                value={formData.password}
                onChangeText={(value) => handleInputChange("password", value)}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Xác nhận mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange("confirmPassword", value)}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>{loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}</Text>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push("/login")}>
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
    paddingVertical: 40,
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
  registerButton: {
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
    opacity: 0.7,
  },
  registerButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  loginText: {
    color: "#666666",
    fontSize: 16,
  },
  loginLink: {
    color: "#1054CF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1054CF",
    marginBottom: 16,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 28,
    textAlign: "center",
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: "#1054CF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 140,
    alignItems: "center",
    shadowColor: "#1054CF",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 4,
  },
  modalButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
})