PROFILE:"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Image } from "react-native"
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


  const renderMenuItem = (item: any) => (
    <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => router.push(item.route)}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuItemIconContainer}>
          <Ionicons name={item.icon as any} size={22} color="#FFB700" />
        </View>
        <Text style={styles.menuItemText}>{item.title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#FFB700" />
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tài khoản</Text>
          {isAdmin && (
            <TouchableOpacity style={styles.adminButton} onPress={() => router.push("/admin")}>
              <Ionicons name="settings" size={20} color="#ffffff" />
              <Text style={styles.adminButtonText}>Quản trị</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* User Info Card - removed avatar */}
        <View style={styles.userCard}>
          <View style={styles.userCardContent}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => router.push("/profile/personal-info")}
            >
              <Image
                source={{ uri: userProfile.avatar }}
                style={styles.avatar}
              />
              <View style={styles.editAvatarButton}>
                <Ionicons name="camera" size={14} color="#FFB700" />
              </View>
            </TouchableOpacity>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userProfile.name}</Text>
              <Text style={styles.userEmail}>{userProfile.email}</Text>
              <Text style={styles.userPhone}>{userProfile.phone}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => router.push("/profile/personal-info")}>
            <Ionicons name="pencil" size={20} color="#4169e1" />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>{menuItems.map(renderMenuItem)}</View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={24} color="#ffffff" />
            <Text style={styles.logoutButtonText}>Đăng xuất</Text>
          </TouchableOpacity>

        </View>

        {/* Add bottom spacer */}
        <View style={styles.bottomSpacer} />
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
            <Text style={styles.modalTitle}>Đăng xuất</Text>
            <Text style={styles.modalMessage}>Bạn có chắc muốn đăng xuất không?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmLogout}
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
    flex: 1,
    backgroundColor: "#1054CF",
  },
  header: {
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 183, 0, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFB700",
  },
  adminButtonText: {
    color: "#FFB700",
    fontSize: 14,
    fontWeight: "600",
  },
  userCard: {
    backgroundColor: "rgba(255, 183, 0, 0.1)",
    margin: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#FFB700",
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#FFB700",
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(255, 183, 0, 0.2)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB700',
  },
  userInfo: {
    alignItems: "center",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 12,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.9,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.9,
    marginBottom: 12,
  },
  adminBadge: {
    backgroundColor: "#FFB700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  adminBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  userStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFB700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#ffffff",
    opacity: 0.9,
  },
  menuContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FFB700",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  menuItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 183, 0, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },
  actionContainer: {
    padding: 20,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 59, 48, 0.2)",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  logoutButtonText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContent: {
    backgroundColor: "#1054CF",
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#FFB700",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  confirmButton: {
    backgroundColor: '#FFB700',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    backgroundColor: 'rgba(255, 183, 0, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB700',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  bottomSpacer: {
    height: 150, // Adjust this value based on your tab bar height
  },
})

