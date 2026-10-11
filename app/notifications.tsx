"use client"

import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { useNotifications } from "../hooks/useNotifications"
import { toDate } from "../utils/booking"
import { formatDate } from "../utils/helpers"
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

// Icon + màu theo loại thông báo (types/notification.ts)
const TYPE_STYLE: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  booking: { icon: "car", color: THEME_COLORS.primary },
  payment: { icon: "card", color: THEME_COLORS.success },
  license: { icon: "id-card", color: THEME_COLORS.warning },
  support: { icon: "chatbubbles", color: THEME_COLORS.primary },
  system: { icon: "notifications", color: THEME_COLORS.warning },
}

export default function NotificationsScreen() {
  // ponytail: giao diện giữ như cũ, U5.3 làm lại (icon theo loại, đã đọc/chưa đọc, rỗng)
  const { notifications: list, markAsRead: markRead, markAllAsRead } = useNotifications()
  const notifications = list.map((n) => {
    const at = toDate(n.createdAt)
    return { ...n, ...(TYPE_STYLE[n.type] ?? TYPE_STYLE.system), time: at ? formatDate(at, "datetime") : "" }
  })

  // Bấm thông báo: đánh dấu đã đọc, có đơn thì mở chi tiết đơn
  const openNotification = (item: (typeof notifications)[number]) => {
    if (!item.read) markRead(item.id).catch((error) => console.error("Error marking notification read:", error))
    if (item.bookingId) router.push({ pathname: "/booking/[id]", params: { id: item.bookingId } })
  }

  const renderNotificationItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => openNotification(item)}
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
            <TouchableOpacity style={styles.markAllReadButton} onPress={() => markAllAsRead().catch(console.error)} activeOpacity={PRESS_OPACITY}>
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
