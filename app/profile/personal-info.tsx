"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, Platform, type TextStyle } from "react-native"
import { StatusBar } from "expo-status-bar"
import DateTimePicker from "@react-native-community/datetimepicker"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { doc, updateDoc } from "firebase/firestore"
import { updateProfile } from "firebase/auth" // Add this import
import { db, auth } from "../../config/firebase"
import { useAuth } from "../../hooks/useAuth"
import { formatDate } from "../../utils/helpers"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../../utils/theme"

// Chuyển chuỗi "dd/mm/yyyy" thành Date (mặc định 15/01/1990 nếu không đọc được)
const parseDob = (value?: string): Date => {
  const match = value?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
    if (!isNaN(d.getTime())) return d
  }
  return new Date(1990, 0, 15)
}

export default function PersonalInfoScreen() {
  const { user, refresh } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [showDobPicker, setShowDobPicker] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState({
    fullName: user?.fullName || auth.currentUser?.displayName || "Nguyễn Văn An",
    email: user?.email || auth.currentUser?.email || "nguyenvanan@gmail.com",
    phone: user?.phone || "+84 901 234 567",
    dateOfBirth: user?.dateOfBirth || "15/01/1990",
    address: user?.address || "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    emergencyContact: user?.emergencyContact || "+84 908 765 432",
    avatar: user?.avatar || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNDE2OWUxIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmb250LWZhbWlseT0ic3lzdGVtLXVpIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+TkE8L3RleHQ+Cjwvc3ZnPgo=",
  })

  const onDobChange = (event: any, selected?: Date) => {
    if (Platform.OS !== "ios") setShowDobPicker(false)
    if (event?.type === "dismissed" || !selected) return
    setUserInfo((prev) => ({ ...prev, dateOfBirth: formatDate(selected, "short") }))
  }

  const pickImage = async () => {
    try {
      // Request permission first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần cấp quyền', 'Vui lòng cho phép RENTO truy cập thư viện ảnh của bạn');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true, // Enable base64 encoding
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setUserInfo(prev => ({
          ...prev,
          avatar: base64Image
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  }

  const handleSave = async () => {
    try {
      if (!auth.currentUser?.uid) {
        throw new Error('No user ID found');
      }

      const userRef = doc(db, "users", auth.currentUser.uid);

      // First update Firestore
      await updateDoc(userRef, {
        fullName: userInfo.fullName,
        phone: userInfo.phone,
        dateOfBirth: userInfo.dateOfBirth,
        address: userInfo.address,
        emergencyContact: userInfo.emergencyContact,
        avatar: userInfo.avatar,
        updatedAt: new Date().toISOString()
      });

      // Then update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: userInfo.fullName,
        photoURL: userInfo.avatar
      });

      // Force refresh user data
      await refresh();

      Alert.alert("Thành công", "Đã cập nhật thông tin cá nhân!");
      setIsEditing(false);
      router.back();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Lỗi', 'Không thể lưu thay đổi. Vui lòng thử lại.');
    }
  }

  // style ô nhập theo trạng thái (đang sửa / chỉ xem / đang focus)
  const inputStyle = (field: string, extra?: TextStyle) => [
    styles.input,
    extra,
    !isEditing && styles.disabledInput,
    isEditing && focusedField === field && styles.inputFocused,
  ]

  const focusProps = (field: string) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField((prev) => (prev === field ? null : prev)),
  })

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="arrow-back" size={22} color={THEME_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        <TouchableOpacity
          onPress={() => {
            setIsEditing(!isEditing)
            setShowDobPicker(false)
            setFocusedField(null)
          }}
          activeOpacity={PRESS_OPACITY}
        >
          <Text style={[styles.editText, isEditing && styles.editTextCancel]}>{isEditing ? "Huỷ" : "Chỉnh sửa"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={isEditing ? pickImage : undefined}
            style={styles.avatarContainer}
            activeOpacity={isEditing ? PRESS_OPACITY : 1}
          >
            <Image
              source={{
                uri: userInfo.avatar || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNDE2OWUxIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmb250LWZhbWlseT0ic3lzdGVtLXVpIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+TkE8L3RleHQ+Cjwvc3ZnPgo="
              }}
              style={styles.avatar}
            />
            {isEditing && (
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarText}>Ảnh đại diện</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và tên</Text>
            <TextInput
              style={inputStyle("fullName")}
              value={userInfo.fullName}
              onChangeText={(text) => setUserInfo({ ...userInfo, fullName: text })}
              editable={isEditing}
              placeholderTextColor={THEME_COLORS.textMuted}
              {...focusProps("fullName")}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={[styles.input, styles.disabledInput]} value={userInfo.email} editable={false} />
            <Text style={styles.helperText}>Không thể thay đổi email</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              style={inputStyle("phone")}
              value={userInfo.phone}
              onChangeText={(text) => setUserInfo({ ...userInfo, phone: text })}
              editable={isEditing}
              placeholder="0901 234 567"
              placeholderTextColor={THEME_COLORS.textMuted}
              keyboardType="phone-pad"
              {...focusProps("phone")}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ngày sinh</Text>
            <TouchableOpacity
              style={[
                styles.dateInput,
                !isEditing && styles.dateInputDisabled,
                isEditing && showDobPicker && styles.dateInputFocused,
              ]}
              disabled={!isEditing}
              onPress={() => setShowDobPicker((prev) => !prev)}
              activeOpacity={PRESS_OPACITY}
            >
              <Text style={[styles.dateText, !isEditing && styles.dateTextDisabled]}>{userInfo.dateOfBirth}</Text>
              {isEditing && <Ionicons name="calendar-outline" size={20} color={THEME_COLORS.primary} />}
            </TouchableOpacity>
            {isEditing && showDobPicker && (
              <View style={Platform.OS === "ios" ? styles.iosPickerContainer : undefined}>
                <DateTimePicker
                  value={parseDob(userInfo.dateOfBirth)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  onChange={onDobChange}
                  locale="vi-VN"
                  textColor={THEME_COLORS.textPrimary}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={styles.pickerDoneButton}
                    onPress={() => setShowDobPicker(false)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={styles.pickerDoneText}>Xong</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Địa chỉ</Text>
            <TextInput
              style={inputStyle("address", styles.textArea)}
              value={userInfo.address}
              onChangeText={(text) => setUserInfo({ ...userInfo, address: text })}
              editable={isEditing}
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
              placeholderTextColor={THEME_COLORS.textMuted}
              multiline
              numberOfLines={3}
              {...focusProps("address")}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Liên hệ khẩn cấp</Text>
            <TextInput
              style={inputStyle("emergencyContact")}
              value={userInfo.emergencyContact}
              onChangeText={(text) => setUserInfo({ ...userInfo, emergencyContact: text })}
              editable={isEditing}
              placeholder="Số điện thoại người thân"
              placeholderTextColor={THEME_COLORS.textMuted}
              keyboardType="phone-pad"
              {...focusProps("emergencyContact")}
            />
          </View>
        </View>

        {isEditing && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={PRESS_OPACITY}>
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
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
  editText: {
    fontSize: 15,
    color: THEME_COLORS.primary,
    fontWeight: "600",
  },
  editTextCancel: {
    color: THEME_COLORS.textSecondary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACE["4xl"],
  },
  avatarSection: {
    alignItems: "center",
    paddingTop: SPACE["3xl"],
    paddingBottom: SPACE["2xl"],
  },
  avatarContainer: {
    position: "relative",
    width: 112,
    height: 112,
    marginBottom: SPACE.md,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: THEME_COLORS.primary,
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: THEME_COLORS.surface,
  },
  avatarText: {
    ...TYPOGRAPHY.caption,
  },
  form: {
    paddingHorizontal: SPACE.screen,
  },
  inputGroup: {
    marginBottom: SPACE.xl,
  },
  label: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
    marginBottom: SPACE.sm,
  },
  input: {
    ...UI.input,
  },
  inputFocused: {
    ...(UI.inputFocused as TextStyle),
  },
  disabledInput: {
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderColor: THEME_COLORS.border,
    color: THEME_COLORS.textSecondary,
  },
  // ô ngày sinh là TouchableOpacity (View) nên dựng lại từ các thuộc tính của UI.input
  dateInput: {
    height: 48,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
    paddingHorizontal: SPACE.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateInputDisabled: {
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  dateInputFocused: {
    ...UI.inputFocused,
  },
  dateText: {
    fontSize: 15,
    color: THEME_COLORS.textPrimary,
  },
  dateTextDisabled: {
    color: THEME_COLORS.textSecondary,
  },
  iosPickerContainer: {
    ...UI.card,
    marginTop: SPACE.sm,
    overflow: "hidden",
  },
  pickerDoneButton: {
    alignItems: "center",
    paddingVertical: SPACE.md,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
  },
  pickerDoneText: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME_COLORS.primary,
  },
  textArea: {
    height: undefined,
    minHeight: 96,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.md,
    textAlignVertical: "top",
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACE.xs,
  },
  buttonContainer: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.md,
  },
  saveButton: {
    ...UI.primaryButton,
  },
  saveButtonText: {
    ...UI.primaryButtonText,
  },
})
