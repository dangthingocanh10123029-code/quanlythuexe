"use client"

import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native"
import { useState } from "react"
import { router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from '@expo/vector-icons'
import Swiper from 'react-native-swiper'
import { THEME_COLORS, RADIUS, SPACE, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"
import { PROMO_ASSETS } from "../data/assets"
import { PrimaryButton } from "../components"

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap
  text: string
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      <Ionicons name={icon} size={20} color={THEME_COLORS.primary} />
    </View>
    <Text style={styles.featureText}>{text}</Text>
  </View>
)

export default function WelcomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.brandRow}>
        <View style={styles.brandIcon}>
          <Ionicons name="car-sport" size={18} color={THEME_COLORS.primary} />
        </View>
        <Text style={styles.brandText}>RENTO</Text>
      </View>

      <Swiper
        loop={false}
        showsPagination={false}
        style={styles.wrapper}
        onIndexChanged={setCurrentIndex}
      >
        <View style={styles.slide}>
          <View style={styles.illustration}>
            <Image source={PROMO_ASSETS.onboardingCars} style={styles.illustrationImage} resizeMode="contain" />
          </View>
          <Text style={styles.overline}>RENTO</Text>
          <Text style={styles.title}>Chọn xe ưng ý, đi đâu cũng dễ</Text>
          <Text style={styles.description}>Hàng trăm mẫu xe từ sedan, SUV đến xe thể thao đang chờ bạn</Text>
          <View style={styles.featureContainer}>
            <FeatureItem icon="search" text="Tìm xe" />
            <FeatureItem icon="filter" text="Lọc theo nhu cầu" />
            <FeatureItem icon="location" text="Xe gần bạn" />
          </View>
        </View>

        <View style={styles.slide}>
          <View style={styles.illustration}>
            <View style={styles.iconIllustration}>
              <Ionicons name="calendar" size={72} color={THEME_COLORS.primary} />
            </View>
          </View>
          <Text style={styles.overline}>ĐẶT XE NHANH</Text>
          <Text style={styles.title}>Đặt xe chỉ trong vài phút</Text>
          <Text style={styles.description}>Thủ tục gọn nhẹ, thanh toán an toàn qua MoMo, ZaloPay hoặc thẻ ngân hàng</Text>
          <View style={styles.featureContainer}>
            <FeatureItem icon="time" text="Thủ tục nhanh" />
            <FeatureItem icon="card" text="Thanh toán an toàn" />
            <FeatureItem icon="shield-checkmark" text="Xe đã kiểm định" />
          </View>
        </View>

        <View style={styles.slide}>
          <View style={styles.illustration}>
            <Image source={PROMO_ASSETS.welcome360} style={styles.illustrationImage} resizeMode="contain" />
          </View>
          <Text style={styles.overline}>THUÊ XE NHÉ?</Text>
          <Text style={styles.title}>Sẵn sàng lên đường</Text>
          <Text style={styles.description}>Mỗi chuyến đi, một trải nghiệm đáng nhớ</Text>
          <PrimaryButton
            title="Bắt đầu ngay"
            icon="arrow-forward"
            onPress={() => router.replace('/login')}
            style={styles.button}
          />
        </View>
      </Swiper>

      <View style={styles.progressContainer}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              currentIndex === index && styles.activeProgressDot
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.md,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    ...TYPOGRAPHY.h3,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: THEME_COLORS.primary,
  },
  wrapper: {},
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.screen,
    paddingBottom: 96,
  },
  illustration: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.section,
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  iconIllustration: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overline: {
    ...TYPOGRAPHY.overline,
    color: THEME_COLORS.primary,
    marginBottom: SPACE.sm,
  },
  title: {
    ...TYPOGRAPHY.display,
    textAlign: 'center',
    marginBottom: SPACE.md,
  },
  description: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    paddingHorizontal: SPACE.sm,
  },
  button: {
    alignSelf: 'stretch',
    marginTop: SPACE.section,
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    gap: SPACE.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.border,
  },
  activeProgressDot: {
    width: 24,
    backgroundColor: THEME_COLORS.primary,
  },
  featureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACE.section,
    gap: SPACE.md,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    gap: SPACE.sm,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.textSecondary,
    textAlign: 'center',
  },
})
