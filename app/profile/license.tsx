"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../../config/firebase"
import { useAuth } from "../../hooks/useAuth"

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giấy phép lái xe (GPLX)</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Verification Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons
              name={licenseInfo.verified ? "checkmark-circle" : "time"}
              size={24}
              color={licenseInfo.verified ? "#00bb02" : "#c2a300"}
            />
            <Text style={[styles.statusText, { color: licenseInfo.verified ? "#00bb02" : "#c2a300" }]}>
              {licenseInfo.verified ? "Đã xác minh" : submitted ? "Đang chờ xác minh" : "Chưa gửi xác minh"}
            </Text>
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

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Số GPLX</Text>
              <Text style={styles.infoValue}>{licenseInfo.licenseNumber}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Có giá trị đến</Text>
              <Text style={styles.infoValue}>{licenseInfo.expiryDate}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nơi cấp</Text>
              <Text style={styles.infoValue}>{licenseInfo.issuingAuthority}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Hạng</Text>
              <Text style={styles.infoValue}>{licenseInfo.licenseClass}</Text>
            </View>
          </View>
        </View>

        {/* License Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ảnh GPLX</Text>

          <View style={styles.imageContainer}>
            <View style={styles.imageCard}>
              <Text style={styles.imageLabel}>Mặt trước</Text>
              <TouchableOpacity onPress={() => pickImage("front")}>
                <Image source={{ uri: licenseInfo.frontImage }} style={styles.licenseImage} />
                <View style={styles.imageOverlay}>
                  <Ionicons name="camera" size={24} color="#ffffff" />
                  <Text style={styles.imageOverlayText}>Cập nhật ảnh</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.imageCard}>
              <Text style={styles.imageLabel}>Mặt sau</Text>
              <TouchableOpacity onPress={() => pickImage("back")}>
                <Image source={{ uri: licenseInfo.backImage }} style={styles.licenseImage} />
                <View style={styles.imageOverlay}>
                  <Ionicons name="camera" size={24} color="#ffffff" />
                  <Text style={styles.imageOverlayText}>Cập nhật ảnh</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yêu cầu về ảnh</Text>
          <View style={styles.requirementsList}>
            <View style={styles.requirementItem}>
              <Ionicons name="checkmark-circle" size={20} color="#00bb02" />
              <Text style={styles.requirementText}>Ảnh rõ nét, chất lượng cao</Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons name="checkmark-circle" size={20} color="#00bb02" />
              <Text style={styles.requirementText}>Đọc được toàn bộ thông tin trên GPLX</Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons name="checkmark-circle" size={20} color="#00bb02" />
              <Text style={styles.requirementText}>Không bị loá sáng hoặc đổ bóng</Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons name="checkmark-circle" size={20} color="#00bb02" />
              <Text style={styles.requirementText}>GPLX hợp lệ, còn thời hạn</Text>
            </View>
          </View>
        </View>

        {!licenseInfo.verified && !submitted && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.verifyButton, submitting && { opacity: 0.6 }]}
              onPress={handleVerifyLicense}
              disabled={submitting}
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
    flex: 1,
    backgroundColor: "#ffffff",
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
  statusCard: {
    backgroundColor: "#f8f9fa",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  statusDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  infoLabel: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  imageContainer: {
    gap: 20,
  },
  imageCard: {
    alignItems: "center",
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  licenseImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  imageOverlayText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  requirementsList: {
    gap: 12,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  requirementText: {
    fontSize: 14,
    color: "#333333",
    marginLeft: 12,
  },
  buttonContainer: {
    padding: 20,
  },
  verifyButton: {
    backgroundColor: "#4169e1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  verifyButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
})
