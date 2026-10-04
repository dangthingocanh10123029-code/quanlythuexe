"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../../config/firebase"
import { useAuth } from "../../hooks/useAuth"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../../utils/theme"

// Ảnh GPLX (base64) lưu ở collection riêng `licenses/{uid}` để không làm phình doc `users`
const MAX_IMAGE_BYTES = 400 * 1024

export default function LicenseScreen() {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  // true khi đã gửi ảnh và đang chờ duyệt; false khi có ảnh mới chưa gửi
  const [submitted, setSubmitted] = useState(false)
  const [licenseInfo, setLicenseInfo] = useState({
    licenseNumber: "790123456789",
    expiryDate: "15/12/2030",
    issuingAuthority: "Sở GTVT TP. Hồ Chí Minh",
    licenseClass: "B2",
    frontImage:
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjNDE2OWUxIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWkiIGZvbnQtc2l6ZT0iMTgiPk3hurd0IHRyxrDhu5tjIEdQTFg8L3RleHQ+Cjwvc3ZnPgo=",
    backImage:
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjYzJhMzAwIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWkiIGZvbnQtc2l6ZT0iMTgiPk3hurd0IHNhdSBHUExYPC90ZXh0Pgo8L3N2Zz4K",
    verified: true,
  })

  // Đọc GPLX đã gửi trước đó (nếu có)
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    const loadLicense = async () => {
      try {
        const snap = await getDoc(doc(db, "licenses", user.id))
        if (cancelled || !snap.exists()) return
        const data = snap.data()
        setLicenseInfo((prev) => ({
          ...prev,
          frontImage: data.frontImage || prev.frontImage,
          backImage: data.backImage || prev.backImage,
          verified: data.status === "verified",
        }))
        setSubmitted(data.status === "pending")
      } catch (error) {
        console.error("Error loading license:", error)
      }
    }
    loadLicense()
    return () => {
      cancelled = true
    }
  }, [user?.id])

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
        const imageData = `data:image/jpeg;base64,${base64}`
        setLicenseInfo((prev) => ({
          ...prev,
          [type === "front" ? "frontImage" : "backImage"]: imageData,
          verified: false,
        }))
        setSubmitted(false)
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
    setSubmitting(true)
    try {
      await setDoc(
        doc(db, "licenses", user.id),
        {
          userId: user.id,
          licenseNumber: licenseInfo.licenseNumber,
          licenseClass: licenseInfo.licenseClass,
          expiryDate: licenseInfo.expiryDate,
          issuingAuthority: licenseInfo.issuingAuthority,
          frontImage: licenseInfo.frontImage,
          backImage: licenseInfo.backImage,
          status: "pending",
          submittedAt: serverTimestamp(),
        },
        { merge: true },
      )
      setSubmitted(true)
      Alert.alert(
        "Đã gửi xác minh",
        "GPLX của bạn sẽ được xác minh trong vòng 24 giờ. Chúng tôi sẽ gửi thông báo cho bạn ngay khi hoàn tất.",
        [{ text: "OK" }],
      )
    } catch (error) {
      console.error("Error submitting license:", error)
      Alert.alert("Gửi thất bại", "Không gửi được ảnh GPLX. Vui lòng kiểm tra kết nối mạng và thử lại.")
    } finally {
      setSubmitting(false)
    }
  }

  // Ảnh mặc định là SVG minh hoạ → coi như "chưa có ảnh" để hiện khung nét đứt
  const hasImage = (uri: string) => !!uri && !uri.startsWith("data:image/svg+xml")

  const statusTone = licenseInfo.verified
    ? { bg: THEME_COLORS.successSoft, fg: THEME_COLORS.success }
    : { bg: THEME_COLORS.warningSoft, fg: THEME_COLORS.warning }

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
    { label: "Số GPLX", value: licenseInfo.licenseNumber },
    { label: "Có giá trị đến", value: licenseInfo.expiryDate },
    { label: "Nơi cấp", value: licenseInfo.issuingAuthority },
    { label: "Hạng", value: licenseInfo.licenseClass },
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
                name={licenseInfo.verified ? "checkmark-circle" : "time"}
                size={22}
                color={statusTone.fg}
              />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusTone.bg }]}>
              <Text style={[styles.statusText, { color: statusTone.fg }]}>
                {licenseInfo.verified ? "Đã xác minh" : submitted ? "Đang chờ xác minh" : "Chưa gửi xác minh"}
              </Text>
            </View>
          </View>
          {!licenseInfo.verified && (
            <Text style={styles.statusDescription}>
              {submitted
                ? "GPLX của bạn đang được kiểm tra. Quá trình này thường mất 24–48 giờ."
                : "Bạn đã cập nhật ảnh GPLX. Bấm \"Gửi xác minh\" để gửi ảnh cho RENTO kiểm tra."}
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
            {renderImageSlot("front", "Mặt trước", licenseInfo.frontImage)}
            {renderImageSlot("back", "Mặt sau", licenseInfo.backImage)}
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

        {!licenseInfo.verified && !submitted && (
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
