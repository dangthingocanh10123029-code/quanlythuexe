"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"

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
    color: "#00bb02",
  },
  {
    id: 2,
    type: "reminder",
    title: "Nhắc lịch nhận xe",
    message: "Đừng quên nhận xe Mercedes C-Class lúc 09:00 sáng mai tại Hồ Hoàn Kiếm, Hà Nội. Nhớ mang theo CCCD và GPLX nhé!",
    time: "2 giờ trước",
    read: false,
    icon: "time",
    color: "#4169e1",
  },
  {
    id: 3,
    type: "reminder",
    title: "Sắp đến hạn trả xe",
    message: "Chuyến đi với Honda CR-V sẽ kết thúc lúc 18:00 hôm nay. Vui lòng trả xe đúng giờ để tránh phụ phí.",
    time: "Hôm qua",
    read: false,
    icon: "alarm",
    color: "#ff8c00",
  },
  {
    id: 4,
    type: "promotion",
    title: "Ưu đãi cuối tuần",
    message: "Giảm ngay 20% cho chuyến thuê xe cuối tuần. Nhập mã CUOITUAN20 khi thanh toán qua MoMo.",
    time: "Hôm qua",
    read: true,
    icon: "gift",
    color: "#c2a300",
  },
  {
    id: 5,
    type: "return",
    title: "Trả xe hoàn tất",
    message: "Cảm ơn bạn đã trả xe Toyota Camry đúng hẹn. Tiền đặt cọc sẽ được hoàn về tài khoản trong 1–3 ngày làm việc.",
    time: "3 ngày trước",
    read: true,
    icon: "car",
    color: "#00bb02",
  },
  {
    id: 6,
    type: "payment",
    title: "Thanh toán thành công",
    message: "Bạn đã thanh toán 2.805.000đ qua ZaloPay cho chuyến thuê Toyota Camry 3 ngày.",
    time: "3 ngày trước",
    read: true,
    icon: "card",
    color: "#4169e1",
  },
  {
    id: 7,
    type: "promotion",
    title: "Xe mới tại Đà Nẵng",
    message: "Audi Q7 và Toyota Supra vừa có mặt tại Đà Nẵng. Đặt sớm để giữ xe cho kỳ nghỉ sắp tới!",
    time: "1 tuần trước",
    read: true,
    icon: "car-sport",
    color: "#c2a300",
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
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>{item.title}</Text>
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
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push("/(tabs)")}
        >
          <Ionicons name="arrow-back" size={24} color="#1054CF" />
        </TouchableOpacity>
        <Text style={styles.title}>Thông báo</Text>
      </View>
      
      <View style={styles.content}>
        {unreadCount > 0 && (
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.markAllReadButton} onPress={markAllAsRead}>
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
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1054CF", // Rich blue background
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1054CF",
  },
  backButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)", // Translucent white
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  content: {
    flex: 1,
    backgroundColor: "#f8f9ff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingTop: 30,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: "rgba(16, 84, 207, 0.1)",
    padding: 16,
    borderRadius: 16,
  },
  markAllReadButton: {
    backgroundColor: "#1054CF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  markAllReadText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(16, 84, 207, 0.1)",
    shadowColor: "#1054CF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadCard: {
    backgroundColor: "rgba(16, 84, 207, 0.05)",
    borderColor: "#1054CF",
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1054CF",
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: "800",
    color: "#1054CF",
  },
  notificationTime: {
    fontSize: 12,
    color: "#1054CF",
    opacity: 0.6,
    fontWeight: "500",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFB700",
    position: 'absolute',
    top: 16,
    right: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    marginBottom: 24,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    color: "#1054CF",
    textAlign: 'center',
    fontWeight: '600',
  },
  unreadCount: {
    backgroundColor: "#FFB700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unreadCountText: {
    color: "#1054CF",
    fontSize: 14,
    fontWeight: "700",
  }
})
