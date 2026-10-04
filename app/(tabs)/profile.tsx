"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Image } from "react-native"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { signOut } from "firebase/auth"
import { auth } from "../../config/firebase"
import { useAuth } from "../../hooks/useAuth"
import { updateProfile } from "firebase/auth"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "../../config/firebase"
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { formatDate } from "../../utils/helpers";
import { PRESS_OPACITY, RADIUS, SHADOWS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../../utils/theme";

// createdAt có thể là Firestore Timestamp, Date, chuỗi hoặc số
const formatMemberSince = (createdAt: any): string => {
  if (!createdAt) return "01/01/2024"
  try {
    const date: Date =
      typeof createdAt?.toDate === "function"
        ? createdAt.toDate()
        : typeof createdAt?.seconds === "number"
          ? new Date(createdAt.seconds * 1000)
          : new Date(createdAt)
    if (isNaN(date.getTime())) return "01/01/2024"
    return formatDate(date, "short")
  } catch {
    return "01/01/2024"
  }
}

const menuItems = [
  {
    id: 1,
    title: "Thông tin cá nhân",
    icon: "person-outline",
    route: "/profile/personal-info",
  },
  {
    id: 2,
    title: "Giấy phép lái xe (GPLX)",
    icon: "card-outline",
    route: "/profile/license",
  },
  {
    id: 3,
    title: "Phương thức thanh toán",
    icon: "wallet-outline",
    route: "/profile/payment",
  },
  {
    id: 4,
    title: "Lịch sử thuê xe",
    icon: "time-outline",
    route: "/profile/history",
  },
  {
    id: 5,
    title: "Cài đặt",
    icon: "settings-outline",
    route: "/profile/settings",
  },
  {
    id: 6,
    title: "Trợ giúp & Hỗ trợ",
    icon: "help-circle-outline",
    route: "/profile/support",
  },
]

export default function ProfileScreen() {
  const { user, isAdmin } = useAuth()
  const [userProfile, setUserProfile] = useState({
    name: user?.fullName || auth.currentUser?.displayName || "Nguyễn Văn An",
    email: user?.email || auth.currentUser?.email || "nguyenvanan@gmail.com",
    phone: user?.phone || "+84 901 234 567",
    avatar: user?.avatar || auth.currentUser?.photoURL || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNDE2OWUxIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmb250LWZhbWlseT0ic3lzdGVtLXVpIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+TkE8L3RleHQ+Cjwvc3ZnPgo=",
    memberSince: formatMemberSince(user?.createdAt),
  })

  // Update the useFocusEffect to properly sync the avatar
  useFocusEffect(
    useCallback(() => {
      setUserProfile(prev => ({
        ...prev,
        name: user?.fullName || auth.currentUser?.displayName || "Nguyễn Văn An",
        email: user?.email || auth.currentUser?.email || "nguyenvanan@gmail.com",
        phone: user?.phone || "+84 901 234 567",
        avatar: user?.avatar || auth.currentUser?.photoURL || prev.avatar,
        memberSince: formatMemberSince(user?.createdAt),
      }))
    }, [user])
  )

  const [logoutModalVisible, setLogoutModalVisible] = useState(false)

  const handleLogout = async () => {
    setLogoutModalVisible(true)
  }

  const confirmLogout = async () => {
    try {
      await signOut(auth)
      setLogoutModalVisible(false)
      router.replace("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }


  // Nhóm menu theo chức năng (chỉ bố cục — giữ nguyên các mục & route)
  const menuGroups = [
    { title: "Tài khoản", ids: [1, 2, 3] },
    { title: "Hoạt động", ids: [4] },
    { title: "Ứng dụng", ids: [5, 6] },
  ]

  const renderMenuItem = (item: any, index: number) => (
    <View key={item.id}>
      {index > 0 && <View style={styles.menuDivider} />}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => router.push(item.route)}
        activeOpacity={PRESS_OPACITY}
      >
        <View style={styles.menuItemLeft}>
          <View style={styles.menuItemIconContainer}>
            <Ionicons name={item.icon as any} size={20} color={THEME_COLORS.textSecondary} />
          </View>
          <Text style={styles.menuItemText}>{item.title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={THEME_COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tài khoản</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push("/admin")}
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons name="settings-outline" size={16} color={THEME_COLORS.primary} />
              <Text style={styles.adminButtonText}>Quản trị</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Thông tin người dùng */}
        <View style={styles.userCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => router.push("/profile/personal-info")}
            activeOpacity={PRESS_OPACITY}
          >
            <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
            <View style={styles.editAvatarButton}>
              <Ionicons name="camera" size={13} color={THEME_COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{userProfile.name}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{userProfile.email}</Text>
            <Text style={styles.userPhone} numberOfLines={1}>{userProfile.phone}</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push("/profile/personal-info")}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons name="pencil" size={18} color={THEME_COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        {menuGroups.map((group) => (
          <View key={group.title} style={styles.menuSection}>
            <Text style={styles.sectionLabel}>{group.title}</Text>
            <View style={styles.menuContainer}>
              {menuItems.filter((m) => group.ids.includes(m.id)).map(renderMenuItem)}
            </View>
          </View>
        ))}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={PRESS_OPACITY}>
            <Ionicons name="log-out-outline" size={20} color={THEME_COLORS.danger} />
            <Text style={styles.logoutButtonText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="log-out-outline" size={24} color={THEME_COLORS.danger} />
            </View>
            <Text style={styles.modalTitle}>Đăng xuất</Text>
            <Text style={styles.modalMessage}>Bạn có chắc muốn đăng xuất không?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogoutModalVisible(false)}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={styles.cancelButtonText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmLogout}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={styles.confirmButtonText}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  scrollContent: {
    paddingHorizontal: SPACE.screen,
    // chừa chỗ cho thanh tab nổi (cao 80 + cách đáy 20) + khoảng thở
    paddingBottom: 80 + 20 + SPACE["2xl"],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SPACE.xl,
    paddingBottom: SPACE["2xl"],
  },
  title: {
    ...TYPOGRAPHY.h1,
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.primarySoft,
  },
  adminButtonText: {
    color: THEME_COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  userCard: {
    ...UI.card,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.lg,
    padding: SPACE.xl,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME_COLORS.surface,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.xs,
  },
  userEmail: {
    ...TYPOGRAPHY.caption,
    marginBottom: 2,
  },
  userPhone: {
    ...TYPOGRAPHY.caption,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  menuSection: {
    marginTop: SPACE["3xl"],
  },
  sectionLabel: {
    ...TYPOGRAPHY.overline,
    marginBottom: SPACE.md,
    marginLeft: SPACE.xs,
  },
  menuContainer: {
    ...UI.card,
    paddingVertical: SPACE.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: SPACE.lg,
  },
  menuDivider: {
    ...UI.divider,
    // thụt lề bằng chiều rộng ô icon + khoảng cách
    marginLeft: SPACE.lg + 40 + SPACE.md,
  },
  menuItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  menuItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    ...TYPOGRAPHY.bodyStrong,
    flexShrink: 1,
  },
  actionContainer: {
    marginTop: SPACE["3xl"],
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.sm,
    height: 52,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.dangerSoft,
  },
  logoutButtonText: {
    color: THEME_COLORS.danger,
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACE.screen,
  },
  modalContent: {
    backgroundColor: THEME_COLORS.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACE["2xl"],
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    ...SHADOWS.raised,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME_COLORS.dangerSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACE.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.sm,
  },
  modalMessage: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginBottom: SPACE["2xl"],
  },
  modalButtons: {
    flexDirection: "row",
    gap: SPACE.md,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.control,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: THEME_COLORS.surface,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  confirmButton: {
    backgroundColor: THEME_COLORS.dangerSoft,
  },
  cancelButtonText: {
    ...UI.secondaryButtonText,
    fontSize: 15,
  },
  confirmButtonText: {
    color: THEME_COLORS.danger,
    fontSize: 15,
    fontWeight: "600",
  },
})
