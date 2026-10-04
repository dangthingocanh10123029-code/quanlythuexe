"use client"

import { useState, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { auth } from "../config/firebase"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { THEME_COLORS, RADIUS, SPACE, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"
import type { TextStyle } from "react-native"

// UI.inputFocused là ViewStyle; ô OTP là TextInput nên ép kiểu sang TextStyle
const INPUT_FOCUSED_TEXT = UI.inputFocused as unknown as TextStyle

export default function OTPScreen() {
  const [otp, setOtp] = useState(["", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0)
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
      <StatusBar style="dark" />
      <View style={styles.brandRow}>
        <View style={styles.brandIcon}>
          <Ionicons name="car-sport" size={18} color={THEME_COLORS.primary} />
        </View>
        <Text style={styles.brandText}>RENTO</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="mail-unread-outline" size={28} color={THEME_COLORS.primary} />
          </View>
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
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
                focusedIndex === index && styles.otpInputFocused,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              autoFocus={index === 0}
              selectionColor={THEME_COLORS.primary}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.disabledButton]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={PRESS_OPACITY}
        >
          <Text style={styles.verifyButtonText}>
            {loading ? "Đang xác thực..." : "Xác thực"}
          </Text>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Chưa nhận được mã? </Text>
          <TouchableOpacity onPress={handleResend} activeOpacity={PRESS_OPACITY}>
            <Text style={styles.resendLink}>Gửi lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.md,
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
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: SPACE.screen,
    paddingBottom: SPACE["4xl"],
  },
  header: {
    alignItems: "center",
    marginBottom: SPACE.section,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.xl,
  },
  title: {
    ...TYPOGRAPHY.h1,
    marginBottom: SPACE.sm,
    textAlign: "center",
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACE.md,
    marginBottom: SPACE.section,
  },
  otpInput: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: RADIUS.control,
    fontSize: 22,
    fontWeight: "700",
    color: THEME_COLORS.textPrimary,
    backgroundColor: THEME_COLORS.surface,
    textAlign: "center",
  },
  otpInputFilled: {
    borderColor: THEME_COLORS.borderStrong,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  otpInputFocused: {
    ...INPUT_FOCUSED_TEXT,
    backgroundColor: THEME_COLORS.surface,
  },
  verifyButton: {
    ...UI.primaryButton,
    marginBottom: SPACE["2xl"],
  },
  disabledButton: {
    opacity: 0.6,
  },
  verifyButtonText: {
    ...UI.primaryButtonText,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendText: {
    ...TYPOGRAPHY.body,
  },
  resendLink: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.primary,
  },
})
