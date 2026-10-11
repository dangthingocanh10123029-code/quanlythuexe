"use client"

import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { useNotifications } from "../hooks/useNotifications"
import { toDate } from "../utils/booking"
import { formatDate } from "../utils/helpers"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { THEME_COLORS, RADIUS, SPACE, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"

// Thông báo chưa đọc: nền primarySubtle + viền primary rất nhẹ
const UNREAD_BORDER = "#D6E3FB"

// Icon + màu (chữ / nền soft) theo loại thông báo (types/notification.ts)
const TYPE_STYLE: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }> = {
  booking: { icon: "car", color: THEME_COLORS.primary, bg: THEME_COLORS.primarySoft, label: "Chuyến đi" },
  payment: { icon: "card", color: THEME_COLORS.success, bg: THEME_COLORS.successSoft, label: "Thanh toán" },
  license: { icon: "id-card", color: THEME_COLORS.warning, bg: THEME_COLORS.warningSoft, label: "GPLX" },
  support: { icon: "chatbubbles", color: THEME_COLORS.primary, bg: THEME_COLORS.primarySoft, label: "Hỗ trợ" },
  system: { icon: "notifications", color: THEME_COLORS.textSecondary, bg: THEME_COLORS.surfaceMuted, label: "Hệ thống" },
}

export default function NotificationsScreen() {
  const { notifications: list, unreadCount, loading, error, markAsRead: markRead, markAllAsRead } = useNotifications()
  const notifications = list.map((n) => {
    const at = toDate(n.createdAt)
    return { ...n, ...(TYPE_STYLE[n.type] ?? TYPE_STYLE.system), time: at ? formatDate(at, "datetime") : "" }
  })

  // Bấm thông báo: đánh dấu đã đọc, có đơn thì mở chi tiết đơn
  const openNotification = (item: (typeof notifications)[number]) => {
    if (!item.read) markRead(item.id).catch((error) => console.error("Error marking notification read:", error))
    if (item.bookingId) router.push({ pathname: "/booking/[id]", params: { id: item.bookingId } })
  }

  const renderNotificationItem = ({ item }: { item: (typeof notifications)[number] }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => openNotification(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? "" : "Chưa đọc. "}${item.title}`}
      activeOpacity={PRESS_OPACITY}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.bg }]}>
        <Ionicons name={item.icon} size={22} color={item.color} />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.typeLabel, { color: item.color }]}>{item.label}</Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>
        <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        {item.bookingId ? (
          <View style={styles.linkRow}>
            <Text style={styles.linkText}>Xem chi tiết chuyến đi</Text>
            <Ionicons name="chevron-forward" size={14} color={THEME_COLORS.primary} />
          </View>
        ) : null}
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )

  const renderEmpty = () => {
    if (loading) return <ActivityIndicator size="large" color={THEME_COLORS.primary} style={styles.loading} />
    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIcon, error ? styles.emptyIconError : null]}>
          <Ionicons
            name={error ? "cloud-offline-outline" : "notifications-off-outline"}
            size={32}
            color={error ? THEME_COLORS.danger : THEME_COLORS.textMuted}
          />
        </View>
        <Text style={styles.emptyTitle}>{error ? "Không tải được thông báo" : "Chưa có thông báo"}</Text>
        <Text style={styles.emptyText}>
          {error
            ? "Vui lòng kiểm tra kết nối mạng rồi mở lại màn hình này."
            : "Cập nhật về chuyến đi, thanh toán và GPLX của bạn sẽ hiển thị ở đây."}
        </Text>
      </View>
    )
  }

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
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Thông báo</Text>
          {unreadCount > 0 ? <Text style={styles.subtitle}>{unreadCount} chưa đọc</Text> : null}
        </View>
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
          renderEmpty()
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
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.border,
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
  titleWrap: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    ...TYPOGRAPHY.h3,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACE.screen,
  },
  listContainer: {
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.section,
    gap: SPACE.md,
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: SPACE.md,
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
    backgroundColor: THEME_COLORS.primarySubtle,
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
  typeLabel: {
    ...TYPOGRAPHY.overline,
    fontSize: 11,
    flex: 1,
  },
  notificationTitle: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.textSecondary,
    marginBottom: 2,
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
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: SPACE.sm,
  },
  linkText: {
    color: THEME_COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
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
  loading: {
    marginTop: SPACE.section,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: SPACE.section * 2,
    paddingHorizontal: SPACE.lg,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.lg,
  },
  emptyIconError: {
    backgroundColor: THEME_COLORS.dangerSoft,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    textAlign: "center",
    marginBottom: SPACE.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
  },
})
