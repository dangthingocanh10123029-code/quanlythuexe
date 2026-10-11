"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { changePassword } from "../../utils/accountActions"
import { showAlert } from "../../utils/dialog"
import { RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../../utils/theme"
import { AppHeader, AppInput, PrimaryButton } from "../../components"

const FIELDS: {
  key: "current" | "next" | "confirm"
  label: string
  placeholder: string
  icon: keyof typeof Ionicons.glyphMap
}[] = [
  { key: "current", label: "Mật khẩu hiện tại", placeholder: "Nhập mật khẩu đang dùng", icon: "lock-closed-outline" },
  { key: "next", label: "Mật khẩu mới", placeholder: "Tối thiểu 6 ký tự", icon: "key-outline" },
  { key: "confirm", label: "Nhập lại mật khẩu mới", placeholder: "Nhập lại mật khẩu mới", icon: "shield-checkmark-outline" },
]

type FieldKey = (typeof FIELDS)[number]["key"]

export default function ChangePasswordScreen() {
  const [form, setForm] = useState<Record<FieldKey, string>>({ current: "", next: "", confirm: "" })
  const [visible, setVisible] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [confirmError, setConfirmError] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const handleChange = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setConfirmError("")
    setError("")
  }

  const handleSave = async () => {
    if (form.next !== form.confirm) {
      setConfirmError("Mật khẩu nhập lại chưa khớp với mật khẩu mới.")
      return
    }
    setSaving(true)
    try {
      await changePassword(form.current, form.next)
      showAlert("Thành công", "Đã đổi mật khẩu. Lần đăng nhập sau bạn hãy dùng mật khẩu mới.")
      router.back()
    } catch (e: any) {
      setError(e?.message || "Không đổi được mật khẩu. Vui lòng thử lại.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <AppHeader title="Đổi mật khẩu" onBack={() => router.back()} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Để bảo vệ tài khoản, bạn cần nhập mật khẩu hiện tại trước khi đặt mật khẩu mới.
          </Text>

          {FIELDS.map((field) => (
            <AppInput
              key={field.key}
              label={field.label}
              icon={field.icon}
              placeholder={field.placeholder}
              value={form[field.key]}
              onChangeText={(value) => handleChange(field.key, value)}
              secureTextEntry={!visible[field.key]}
              rightIcon={visible[field.key] ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setVisible((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
              autoCapitalize="none"
              autoCorrect={false}
              error={field.key === "confirm" ? confirmError : undefined}
              containerStyle={styles.inputContainer}
            />
          ))}

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={THEME_COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <PrimaryButton title="Cập nhật mật khẩu" onPress={handleSave} loading={saving} style={styles.saveButton} />
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
  content: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE["2xl"],
    paddingBottom: SPACE.section,
  },
  intro: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACE["2xl"],
  },
  inputContainer: {
    marginBottom: SPACE.lg,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    padding: SPACE.md,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.dangerSoft,
    marginBottom: SPACE.lg,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.danger,
    flex: 1,
  },
  saveButton: {
    marginTop: SPACE.sm,
  },
})
