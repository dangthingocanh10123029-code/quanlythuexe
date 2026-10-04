"use client"

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { SUPPORT_EMAIL } from "../utils/constants"

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhóm phát triển</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                <TouchableOpacity style={styles.emailContainer}>
                  <Ionicons name="mail" size={16} color="#4169e1" />
                  <Text style={styles.developerEmail}>{developer.email}</Text>
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

          <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
            <Ionicons name="mail" size={20} color="#ffffff" />
            <Text style={styles.contactButtonText}>Liên hệ hỗ trợ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const COLORS = {
  primary: "#4169e1",
  background: "#ffffff",
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  introSection: {
    padding: 20,
    alignItems: "center",
  },
  introTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 12,
    textAlign: "center",
  },
  introText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
  },
  teamGrid: {
    padding: 20,
    gap: 16,
  },
  developerCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  developerInfo: {
    flex: 1,
  },
  developerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  developerRole: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  developerEmail: {
    color: COLORS.primary,
    fontSize: 14,
    marginLeft: 6,
  },
  aboutSection: {
    padding: 20,
    backgroundColor: "#f8f9fa",
    margin: 20,
    borderRadius: 16,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 24,
    marginBottom: 20,
  },
  techStack: {
    marginTop: 16,
  },
  techTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  techItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  techItem: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  techText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  contactSection: {
    padding: 20,
    alignItems: "center",
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 12,
  },
  contactText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
})

