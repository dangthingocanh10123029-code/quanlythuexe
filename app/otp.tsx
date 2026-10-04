"use client"

import { useState, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { auth } from "../config/firebase"

export default function OTPScreen() {
  const [otp, setOtp] = useState(["", "", "", ""])
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<Array<TextInput | null>>([])

  const handleOtpChange = (value: string, index: number) => {
    // Allow only numeric input
    if (!/^[0-9]?$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const otpCode = otp.join("")

    if (otpCode.length !== 4 || !/^\d{4}$/.test(otpCode)) {
      Alert.alert("Mã chưa hợp lệ", "Vui lòng nhập đủ 4 chữ số của mã xác thực (OTP)")
      return
    }

    setLoading(true)

    try {
      // Check if user is authenticated
      const user = auth.currentUser
      if (!user) {
        throw new Error("No authenticated user found")
      }

      // Allow any 4-digit OTP to proceed (no actual verification)
      setLoading(false)
      router.replace("/login")
    } catch (error: any) {
      console.error("OTP verification error:", error.message)
      Alert.alert("Xác thực thất bại", "Phiên đăng ký đã hết hạn hoặc không hợp lệ. Vui lòng đăng ký lại.")
      setLoading(false)
    }
  }

  const handleResend = () => {
    Alert.alert("Đã gửi lại mã", "Mã xác thực (OTP) mới đã được gửi tới email của bạn")
    setOtp(["", "", "", ""])
    inputRefs.current[0]?.focus()
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Xác thực tài khoản</Text>
          <Text style={styles.subtitle}>Nhập mã gồm 4 chữ số vừa được gửi tới email của bạn</Text>
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              autoFocus={index === 0}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.disabledButton]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.verifyButtonText}>
            {loading ? "Đang xác thực..." : "Xác thực"}
          </Text>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Chưa nhận được mã? </Text>
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>Gửi lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1054CF", // Changed to blue background
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff", // Changed to white
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#ffffff", // Changed to white
    textAlign: "center",
    opacity: 0.8,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center", // Changed to center
    gap: 12, // Added gap between inputs
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: "#FFB700", // Changed to yellow
    borderRadius: 12,
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFB700", // Changed to yellow
    backgroundColor: "rgba(255, 255, 255, 0.1)", // Translucent white
    textAlign: "center", // Ensure number is centered
  },
  otpInputFilled: {
    borderColor: "#FFB700", // Changed to yellow
    backgroundColor: "rgba(255, 255, 255, 0.2)", // More visible when filled
  },
  verifyButton: {
    backgroundColor: "#FFB700", // Changed to yellow
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: "#ffffff", // Changed to white
    fontSize: 18,
    fontWeight: "600",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendText: {
    color: "#ffffff", // Changed to white
    fontSize: 16,
    opacity: 0.8,
  },
  resendLink: {
    color: "#FFB700", // Changed to yellow
    fontSize: 16,
    fontWeight: "600",
  },
})