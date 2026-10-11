"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { useAuth } from "../../hooks/useAuth"
import { useLicense } from "../../hooks/useLicense"
import { validateLicense, type LicenseInput } from "../../utils/license"
import { submitLicense } from "../../utils/licenseActions"
import { LICENSE_STATUS_LABELS } from "../../utils/constants"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../../utils/theme"

// Ảnh GPLX (base64) lưu ở collection riêng `licenses/{uid}` để không làm phình doc `users`
const MAX_IMAGE_BYTES = 400 * 1024

const EMPTY_FORM: LicenseInput = {
  licenseNumber: "",
  licenseClass: "",
  expiryDate: "",
  issuingAuthority: "",
  frontImage: "",
  backImage: "",
}

type LicenseErrors = Partial<Record<keyof LicenseInput, string>>

export default function LicenseScreen() {
  const { user } = useAuth()
  const { license } = useLicense()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<LicenseInput>(EMPTY_FORM)
  const [errors, setErrors] = useState<LicenseErrors>({})
  // true khi người dùng đã sửa form mà chưa gửi
  const [dirty, setDirty] = useState(false)

  // null = chưa gửi; "pending" | "verified" | "rejected"
  const status = license?.status ?? null

  // Nạp GPLX đã gửi vào form (không ghi đè khi đang sửa)
  useEffect(() => {
    if (!license || dirty) return
    setForm({
      licenseNumber: license.licenseNumber || "",
      licenseClass: license.licenseClass || "",
      expiryDate: license.expiryDate || "",
      issuingAuthority: license.issuingAuthority || "",
      frontImage: license.frontImage || "",
      backImage: license.backImage || "",
    })
  }, [license])

  const updateForm = <K extends keyof LicenseInput>(field: K, value: LicenseInput[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setDirty(true)
  }

  const pickImage = async (type: "front" | "back") => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Cần cấp quyền", "Vui lòng cho phép RENTO truy cập thư viện ảnh để tải ảnh GPLX.")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 2],
        quality: 0.4,
        base64: true,
      })

      if (!result.canceled && result.assets[0].base64) {
        const base64 = result.assets[0].base64
        if (base64.length * 0.75 > MAX_IMAGE_BYTES) {
          Alert.alert("Ảnh quá lớn", "Vui lòng chọn ảnh có dung lượng nhỏ hơn hoặc cắt sát mép GPLX.")
          return
        }
        updateForm(type === "front" ? "frontImage" : "backImage", `data:image/jpeg;base64,${base64}`)
      }
    } catch (error) {
      console.error("Error picking license image:", error)
      Alert.alert("Lỗi", "Không thể chọn ảnh. Vui lòng thử lại.")
    }
  }

  const handleVerifyLicense = async () => {
    if (!user?.id) {
      Alert.alert("Bạn chưa đăng nhập", "Vui lòng đăng nhập để gửi xác minh GPLX.")
      return
    }
    const fieldErrors = validateLicense(form)
    setErrors(fieldErrors)
    const messages = Object.values(fieldErrors)
    if (messages.length > 0) {
      Alert.alert("Thông tin chưa hợp lệ", messages.join("\n"))
      return
    }
    setSubmitting(true)
    try {
      await submitLicense(user.id, form)
      setDirty(false)
      Alert.alert(
        "Đã gửi xác minh",
        "GPLX của bạn sẽ được xác minh trong vòng 24 giờ. Chúng tôi sẽ gửi thông báo cho bạn ngay khi hoàn tất.",
        [{ text: "OK" }],
      )
    } catch (error: any) {
      console.error("Error submitting license:", error)
      Alert.alert("Gửi thất bại", error?.message || "Không gửi được GPLX. Vui lòng kiểm tra kết nối mạng và thử lại.")
    } finally {
      setSubmitting(false)
    }
  }

  // Ảnh mặc định là SVG minh hoạ → coi như "chưa có ảnh" để hiện khung nét đứt
  const hasImage = (uri: string) => !!uri && !uri.startsWith("data:image/svg+xml")

  const statusTone =
    status === "verified"
      ? { bg: THEME_COLORS.successSoft, fg: THEME_COLORS.success }
      : status === "rejected"
        ? { bg: THEME_COLORS.dangerSoft, fg: THEME_COLORS.danger }
        : { bg: THEME_COLORS.warningSoft, fg: THEME_COLORS.warning }
  // Gửi được khi chưa gửi, bị từ chối, hoặc vừa sửa thông tin
  const canSubmit = !status || status === "rejected" || dirty

  const renderImageSlot = (type: "front" | "back", label: string, uri: string) => (
    <View style={styles.imageCard}>
      <Text style={styles.imageLabel}>{label}</Text>
      <TouchableOpacity onPress={() => pickImage(type)} activeOpacity={PRESS_OPACITY}>
        {hasImage(uri) ? (
          <View>
            <Image source={{ uri }} style={styles.licenseImage} />
            <View style={styles.imageOverlay}>
              <Ionicons name="camera" size={16} color={THEME_COLORS.textPrimary} />
              <Text style={styles.imageOverlayText}>Cập nhật ảnh</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyImage}>
            <View style={styles.emptyImageIcon}>
              <Ionicons name="camera-outline" size={24} color={THEME_COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyImageText}>Cập nhật ảnh</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  )

  const infoRows = [
    // ponytail: hiển thị tạm, U2.3 thay bằng ô nhập (updateForm, errors[field])
    { label: "Số GPLX", value: form.licenseNumber || "Chưa nhập" },
    { label: "Có giá trị đến", value: form.expiryDate || "Chưa nhập" },
    { label: "Nơi cấp", value: form.issuingAuthority || "Chưa nhập" },
    { label: "Hạng", value: form.licenseClass || "Chưa chọn" },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="arrow-back" size={22} color={THEME_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giấy phép lái xe (GPLX)</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Verification Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIcon, { backgroundColor: statusTone.bg }]}>
              <Ionicons
                name={status === "verified" ? "checkmark-circle" : status === "rejected" ? "close-circle" : "time"}
                size={22}
                color={statusTone.fg}
              />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusTone.bg }]}>
              <Text style={[styles.statusText, { color: statusTone.fg }]}>
                {status ? LICENSE_STATUS_LABELS[status] : "Chưa gửi xác minh"}
              </Text>
            </View>
          </View>
          {status !== "verified" && (
            <Text style={styles.statusDescription}>
              {status === "pending"
                ? "GPLX của bạn đang được kiểm tra. Quá trình này thường mất 24–48 giờ."
                : status === "rejected"
                  ? `Lý do: ${license?.rejectReason || "Thông tin chưa hợp lệ"}. Vui lòng cập nhật và gửi lại.`
                  : "Nhập thông tin và tải ảnh GPLX rồi bấm \"Gửi xác minh\" để RENTO kiểm tra."}
            </Text>
          )}
        </View>

        {/* License Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin GPLX</Text>
          <View style={styles.infoCard}>
            {infoRows.map((row, index) => (
              <View key={row.label}>
                {index > 0 && <View style={styles.infoDivider} />}
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* License Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ảnh GPLX</Text>
          <View style={styles.imageContainer}>
            {renderImageSlot("front", "Mặt trước", form.frontImage || "")}
            {renderImageSlot("back", "Mặt sau", form.backImage || "")}
          </View>
        </View>

        {/* Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yêu cầu về ảnh</Text>
          <View style={styles.requirementsList}>
            {[
              "Ảnh rõ nét, chất lượng cao",
              "Đọc được toàn bộ thông tin trên GPLX",
              "Không bị loá sáng hoặc đổ bóng",
              "GPLX hợp lệ, còn thời hạn",
            ].map((text) => (
              <View key={text} style={styles.requirementItem}>
                <Ionicons name="checkmark-circle" size={20} color={THEME_COLORS.success} />
                <Text style={styles.requirementText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        {canSubmit && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.verifyButton, submitting && styles.verifyButtonDisabled]}
              onPress={handleVerifyLicense}
              disabled={submitting}
              activeOpacity={PRESS_OPACITY}
            >
              <Text style={styles.verifyButtonText}>{submitting ? "Đang gửi..." : "Gửi xác minh"}</Text>
            </TouchableOpacity>
          </View>
        )}
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
  statusCard: {
    ...UI.card,
    marginHorizontal: SPACE.screen,
    marginBottom: SPACE.section,
    padding: SPACE.xl,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    paddingHorizontal: SPACE.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusDescription: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: SPACE.md,
  },
  section: {
    paddingHorizontal: SPACE.screen,
    marginBottom: SPACE.section,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACE.md,
  },
  infoCard: {
    ...UI.card,
    paddingHorizontal: SPACE.lg,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACE.lg,
    paddingVertical: 14,
  },
  infoDivider: {
    ...UI.divider,
  },
  infoLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
  },
  infoValue: {
    ...TYPOGRAPHY.bodyStrong,
    flexShrink: 1,
    textAlign: "right",
  },
  imageContainer: {
    gap: SPACE.xl,
  },
  imageCard: {},
  imageLabel: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
    marginBottom: SPACE.sm,
  },
  licenseImage: {
    width: "100%",
    height: 200,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  imageOverlay: {
    position: "absolute",
    right: SPACE.md,
    bottom: SPACE.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACE.md,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
  },
  imageOverlayText: {
    color: THEME_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  emptyImage: {
    height: 200,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: THEME_COLORS.borderStrong,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.sm,
  },
  emptyImageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME_COLORS.surface,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyImageText: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.textSecondary,
  },
  requirementsList: {
    gap: SPACE.md,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  requirementText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: SPACE.screen,
  },
  verifyButton: {
    ...UI.primaryButton,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    ...UI.primaryButtonText,
  },
})
