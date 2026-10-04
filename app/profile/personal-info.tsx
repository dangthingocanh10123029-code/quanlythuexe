"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, Platform } from "react-native"
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        <TouchableOpacity
          onPress={() => {
            setIsEditing(!isEditing)
            setShowDobPicker(false)
          }}
        >
          <Text style={styles.editText}>{isEditing ? "Huỷ" : "Chỉnh sửa"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={isEditing ? pickImage : undefined}
            style={styles.avatarContainer}
          >
            <Image
              source={{
                uri: userInfo.avatar || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNDE2OWUxIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmb250LWZhbWlseT0ic3lzdGVtLXVpIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+TkE8L3RleHQ+Cjwvc3ZnPgo="
              }}
              style={styles.avatar}
            />
            {isEditing && (
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={20} color="#ffffff" />
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
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={userInfo.fullName}
              onChangeText={(text) => setUserInfo({ ...userInfo, fullName: text })}
              editable={isEditing}
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
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={userInfo.phone}
              onChangeText={(text) => setUserInfo({ ...userInfo, phone: text })}
              editable={isEditing}
              placeholder="0901 234 567"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ngày sinh</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateInput, !isEditing && styles.disabledInput]}
              disabled={!isEditing}
              onPress={() => setShowDobPicker((prev) => !prev)}
            >
              <Text style={[styles.dateText, !isEditing && styles.dateTextDisabled]}>{userInfo.dateOfBirth}</Text>
              {isEditing && <Ionicons name="calendar" size={20} color="#FFB700" />}
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
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity style={styles.pickerDoneButton} onPress={() => setShowDobPicker(false)}>
                    <Text style={styles.pickerDoneText}>Xong</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Địa chỉ</Text>
            <TextInput
              style={[styles.input, styles.textArea, !isEditing && styles.disabledInput]}
              value={userInfo.address}
              onChangeText={(text) => setUserInfo({ ...userInfo, address: text })}
              editable={isEditing}
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Liên hệ khẩn cấp</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={userInfo.emergencyContact}
              onChangeText={(text) => setUserInfo({ ...userInfo, emergencyContact: text })}
              editable={isEditing}
              placeholder="Số điện thoại người thân"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {isEditing && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
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
    flex: 1,
    backgroundColor: "#1054CF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
  },
  editText: {
    fontSize: 16,
    color: "#FFB700",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  avatarContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#FFB700",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(255, 183, 0, 0.2)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFB700",
  },
  avatarText: {
    fontSize: 16,
    color: "#ffffff",
    opacity: 0.8,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#FFB700",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#ffffff",
  },
  disabledInput: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    color: "rgba(255, 255, 255, 0.6)",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 16,
    color: "#ffffff",
  },
  dateTextDisabled: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  iosPickerContainer: {
    marginTop: 8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
  },
  pickerDoneButton: {
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1054CF",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
  },
  buttonContainer: {
    padding: 20,
  },
  saveButton: {
    backgroundColor: "#FFB700",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
})

