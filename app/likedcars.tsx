"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { db } from "../config/firebase"
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore"
import { useAuth } from "../hooks/useAuth"
import { cars } from "../data/cars"
import { formatCurrency } from "../utils/helpers"
import { StatusBar } from "expo-status-bar"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"

// Update the interface first
interface LikedCarDocument {
  id: string;
  userId: string;
  carId: string;
  createdAt: Date;
}

interface LikedCar extends LikedCarDocument {
  name: string;
  brand: string;
  model: string;
  year: number;
  pricePerDay: number;
  location: string;
  seats: number;
  rating: number;
  availability: boolean;
  type: string;
  fuel: string;
  image: any;
}

export default function LikedCarsScreen() {
  const { user } = useAuth()
  const [likedCars, setLikedCars] = useState<LikedCar[]>([])

  useEffect(() => {
    if (user) {
      fetchLikedCars()
    }
  }, [user])

  const fetchLikedCars = async () => {
    if (!user) return

    try {
      const q = query(
        collection(db, "likedCars"),
        where("userId", "==", user.id) // Changed from user.id to user.uid
      )
      const querySnapshot = await getDocs(q)
      const likedCarData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LikedCarDocument[]

      // Get full car details for each liked car
      // Bỏ qua các xe không còn trong danh sách xe tĩnh
      const fullLikedCars = likedCarData
        .map(likedCar => {
          const carDetails = cars.find(car => car.id === likedCar.carId)
          return carDetails ? ({ ...likedCar, ...carDetails, id: likedCar.id } as LikedCar) : null
        })
        .filter((car): car is LikedCar => car !== null)

      setLikedCars(fullLikedCars)
    } catch (error) {
      console.error("Error fetching liked cars:", error)
      Alert.alert("Lỗi", "Không tải được danh sách xe yêu thích. Vui lòng thử lại.")
    }
  }

  const handleUnlike = async (carId: string) => {
    if (!user) return
    try {
      const q = query(
        collection(db, "likedCars"),
        where("userId", "==", user.id),
        where("carId", "==", carId)
      )
      const querySnapshot = await getDocs(q)
      // Chờ xoá xong toàn bộ rồi mới cập nhật giao diện
      await Promise.all(querySnapshot.docs.map((document) => deleteDoc(doc(db, "likedCars", document.id))))
      setLikedCars(prev => prev.filter(car => car.carId !== carId))
    } catch (error) {
      console.error("Error unliking car:", error)
      Alert.alert("Lỗi", "Không thể bỏ yêu thích xe này. Vui lòng thử lại.")
    }
  }

  const renderCarItem = ({ item }: { item: LikedCar }) => (
    <TouchableOpacity
      style={styles.carCard}
      activeOpacity={PRESS_OPACITY}
      onPress={() => router.push({
        pathname: "/car-details/[id]",
        params: { id: item.carId }
      })}
    >
      <View style={styles.imageWrapper}>
        <Image source={item.image} style={styles.carImage} resizeMode="contain" />
        <TouchableOpacity
          onPress={() => handleUnlike(item.carId)}
          style={styles.unlikeButton}
          activeOpacity={PRESS_OPACITY}
        >
          <Ionicons name="heart" size={20} color={THEME_COLORS.danger} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.carName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.carPrice}>{formatCurrency(item.pricePerDay)}/ngày</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={THEME_COLORS.textMuted} />
          <Text style={styles.metaText}>{item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="arrow-back" size={22} color={THEME_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Xe yêu thích</Text>
        <View style={styles.headerSpacer} />
      </View>

      {likedCars.length > 0 ? (
        <FlatList
          data={likedCars}
          renderItem={renderCarItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="heart-outline" size={40} color={THEME_COLORS.primary} />
          </View>
          <Text style={styles.emptyText}>Bạn chưa có xe yêu thích nào</Text>
        </View>
      )}
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
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    ...TYPOGRAPHY.h3,
  },
  listContainer: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.section,
    gap: SPACE.lg,
  },
  carCard: {
    ...UI.card,
    overflow: "hidden",
  },
  imageWrapper: {
    backgroundColor: THEME_COLORS.surfaceMuted,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  carImage: {
    width: "88%",
    height: "88%",
  },
  cardContent: {
    padding: SPACE.lg,
    gap: SPACE.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACE.md,
  },
  carName: {
    ...TYPOGRAPHY.h3,
    flex: 1,
  },
  carPrice: {
    ...TYPOGRAPHY.price,
    fontSize: 15,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
  },
  unlikeButton: {
    position: "absolute",
    top: SPACE.md,
    right: SPACE.md,
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.card,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACE.screen,
    paddingBottom: SPACE.section,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.lg,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
  },
})
