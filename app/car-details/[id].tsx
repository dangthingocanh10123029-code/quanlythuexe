"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useCar, getCarImage } from "../../hooks/useCars"
import { useLikedCarIds } from "../../hooks/useLikedCarIds"
import { useCarReviews } from "../../hooks/useReviews"
import { formatCurrency, formatDate, formatNumber } from "../../utils/helpers"
import { toDate } from "../../utils/booking"
import { showAlert } from "../../utils/dialog"
import { HOTLINE, CAR_STATUS_LABELS, HIDDEN_CAR_STATUSES } from "../../utils/constants"
import { getBrandAsset } from "../../data/assets"
import { StatusBar } from "expo-status-bar"
import { THEME_COLORS, RADIUS, SPACE, TYPOGRAPHY, UI, PRESS_OPACITY } from "../../utils/theme"
import { AppHeader, CompensationPolicy, EmptyState, PrimaryButton, StatCard } from "../../components"


// Địa chỉ chi nhánh RENTO theo thành phố của xe
const BRANCH_ADDRESSES: Record<string, string> = {
  "TP. Hồ Chí Minh": "120 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
  "Hà Nội": "35 Tràng Tiền, Hoàn Kiếm, Hà Nội",
  "Đà Nẵng": "88 Bạch Đằng, Hải Châu, Đà Nẵng",
};

