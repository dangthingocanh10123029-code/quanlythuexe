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
      onPress={() => router.push({
        pathname: "/car-details/[id]",
        params: { id: item.carId }
      })}
    >
      <Image source={item.image} style={styles.carImage} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.carName}>{item.name}</Text>
          <TouchableOpacity 
            onPress={() => handleUnlike(item.carId)}
            style={styles.unlikeButton}
          >
            <Ionicons name="heart" size={24} color="#FF4B4B" />
          </TouchableOpacity>
        </View>
        <Text style={styles.carPrice}>{formatCurrency(item.pricePerDay)}/ngày</Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1054CF" />
        </TouchableOpacity>
        <Text style={styles.title}>Xe yêu thích</Text>
        <View style={{ width: 24 }} />
      </View>

      {likedCars.length > 0 ? (
        <FlatList
          data={likedCars}
          renderItem={renderCarItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={80} color="#1054CF" />
          <Text style={styles.emptyText}>Bạn chưa có xe yêu thích nào</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFB700", // Changed to yellow background
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(16, 84, 207, 0.2)", // Translucent blue
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1054CF", // Dark blue text
  },
  listContainer: {
    padding: 16,
  },
  carCard: {
    backgroundColor: "rgba(16, 84, 207, 0.1)", // Translucent blue
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1054CF", // Dark blue border
    shadowColor: "#1054CF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  carImage: {
    width: "100%",
    height: 200,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  carName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1054CF", // Dark blue text
  },
  carPrice: {
    fontSize: 18,
    color: "#1054CF",
    fontWeight: "600",
  },
  unlikeButton: {
    padding: 8,
    backgroundColor: "rgba(255, 75, 75, 0.1)", // Translucent red
    borderRadius: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(16, 84, 207, 0.05)", // Very light translucent blue
    margin: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#1054CF",
  },
  emptyText: {
    fontSize: 18,
    color: "#1054CF",
    marginTop: 16,
    fontWeight: "600",
  },
})