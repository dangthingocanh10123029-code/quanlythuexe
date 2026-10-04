"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { THEME_COLORS, RADIUS, SPACE, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"

// Nền soft tương ứng với màu icon của từng loại thông báo
const SOFT_BY_COLOR: Record<string, string> = {
  [THEME_COLORS.success]: THEME_COLORS.successSoft,
  [THEME_COLORS.primary]: THEME_COLORS.primarySoft,
  [THEME_COLORS.warning]: THEME_COLORS.warningSoft,
}
// Thông báo chưa đọc: nền primarySoft nhạt (≈50%) + viền primary rất nhẹ
const UNREAD_BG = "#F6F9FF"
const UNREAD_BORDER = "#D6E3FB"

const READ_STORAGE_KEY = "rento:readNotificationIds"

const initialNotifications = [
  {
    id: 1,
    type: "booking",
    title: "Đặt xe thành công",
    message: "Đơn đặt xe BMW X5 của bạn đã được xác nhận, nhận xe tại Sân bay Tân Sơn Nhất từ 12/10 đến 15/10/2026.",
    time: "5 phút trước",
    read: false,
    icon: "checkmark-circle",
    color: THEME_COLORS.success,
  },
  {
    id: 2,
    type: "reminder",
    title: "Nhắc lịch nhận xe",
    message: "Đừng quên nhận xe Mercedes C-Class lúc 09:00 sáng mai tại Hồ Hoàn Kiếm, Hà Nội. Nhớ mang theo CCCD và GPLX nhé!",
    time: "2 giờ trước",
    read: false,
    icon: "time",
    color: THEME_COLORS.primary,
  },
  {
    id: 3,
    type: "reminder",
    title: "Sắp đến hạn trả xe",
    message: "Chuyến đi với Honda CR-V sẽ kết thúc lúc 18:00 hôm nay. Vui lòng trả xe đúng giờ để tránh phụ phí.",
    time: "Hôm qua",
    read: false,
    icon: "alarm",
    color: THEME_COLORS.warning,
  },
  {
    id: 4,
    type: "promotion",
    title: "Ưu đãi cuối tuần",
    message: "Giảm ngay 20% cho chuyến thuê xe cuối tuần. Nhập mã CUOITUAN20 khi thanh toán qua MoMo.",
    time: "Hôm qua",
    read: true,
    icon: "gift",
    color: THEME_COLORS.warning,
  },
  {
    id: 5,
    type: "return",
    title: "Trả xe hoàn tất",
    message: "Cảm ơn bạn đã trả xe Toyota Camry đúng hẹn. Tiền đặt cọc sẽ được hoàn về tài khoản trong 1–3 ngày làm việc.",
    time: "3 ngày trước",
    read: true,
    icon: "car",
    color: THEME_COLORS.success,
  },
  {
    id: 6,
    type: "payment",
    title: "Thanh toán thành công",
    message: "Bạn đã thanh toán 2.805.000đ qua ZaloPay cho chuyến thuê Toyota Camry 3 ngày.",
    time: "3 ngày trước",
    read: true,
    icon: "card",
    color: THEME_COLORS.primary,
  },
  {
    id: 7,
    type: "promotion",
    title: "Xe mới tại Đà Nẵng",
    message: "Audi Q7 và Toyota Supra vừa có mặt tại Đà Nẵng. Đặt sớm để giữ xe cho kỳ nghỉ sắp tới!",
    time: "1 tuần trước",
    read: true,
    icon: "car-sport",
    color: THEME_COLORS.warning,
  },
]

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(initialNotifications)

  // Khôi phục trạng thái đã đọc đã lưu trên máy
  useEffect(() => {
    let cancelled = false
    const loadReadState = async () => {
      try {
        const stored = await AsyncStorage.getItem(READ_STORAGE_KEY)
        if (!stored || cancelled) return
        const readIds: number[] = JSON.parse(stored)
        if (!Array.isArray(readIds)) return
        setNotifications((prev) => prev.map((n) => (readIds.includes(n.id) ? { ...n, read: true } : n)))
      } catch (error) {
        console.error("Error loading notification read state:", error)
      }
    }
    loadReadState()
    return () => {
      cancelled = true
    }
  }, [])

  const persistReadState = async (list: typeof initialNotifications) => {
    try {
      const readIds = list.filter((n) => n.read).map((n) => n.id)
      await AsyncStorage.setItem(READ_STORAGE_KEY, JSON.stringify(readIds))
    } catch (error) {
      console.error("Error saving notification read state:", error)
    }
  }

  const markAsRead = (id: number) => {
    setNotifications((prev) => {
      if (!prev.some((n) => n.id === id && !n.read)) return prev
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      persistReadState(next)
      return next
    })
  }

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }))
      persistReadState(next)
      return next
    })
  }

  const renderNotificationItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={PRESS_OPACITY}
    >
      <View style={[styles.iconContainer, { backgroundColor: SOFT_BY_COLOR[item.color] ?? THEME_COLORS.surfaceMuted }]}>
        <Ionicons name={item.icon as any} size={22} color={item.color} />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>
        <Text style={styles.notificationMessage}>{item.message}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)")}
          activeOpacity={PRESS_OPACITY}
        >
          <Ionicons name="arrow-back" size={22} color={THEME_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Thông báo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {unreadCount > 0 && (
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.markAllReadButton} onPress={markAllAsRead} activeOpacity={PRESS_OPACITY}>
              <Ionicons name="checkmark-done" size={16} color={THEME_COLORS.primary} />
              <Text style={styles.markAllReadText}>Đánh dấu tất cả đã đọc</Text>
            </TouchableOpacity>
          </View>
        )}

        {notifications.length === 0 ? (
          <Text style={styles.emptyText}>Bạn chưa có thông báo nào</Text>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
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
    backgroundColor: THEME_COLORS.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    ...TYPOGRAPHY.h3,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACE.screen,
  },
  listContainer: {
    paddingTop: SPACE.sm,
    paddingBottom: SPACE.section,
    gap: SPACE.md,
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: SPACE.xs,
    marginBottom: SPACE.sm,
  },
  markAllReadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
    height: 36,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.primarySoft,
  },
  markAllReadText: {
    color: THEME_COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  notificationCard: {
    ...UI.card,
    flexDirection: "row",
    padding: SPACE.lg,
    alignItems: "flex-start",
  },
  unreadCard: {
    backgroundColor: UNREAD_BG,
    borderColor: UNREAD_BORDER,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACE.md,
  },
  notificationContent: {
    flex: 1,
    paddingRight: SPACE.md,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACE.xs,
    gap: SPACE.sm,
  },
  notificationTitle: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.textSecondary,
    flex: 1,
  },
  unreadTitle: {
    color: THEME_COLORS.textPrimary,
    fontWeight: "700",
  },
  notificationTime: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
  notificationMessage: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primary,
    position: "absolute",
    top: SPACE.lg,
    right: SPACE.md,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginTop: SPACE.section,
  },
})