// Đánh giá cũ lưu email làm tên: lấy phần trước @ và viết hoa chữ đầu
const formatUserName = (userName: string) => {
  if (!userName) return "Ẩn danh"
  if (!userName.includes("@")) return userName
  const name = userName.split("@")[0]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// Điểm sao: làm tròn 0,5 → sao đầy / nửa / rỗng
const renderStars = (value: number, size: number) =>
  [1, 2, 3, 4, 5].map((star) => {
    const v = Math.round(value * 2) / 2
    const name = v >= star ? "star" : v >= star - 0.5 ? "star-half" : "star-outline"
    return <Ionicons key={star} name={name} size={size} color={THEME_COLORS.accent} />
  })

const formatRating = (value: number) => (Number(value) || 0).toFixed(1).replace(".", ",")

export default function CarDetailsScreen() {
  // pickup/return (ISO) từ bộ lọc ngày ở Search, chuyển tiếp sang Checkout
  const { id, pickup, return: returnAt } = useLocalSearchParams<{ id: string; pickup?: string; return?: string }>()
  const { car, loading: carLoading } = useCar(id)
  const { likedIds, toggleLike } = useLikedCarIds()
  const [policyExpanded, setPolicyExpanded] = useState(false)

  // Đánh giá chỉ viết từ chi tiết đơn đã hoàn thành (submitReview, G5); ở đây chỉ xem
  const { reviews, loading: reviewLoading } = useCarReviews(id)

  if (!car) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <AppHeader title="Chi tiết xe" onBack={() => router.back()} />
        <View style={styles.center}>
          {carLoading ? (
            <ActivityIndicator size="large" color={THEME_COLORS.primary} />
          ) : (
            <EmptyState
              image="results"
              title="Không tìm thấy xe"
              description="Xe không tồn tại hoặc đã bị gỡ khỏi danh sách."
              actionLabel="Xem xe khác"
              onAction={() => router.replace("/(tabs)/search")}
            />
          )}
        </View>
      </SafeAreaView>
    )
  }

  // Xe bảo dưỡng / tạm ngừng thì không đặt được
  const bookingLocked = HIDDEN_CAR_STATUSES.includes(car.status)
  const lockedStatusLabel = CAR_STATUS_LABELS[car.status] || "Tạm ngừng"
  const liked = likedIds.includes(car.id)

  const specs: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }[] = [
    { icon: "people-outline", value: `${car.seats} chỗ`, label: "Số chỗ" },
    { icon: "git-compare-outline", value: car.transmission || "Chưa cập nhật", label: "Hộp số" },
    { icon: "water-outline", value: String(car.fuel), label: "Nhiên liệu" },
    { icon: "car-sport-outline", value: String(car.type), label: "Loại xe" },
    { icon: "calendar-outline", value: String(car.year), label: "Năm SX" },
    { icon: "location-outline", value: String(car.location), label: "Khu vực" },
  ]
  const missing = "Chưa cập nhật"
  const technicalSpecs = [
    { label: "Động cơ", value: car.engine?.trim() || missing },
    { label: "Công suất", value: car.power != null ? `${formatNumber(car.power)} mã lực` : missing },
    { label: "Mức tiêu hao", value: car.fuelConsumption?.trim() || missing },
    { label: "Túi khí", value: car.airbags != null ? `${formatNumber(car.airbags)} túi` : missing },
    { label: "Màu xe", value: car.color?.trim() || missing },
    { label: "Đã đi", value: car.odometer != null ? `${formatNumber(car.odometer)} km` : missing },
    { label: "Cốp", value: car.trunkCapacity != null ? `${formatNumber(car.trunkCapacity)} lít` : missing },
  ]

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <AppHeader
        title="Chi tiết xe"
        onBack={() => router.back()}
        right={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={liked ? "Bỏ khỏi xe yêu thích" : "Thêm vào xe yêu thích"}
            accessibilityState={{ selected: liked }}
            style={[styles.favoriteHeaderButton, liked && styles.favoriteHeaderButtonActive]}
            onPress={() => toggleLike(car.id).catch((e) => showAlert("Không thể lưu xe yêu thích", e.message))}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={liked ? THEME_COLORS.danger : THEME_COLORS.textPrimary} />
          </TouchableOpacity>
        }
      />
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
            <Image source={getCarImage(car)} style={styles.carImage} />
          </View>

          {bookingLocked ? (
            <View style={styles.lockedBanner}>
              <View style={styles.lockedIcon}>
                <Ionicons
                  name={car.status === "Maintenance" ? "construct-outline" : "pause-circle-outline"}
                  size={22}
                  color={THEME_COLORS.warning}
                />
              </View>
              <View style={styles.lockedCopy}>
                <Text style={styles.lockedTitle}>{lockedStatusLabel}</Text>
                <Text style={styles.lockedText}>
                  Xe hiện chưa nhận đặt mới. Bạn vui lòng chọn một xe khác.
                </Text>
              </View>
            </View>
          ) : null}
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

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Thông số kỹ thuật</Text>
          <View style={styles.technicalCard}>
            {technicalSpecs.map((spec, index) => (
              <View
                key={spec.label}
                style={[styles.technicalRow, index < technicalSpecs.length - 1 && styles.technicalRowDivider]}
              >
                <Text style={styles.technicalLabel}>{spec.label}</Text>
                <Text style={styles.technicalValue}>{spec.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Thông tin thuê xe</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="card-outline" size={20} color={THEME_COLORS.primary} />
              </View>
              <View style={styles.detailCopy}>
                <Text style={styles.detailLabel}>Biển số</Text>
                <Text style={styles.detailValue}>{car.licensePlate || "Chưa cập nhật"}</Text>
              </View>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color={THEME_COLORS.primary} />
              </View>
              <View style={styles.detailCopy}>
                <Text style={styles.detailLabel}>Tiền cọc (trả khi nhận xe)</Text>
                <Text style={styles.depositValue}>{formatCurrency(car.deposit || 0)}</Text>
              </View>
            </View>
            <View style={styles.detailDivider} />
            <View>
              <Text style={styles.detailLabel}>Mô tả</Text>
              <Text style={styles.description}>
                {car.description || "Chưa có mô tả chi tiết cho xe này."}
              </Text>
            </View>
            <View style={styles.detailDivider} />
            <View>
              <Text style={styles.detailLabel}>Tiện nghi</Text>
              {car.amenities?.length ? (
                <View style={styles.amenitiesRow}>
                  {car.amenities.map((amenity) => (
                    <View key={amenity} style={styles.amenityChip}>
                      <Ionicons name="checkmark-circle" size={16} color={THEME_COLORS.success} />
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.description}>Chưa có thông tin tiện nghi.</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.block}>
          <TouchableOpacity
            style={styles.policyHeader}
            onPress={() => setPolicyExpanded((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: policyExpanded }}
            activeOpacity={PRESS_OPACITY}
          >
            <View style={styles.policyTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={22} color={THEME_COLORS.primary} />
              <Text style={styles.policyTitle}>Chính sách đền bù</Text>
            </View>
            <Ionicons
              name={policyExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={THEME_COLORS.textMuted}
            />
          </TouchableOpacity>
          {policyExpanded ? (
            <View style={styles.policyBody}>
              <CompensationPolicy />
            </View>
          ) : (
            <Text style={styles.policySummary}>Xem mức đền bù và cách quyết toán tiền cọc khi trả xe.</Text>
          )}
        </View>

        {/* Rental Company */}
        <View style={styles.block}>
          <View style={styles.rentalInfo}>
            <View style={styles.rentalLogoContainer}>
              <Ionicons name="business-outline" size={22} color={THEME_COLORS.primary} />
            </View>
            <View style={styles.rentalDetails}>
              <Text style={styles.rentalName}>RENTO {car.location}</Text>
              <Text style={styles.rentalLocation}>{BRANCH_ADDRESSES[car.location] ?? car.location}</Text>
              <View style={styles.rentalMetaRow}>
                <Ionicons name="time-outline" size={14} color={THEME_COLORS.textMuted} />
                <Text style={styles.rentalMeta}>Thứ 2 – Chủ nhật: 08:00 – 20:30</Text>
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
          {car.reviewCount > 0 ? (
            <View style={styles.ratingSummary}>
              <Text style={styles.ratingValue}>{formatRating(car.rating)}</Text>
              <View style={styles.ratingSummaryCopy}>
                <View style={styles.summaryStars}>{renderStars(car.rating, 18)}</View>
                <Text style={styles.ratingCount}>{car.reviewCount} đánh giá từ khách đã thuê</Text>
              </View>
            </View>
          ) : null}
          {reviewLoading ? (
            <ActivityIndicator color={THEME_COLORS.primary} />
          ) : reviews.length === 0 ? (
            <EmptyState
              image="reviews"
              size={160}
              title="Chưa có đánh giá nào"
              description="Khách hoàn thành chuyến đi với xe này có thể đánh giá trong mục Chuyến đi."
            />
          ) : (
            reviews.map((review) => {
              const name = formatUserName(review.userName)
              const at = toDate(review.createdAt)
              return (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.reviewUserName} numberOfLines={1}>{name}</Text>
                      {review.userName?.includes("@") ? (
                        <Text style={styles.reviewEmail} numberOfLines={1}>{review.userName}</Text>
                      ) : null}
                    </View>
                    <View style={styles.ratingContainer}>{renderStars(review.rating, 14)}</View>
                  </View>
                  {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                  {at ? <Text style={styles.reviewDate}>{formatDate(at, "datetime")}</Text> : null}
                </View>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* Booking Section */}
      <SafeAreaView edges={["bottom"]} style={styles.bookingContainer}>
        <View style={styles.bookingInner}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceCaption}>Giá thuê</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price} numberOfLines={1}>{formatCurrency(car.pricePerDay)}</Text>
              <Text style={styles.priceLabel}>/ngày</Text>
            </View>
          </View>
          <PrimaryButton
            title={bookingLocked ? lockedStatusLabel : "Thuê ngay"}
            icon={bookingLocked ? undefined : "arrow-forward"}
            disabled={bookingLocked}
            onPress={() => router.push({
              pathname: "/checkout",
              params: pickup && returnAt ? { carId: id, pickup, return: returnAt } : { carId: id }
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACE.screen,
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
  favoriteHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteHeaderButtonActive: {
    borderColor: THEME_COLORS.danger,
    backgroundColor: THEME_COLORS.dangerSoft,
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
  lockedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE.md,
    marginTop: SPACE.lg,
    padding: SPACE.lg,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.warningSoft,
    borderWidth: 1,
    borderColor: THEME_COLORS.warning,
  },
  lockedIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedCopy: {
    flex: 1,
  },
  lockedTitle: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.warning,
  },
  lockedText: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.textSecondary,
    marginTop: 2,
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
  technicalCard: {
    ...UI.card,
    paddingHorizontal: SPACE.lg,
  },
  technicalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACE.lg,
    paddingVertical: SPACE.md,
  },
  technicalRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.border,
  },
  technicalLabel: {
    ...TYPOGRAPHY.body,
    color: THEME_COLORS.textSecondary,
    flex: 1,
  },
  technicalValue: {
    ...TYPOGRAPHY.bodyStrong,
    flex: 1,
    textAlign: "right",
  },
  detailsCard: {
    ...UI.card,
    padding: SPACE.lg,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCopy: {
    flex: 1,
  },
  detailLabel: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.textSecondary,
    fontWeight: "600",
  },
  detailValue: {
    ...TYPOGRAPHY.bodyStrong,
    marginTop: 2,
  },
  depositValue: {
    ...TYPOGRAPHY.price,
    marginTop: 2,
  },
  detailDivider: {
    height: 1,
    backgroundColor: THEME_COLORS.border,
    marginVertical: SPACE.lg,
  },
  description: {
    ...TYPOGRAPHY.body,
    marginTop: SPACE.sm,
  },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE.sm,
    marginTop: SPACE.md,
  },
  amenityChip: {
    ...UI.chip,
    minHeight: 36,
    flexDirection: "row",
    gap: SPACE.xs,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
  },
  amenityText: {
    ...UI.chipText,
    fontSize: 13,
  },
  policyHeader: {
    ...UI.card,
    minHeight: 64,
    paddingHorizontal: SPACE.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACE.md,
  },
  policyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    flex: 1,
  },
  policyTitle: {
    ...TYPOGRAPHY.h3,
    flexShrink: 1,
  },
  policyBody: {
    marginTop: SPACE.md,
  },
  policySummary: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACE.sm,
    paddingHorizontal: SPACE.sm,
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
  rentalName: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACE.xs,
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
    flexShrink: 1,
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
    gap: SPACE.md,
  },
  priceBlock: {
    flexShrink: 1,
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
    minWidth: 150,
  },

  // Review section styles
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
  reviewComment: {
    ...TYPOGRAPHY.body,
  },
  reviewDate: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginTop: SPACE.sm,
  },
  ratingSummary: {
    ...UI.card,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.lg,
    padding: SPACE.lg,
    marginBottom: SPACE.lg,
  },
  ratingValue: {
    ...TYPOGRAPHY.display,
  },
  ratingSummaryCopy: {
    flex: 1,
    gap: SPACE.xs,
  },
  summaryStars: {
    flexDirection: "row",
    gap: 2,
  },
  ratingCount: {
    ...TYPOGRAPHY.caption,
  },
})
