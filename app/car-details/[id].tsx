"use client"

import { useState, useEffect } from "react"
import { type TextStyle, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, TextInput, ActivityIndicator, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { cars } from "../../data/cars"
import { db } from "../../config/firebase"
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from "firebase/firestore"
import { useAuth } from "../../hooks/useAuth"
import { formatCurrency, formatDate } from "../../utils/helpers"
import { HOTLINE } from "../../utils/constants"
import { getBrandAsset } from "../../data/assets"
import { StatusBar } from "expo-status-bar"
import { THEME_COLORS, RADIUS, SPACE, TYPOGRAPHY, UI, PRESS_OPACITY } from "../../utils/theme"
import { AppHeader, PrimaryButton, StatCard } from "../../components"

type User = {
  id: string;
  email: string;
}

type Review = {
  id: string;
  carId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any; // Using 'any' for Firestore Timestamp
}

const { width } = Dimensions.get("window")

// Địa chỉ chi nhánh RENTO theo thành phố của xe
const BRANCH_ADDRESSES: Record<string, string> = {
  "TP. Hồ Chí Minh": "120 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
  "Hà Nội": "35 Tràng Tiền, Hoàn Kiếm, Hà Nội",
  "Đà Nẵng": "88 Bạch Đằng, Hải Châu, Đà Nẵng",
};

// Add this function before the CarDetailsScreen component
const formatUserName = (email: string) => {
  if (!email) return 'Ẩn danh';
  // Extract the part before @ and capitalize first letter
  const name = email.split('@')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
};

export default function CarDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const car = cars.find(car => car.id === id)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Review state
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewLoading, setReviewLoading] = useState(true)
  const [reviewText, setReviewText] = useState("")
  const [reviewRating, setReviewRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  // Fetch reviews for this car
  useEffect(() => {
    if (!id) return
    
    setReviewLoading(true)
    const reviewsRef = collection(db, "reviews")
    // where + orderBy cần composite index → lọc trên server, sắp xếp phía client
    const q = query(reviewsRef, where("carId", "==", id))

    const unsub = onSnapshot(q, (snapshot) => {
      const reviewsData: Review[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Review))
      const ms = (v: any) => (v?.toDate ? v.toDate().getTime() : v ? new Date(v).getTime() || 0 : 0)
      reviewsData.sort((x: any, y: any) => ms(y.createdAt) - ms(x.createdAt))
      setReviews(reviewsData)
      setReviewLoading(false)
    }, (error) => {
      console.error("Error fetching reviews: ", error)
      setReviewLoading(false)
    })

    return () => unsub()
  }, [id])

  // Submit review
  const handleSubmitReview = async () => {
    if (!user || !user.email) {
      Alert.alert("Bạn chưa đăng nhập", "Vui lòng đăng nhập bằng email để viết đánh giá.")
      return
    }
    if (!reviewText.trim()) {
      Alert.alert("Chưa có nội dung", "Vui lòng nhập nội dung đánh giá.")
      return
    }
    setSubmitting(true)
    try {
      console.log("Submitting review for car:", id)
      const docRef = await addDoc(collection(db, "reviews"), {
        carId: id,
        userId: user.id,
        userName: user.email, // Always use email, never "Anonymous"
        rating: reviewRating,
        comment: reviewText,
        createdAt: serverTimestamp(),
      })
      console.log("Review added with ID:", docRef.id)
      
      setReviewText("")
      setReviewRating(5)
    } catch (e) {
      console.error("Error adding review:", e)
      Alert.alert("Lỗi", "Không gửi được đánh giá. Vui lòng thử lại.")
    }
    setSubmitting(false)
  }

  if (!car) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.emptyText}>Không tìm thấy xe</Text>
      </View>
    )
  }

  const specs: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }[] = [
    { icon: "people-outline", value: `${car.seats} chỗ`, label: "Số chỗ" },
    { icon: "water-outline", value: String(car.fuel), label: "Nhiên liệu" },
    { icon: "car-sport-outline", value: String(car.type), label: "Loại xe" },
    { icon: "calendar-outline", value: String(car.year), label: "Năm SX" },
    { icon: "location-outline", value: String(car.location), label: "Khu vực" },
    { icon: "star-outline", value: String(car.rating), label: "Đánh giá" },
  ]

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <AppHeader title="Chi tiết xe" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Car Name and Brand Logo Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroHeader}>
            <View style={styles.heroTitle}>
              <Text style={styles.overline}>{car.brand}</Text>
              <Text style={styles.carName}>{car.name}</Text>
            </View>
            <View style={styles.brandLogoContainer}>
              {getBrandAsset(car.brand) ? (
                <Image
                  source={getBrandAsset(car.brand)!}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons name="car" size={28} color={THEME_COLORS.textSecondary} />
              )}
            </View>
          </View>

          <View style={styles.imageWrapper}>
            <Image source={car.image} style={styles.carImage} />

            {/* Image Indicators */}
            <View style={styles.imageIndicators}>
              {[...Array(4)].map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    currentImageIndex === index ? styles.activeIndicator : styles.inactiveIndicator
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Specs Grid */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Thông số</Text>
          <View style={styles.specsGrid}>
            {specs.map((spec) => (
              <StatCard
                key={spec.label}
                icon={spec.icon}
                value={spec.value}
                label={spec.label}
                style={styles.specItem}
              />
            ))}
          </View>
        </View>

        {/* Rental Company */}
        <View style={styles.block}>
          <View style={styles.rentalInfo}>
            <View style={styles.rentalLogoContainer}>
              <Ionicons name="business-outline" size={22} color={THEME_COLORS.primary} />
            </View>
            <View style={styles.rentalDetails}>
              <View style={styles.rentalNameRow}>
                <Text style={styles.rentalName}>RENTO {car.location}</Text>
                <View style={styles.ratingStars}>
                  {[...Array(5)].map((_, index) => (
                    <Ionicons key={index} name="star" size={12} color={THEME_COLORS.accent} />
                  ))}
                </View>
              </View>
              <Text style={styles.rentalLocation}>{BRANCH_ADDRESSES[car.location] ?? car.location}</Text>
              <View style={styles.rentalMetaRow}>
                <Ionicons name="time-outline" size={14} color={THEME_COLORS.textMuted} />
                <Text style={styles.rentalMeta}>Thứ 2 - Chủ nhật: 08:00 - 20:30</Text>
              </View>
              <View style={styles.rentalMetaRow}>
                <Ionicons name="call-outline" size={14} color={THEME_COLORS.textMuted} />
                <Text style={styles.rentalMeta}>Hotline: {HOTLINE}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- Reviews Section --- */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Đánh giá</Text>
          {reviewLoading ? (
            <ActivityIndicator color={THEME_COLORS.primary} />
          ) : reviews.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có đánh giá nào. Hãy là người đầu tiên!</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>
                      {formatUserName(review.userName).charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.reviewUserName}>
                      {formatUserName(review.userName)}
                    </Text>
                    <Text style={styles.reviewEmail} numberOfLines={1}>{review.userName}</Text>
                  </View>
                  <View style={styles.ratingContainer}>
                    {[...Array(review.rating)].map((_, index) => (
                      <Ionicons
                        key={index}
                        name="star"
                        size={14}
                        color={THEME_COLORS.accent}
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>
                  {review.createdAt?.toDate
                    ? formatDate(review.createdAt.toDate(), "datetime")
                    : ""}
                </Text>
              </View>
            ))
            )}

          {/* --- Leave a Review Form --- */}
          {user && (
            <View style={styles.reviewForm}>
              <Text style={styles.reviewFormTitle}>Viết đánh giá</Text>
              <View style={styles.ratingInputContainer}>
                <Text style={styles.ratingLabel}>Chấm điểm</Text>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)} activeOpacity={PRESS_OPACITY} style={styles.starButton}>
                      <Ionicons
                        name={reviewRating >= star ? "star" : "star-outline"}
                        size={26}
                        color={reviewRating >= star ? THEME_COLORS.accent : THEME_COLORS.borderStrong}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TextInput
                style={[styles.reviewInput, focusedField === "review" && styles.inputFocused]}
                placeholder="Chia sẻ trải nghiệm của bạn..."
                placeholderTextColor={THEME_COLORS.textMuted}
                value={reviewText}
                onChangeText={setReviewText}
                onFocus={() => setFocusedField("review")}
                onBlur={() => setFocusedField(null)}
                multiline
              />
              <TouchableOpacity
                style={[styles.submitButton, submitting && { opacity: 0.6 }]}
                onPress={handleSubmitReview}
                disabled={submitting}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? "Đang gửi..." : "Gửi đánh giá"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Booking Section */}
      <SafeAreaView edges={["bottom"]} style={styles.bookingContainer}>
        <View style={styles.bookingInner}>
          <View>
            <Text style={styles.priceCaption}>Giá thuê</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{formatCurrency(car.pricePerDay)}</Text>
              <Text style={styles.priceLabel}>/ngày</Text>
            </View>
          </View>
          <PrimaryButton
            title="Thuê ngay"
            icon="arrow-forward"
            onPress={() => router.push({
              pathname: "/checkout",
              params: { carId: id }
            })}
            style={styles.bookNowButton}
          />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  scrollContent: {
    paddingBottom: SPACE.section,
  },
  heroSection: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.xl,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.lg,
  },
  heroTitle: {
    flex: 1,
    marginRight: SPACE.md,
  },
  overline: {
    ...TYPOGRAPHY.overline,
    marginBottom: SPACE.xs,
  },
  carName: {
    ...TYPOGRAPHY.h1,
  },
  brandLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 32,
    height: 32,
  },
  imageWrapper: {
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    paddingVertical: SPACE["2xl"],
    paddingHorizontal: SPACE.lg,
  },
  carImage: {
    width: '100%',
    height: 220,
    resizeMode: 'contain',
  },
  imageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACE.lg,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.pill,
    marginHorizontal: 3,
  },
  activeIndicator: {
    backgroundColor: THEME_COLORS.primary,
    width: 18,
  },
  inactiveIndicator: {
    backgroundColor: THEME_COLORS.borderStrong,
  },
  block: {
    paddingHorizontal: SPACE.screen,
    marginTop: SPACE.section,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.lg,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACE.md,
  },
  specItem: {
    width: '31.5%',
    minHeight: 134,
  },
  rentalInfo: {
    ...UI.card,
    padding: SPACE.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rentalLogoContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rentalDetails: {
    flex: 1,
    marginLeft: SPACE.md,
  },
  rentalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.xs,
  },
  rentalName: {
    ...TYPOGRAPHY.h3,
    flex: 1,
  },
  rentalLocation: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACE.sm,
  },
  rentalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACE.xs,
  },
  rentalMeta: {
    ...TYPOGRAPHY.caption,
    marginLeft: 6,
  },
  bookingContainer: {
    backgroundColor: THEME_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
  },
  bookingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.screen,
    paddingVertical: SPACE.md,
  },
  priceCaption: {
    ...TYPOGRAPHY.caption,
    marginBottom: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    ...TYPOGRAPHY.price,
    fontSize: 20,
  },
  priceLabel: {
    ...TYPOGRAPHY.caption,
    marginLeft: SPACE.xs,
  },
  bookNowButton: {
    minWidth: 158,
  },

  // Review section styles
  emptyText: {
    ...TYPOGRAPHY.body,
    color: THEME_COLORS.textMuted,
  },
  reviewCard: {
    ...UI.card,
    padding: SPACE.lg,
    marginBottom: SPACE.md,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACE.md,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACE.md,
  },
  reviewAvatarText: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.textSecondary,
  },
  userInfo: {
    flex: 1,
  },
  reviewUserName: {
    ...TYPOGRAPHY.bodyStrong,
  },
  reviewEmail: {
    ...TYPOGRAPHY.caption,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: SPACE.sm,
  },
  ratingStars: {
    flexDirection: "row",
    marginLeft: SPACE.sm,
  },
  starButton: {
    paddingHorizontal: 2,
  },
  reviewComment: {
    ...TYPOGRAPHY.body,
  },
  reviewDate: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginTop: SPACE.sm,
  },

  // Review form styles
  reviewForm: {
    ...UI.card,
    marginTop: SPACE.lg,
    padding: SPACE.lg,
  },
  reviewFormTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACE.md,
  },
  ratingInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACE.lg,
  },
  ratingLabel: {
    ...TYPOGRAPHY.body,
  },
  inputFocused: UI.inputFocused as TextStyle,
  reviewInput: {
    ...UI.input,
    height: 112,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.md,
    textAlignVertical: "top",
    marginBottom: SPACE.lg,
  },
  submitButton: {
    ...UI.secondaryButton,
    height: 48,
  },
  submitButtonText: {
    ...UI.secondaryButtonText,
    color: THEME_COLORS.primary,
  },
})
