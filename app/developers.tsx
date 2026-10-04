"use client"

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { SUPPORT_EMAIL } from "../utils/constants"
import { StatusBar } from "expo-status-bar"
import { THEME_COLORS, RADIUS, SPACE, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"

const handleContactSupport = async () => {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Liên hệ hỗ trợ RENTO")}`
  try {
    // Gọi openURL trực tiếp (canOpenURL có thể trả false nếu chưa khai báo scheme trên Android 11+/iOS)
    await Linking.openURL(url)
    return
  } catch (error) {
    console.error("Error opening mail app:", error)
  }
  Alert.alert(
    "Không mở được ứng dụng email",
    `Bạn có thể gửi email tới ${SUPPORT_EMAIL} hoặc gửi yêu cầu ngay trong ứng dụng.`,
    [
      { text: "Đóng", style: "cancel" },
      { text: "Mở trang Hỗ trợ", onPress: () => router.push("/profile/support") },
    ],
  )
}

// Use require to import local images from assets/developers
const developers = [
  {
    id: 1,
    name: "Catherine Arnado",
    role: "Trưởng nhóm · Lập trình viên Full Stack",
    email: "catherine.arnado@hcdc.edu.ph",
    avatar: require("../assets/developers/kat.png"),
  },
  {
    id: 2,
    name: "Xander Jyle Palma",
    role: "Phụ trách Backend",
    email: "xanderjyle.palma@hcdc.edu.ph",
    avatar: require("../assets/developers/xander.png"),
  },
  {
    id: 3,
    name: "Kiesha Jimenez",
    role: "Thiết kế Wireframe",
    email: "kiesha.jimenez@hcdc.edu.ph",
    avatar: require("../assets/developers/kiesha.png"),
  },
  {
    id: 4,
    name: "Luis Mario Palicte",
    role: "Thiết kế giao diện (Figma)",
    email: "luis.mario.palicte@hcdc.edu.ph",
    avatar: require("../assets/developers/luis.png"),
  },
]

export default function DevelopersScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="arrow-back" size={22} color={THEME_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhóm phát triển</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Đội ngũ phát triển RENTO</Text>
          <Text style={styles.introText}>
            Gặp gỡ những thành viên đứng sau ứng dụng thuê xe RENTO. Chúng tôi luôn nỗ lực để mang đến cho bạn trải
            nghiệm thuê xe thuận tiện và đáng tin cậy nhất.
          </Text>
        </View>

        <View style={styles.teamGrid}>
          {developers.map((developer) => (
            <View key={developer.id} style={styles.developerCard}>
              <Image source={developer.avatar} style={styles.avatar} />
              <View style={styles.developerInfo}>
                <Text style={styles.developerName}>{developer.name}</Text>
                <Text style={styles.developerRole}>{developer.role}</Text>
                <TouchableOpacity style={styles.emailContainer} activeOpacity={PRESS_OPACITY}>
                  <Ionicons name="mail-outline" size={14} color={THEME_COLORS.primary} />
                  <Text style={styles.developerEmail} numberOfLines={1}>{developer.email}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>Về RENTO</Text>
          <Text style={styles.aboutText}>
            RENTO là ứng dụng thuê xe hiện đại được xây dựng bằng React Native và Firebase. Sứ mệnh của chúng tôi là giúp
            việc thuê xe trở nên đơn giản, tiện lợi và dễ tiếp cận với mọi người.
          </Text>

          <View style={styles.techStack}>
            <Text style={styles.techTitle}>Công nghệ sử dụng:</Text>
            <View style={styles.techItems}>
              <View style={styles.techItem}>
                <Text style={styles.techText}>React Native</Text>
              </View>
              <View style={styles.techItem}>
                <Text style={styles.techText}>TypeScript</Text>
              </View>
              <View style={styles.techItem}>
                <Text style={styles.techText}>Firebase</Text>
              </View>
              <View style={styles.techItem}>
                <Text style={styles.techText}>Expo</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Liên hệ với chúng tôi</Text>
          <Text style={styles.contactText}>Bạn có câu hỏi hay góp ý? Chúng tôi luôn sẵn sàng lắng nghe!</Text>

          <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport} activeOpacity={PRESS_OPACITY}>
            <Ionicons name="mail" size={20} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>Liên hệ hỗ trợ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACE.screen,
    paddingBottom: SPACE.section,
  },
  introSection: {
    paddingTop: SPACE.lg,
    marginBottom: SPACE.section,
  },
  introTitle: {
    ...TYPOGRAPHY.h1,
    marginBottom: SPACE.sm,
  },
  introText: {
    ...TYPOGRAPHY.body,
  },
  teamGrid: {
    gap: SPACE.md,
    marginBottom: SPACE.section,
  },
  developerCard: {
    ...UI.card,
    flexDirection: "row",
    padding: SPACE.lg,
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    marginRight: SPACE.lg,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  developerInfo: {
    flex: 1,
  },
  developerName: {
    ...TYPOGRAPHY.h3,
    marginBottom: 2,
  },
  developerRole: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.textSecondary,
    marginBottom: SPACE.sm,
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
  },
  developerEmail: {
    flex: 1,
    color: THEME_COLORS.primary,
    fontSize: 13,
    fontWeight: "500",
  },
  aboutSection: {
    ...UI.card,
    padding: SPACE.xl,
    marginBottom: SPACE.section,
  },
  aboutTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.sm,
  },
  aboutText: {
    ...TYPOGRAPHY.body,
  },
  techStack: {
    marginTop: SPACE.xl,
  },
  techTitle: {
    ...TYPOGRAPHY.overline,
    marginBottom: SPACE.md,
  },
  techItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE.sm,
  },
  techItem: {
    backgroundColor: THEME_COLORS.primarySoft,
    paddingHorizontal: SPACE.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  techText: {
    color: THEME_COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  contactSection: {
    alignItems: "center",
  },
  contactTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACE.sm,
    textAlign: "center",
  },
  contactText: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginBottom: SPACE.xl,
  },
  contactButton: {
    ...UI.primaryButton,
    flexDirection: "row",
    alignSelf: "stretch",
    gap: SPACE.sm,
  },
  contactButtonText: {
    ...UI.primaryButtonText,
  },
})
