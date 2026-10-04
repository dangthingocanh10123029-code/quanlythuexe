"use client"

import { useEffect, useMemo, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Image, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "../../config/firebase"
import { useAuth } from "../../hooks/useAuth"
import { cars } from "../../data/cars"
import { formatCurrency, formatDate } from "../../utils/helpers"
import { getBookingStatusLabel } from "../../utils/constants"

interface RentalHistoryItem {
  id: string
  carId?: string
  carName: string
  carImage: any
  startDate: Date | null
  endDate: Date | null
  days: number
  totalCost: number
  status: string
  location: string
}

// createdAt / pickupDate có thể là Firestore Timestamp, Date hoặc chuỗi
const toDate = (value: any): Date | null => {
  if (!value) return null
  if (typeof value.toDate === "function") return value.toDate()
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000)
  const d = value instanceof Date ? value : new Date(value)
  return isNaN(d.getTime()) ? null : d
}

const resolveCarImage = (carId?: string, carImage?: any) => {
  const local = cars.find((c) => c.id === carId)
  if (local) return local.image
  if (typeof carImage === "number") return carImage
  if (typeof carImage === "string" && carImage) return { uri: carImage }
  return null
}

export default function HistoryScreen() {
  const { user } = useAuth()
  const [filter, setFilter] = useState("all")
  const [rentalHistory, setRentalHistory] = useState<RentalHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setRentalHistory([])
      setLoading(false)
      return
    }

    // Không dùng orderBy để khỏi cần composite index; sắp xếp phía client
    const q = query(collection(db, "bookings"), where("userId", "==", user.id))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data: any = docSnap.data()
          const days = Number(data.duration) || 1
          const startDate = toDate(data.pickupDate) ?? toDate(data.createdAt)
          const endDate = startDate ? new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000) : null
          return {
            id: docSnap.id,
            carId: data.carId,
            carName: data.carName || "Xe thuê",
            carImage: resolveCarImage(data.carId, data.carImage),
            startDate,
            endDate,
            days,
            totalCost: Number(data.price) || 0,
            status: data.status || "Pending",
            location: data.location || "",
          }
        })
        items.sort((a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0))
        setRentalHistory(items)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching rental history:", error)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [user])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "#00bb02"
      case "upcoming":
        return "#1054CF"
      case "pending":
        return "#ffa500"
      case "cancelled":
      case "canceled":
        return "#ff4444"
      default:
        return "#666666"
    }
  }

  const isStatus = (rental: RentalHistoryItem, status: string) => rental.status.toLowerCase() === status

  const filteredHistory = rentalHistory.filter((rental) => {
    if (filter === "active") return isStatus(rental, "active")
    if (filter === "completed") return isStatus(rental, "completed")
    return true
  })

  const completedRentals = useMemo(() => rentalHistory.filter((r) => isStatus(r, "completed")), [rentalHistory])
  const totalSpent = completedRentals.reduce((sum, rental) => sum + rental.totalCost, 0)
  const totalRentals = completedRentals.length
  const totalDays = completedRentals.reduce((sum, rental) => sum + rental.days, 0)

  const renderHistoryItem = ({ item }: { item: RentalHistoryItem }) => (
    <TouchableOpacity style={styles.historyCard} onPress={() => router.push("/(tabs)/bookings")} activeOpacity={0.7}>
      {item.carImage ? (
        <Image source={item.carImage} style={styles.carImage} resizeMode="contain" />
      ) : (
        <View style={[styles.carImage, styles.carImagePlaceholder]}>
          <Ionicons name="car-sport" size={32} color="#999999" />
        </View>
      )}
      <View style={styles.historyInfo}>
        <View style={styles.historyHeader}>
          <Text style={styles.carName}>{item.carName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getBookingStatusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {item.startDate && item.endDate
              ? `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`
              : "Chưa có ngày nhận xe"}
          </Text>
          <Text style={styles.durationText}>({item.days} ngày)</Text>
        </View>

        <View style={styles.locationContainer}>
          <Ionicons name="location" size={14} color="#666666" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.totalCost}>{formatCurrency(item.totalCost)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử thuê xe</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalRentals}</Text>
            <Text style={styles.statLabel}>Chuyến đã đi</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(totalSpent)}
            </Text>
            <Text style={styles.statLabel}>Tổng chi tiêu</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalDays}</Text>
            <Text style={styles.statLabel}>Ngày đã thuê</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === "all" && styles.activeFilterTab]}
            onPress={() => setFilter("all")}
          >
            <Text style={[styles.filterText, filter === "all" && styles.activeFilterText]}>
              Tất cả ({rentalHistory.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "active" && styles.activeFilterTab]}
            onPress={() => setFilter("active")}
          >
            <Text style={[styles.filterText, filter === "active" && styles.activeFilterText]}>
              Đang thuê ({rentalHistory.filter((r) => isStatus(r, "active")).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "completed" && styles.activeFilterTab]}
            onPress={() => setFilter("completed")}
          >
            <Text style={[styles.filterText, filter === "completed" && styles.activeFilterText]}>
              Hoàn thành ({completedRentals.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* History List */}
        <View style={styles.historyList}>
          {loading ? (
            <ActivityIndicator size="large" color="#1054CF" style={{ marginTop: 40 }} />
          ) : filteredHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={48} color="#999999" />
              <Text style={styles.emptyText}>
                {user ? "Chưa có chuyến thuê nào" : "Vui lòng đăng nhập để xem lịch sử thuê xe"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredHistory}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  carImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#ededed",
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
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1054CF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#f8f9fa",
    marginHorizontal: 20,
    borderRadius: 8,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  activeFilterTab: {
    backgroundColor: "#1054CF",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
  },
  activeFilterText: {
    color: "#ffffff",
  },
  historyList: {
    paddingHorizontal: 20,
  },
  historyCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  carImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  historyInfo: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  carName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: "#666666",
    marginRight: 8,
  },
  durationText: {
    fontSize: 12,
    color: "#999999",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: "#666666",
    marginLeft: 4,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalCost: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4169e1",
  },
  ratingContainer: {
    flexDirection: "row",
    gap: 2,
  },
  ratingStars: {
    color: "#FFB700",
  },
})
