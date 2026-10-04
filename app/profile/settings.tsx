"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "../../config/firebase"
import { useAuth } from "../../hooks/useAuth"
import { PRESS_OPACITY, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../../utils/theme"

// Lưu tại users/{uid}.preferences
type Preferences = {
  notifications: boolean
  location: boolean
  darkMode: boolean
}

const DEFAULT_PREFERENCES: Preferences = {
  notifications: true,
  location: true,
  darkMode: false,
}

export default function SettingsScreen() {
  const { user, loading: authLoading } = useAuth()
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [loadingPrefs, setLoadingPrefs] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) {
      setLoadingPrefs(false)
      return
    }
    let cancelled = false
    const loadPreferences = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.id))
        const saved = snap.exists() ? snap.data()?.preferences : null
        if (!cancelled && saved && typeof saved === "object") {
          setPreferences({ ...DEFAULT_PREFERENCES, ...saved })
        }
      } catch (error) {
        console.error("Error loading preferences:", error)
      } finally {
        if (!cancelled) setLoadingPrefs(false)
      }
    }
    loadPreferences()
    return () => {
      cancelled = true
    }
  }, [user?.id, authLoading])

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    const previous = preferences
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    if (!user?.id) {
      setPreferences(previous)
      Alert.alert("Bạn chưa đăng nhập", "Vui lòng đăng nhập để lưu cài đặt.")
      return
    }
    try {
      await setDoc(doc(db, "users", user.id), { preferences: next }, { merge: true })
    } catch (error) {
      console.error("Error saving preferences:", error)
      setPreferences(previous)
      Alert.alert("Lỗi", "Không lưu được cài đặt. Vui lòng thử lại.")
    }
  }
  const language = "Tiếng Việt"
  const currency = "VND (đ)"

  const renderIcon = (name: string) => (
    <View style={styles.iconCircle}>
      <Ionicons name={name as any} size={20} color={THEME_COLORS.textSecondary} />
    </View>
  )

  const switchProps = {
    trackColor: { false: THEME_COLORS.borderStrong, true: THEME_COLORS.primary },
    thumbColor: "#FFFFFF",
    ios_backgroundColor: THEME_COLORS.borderStrong,
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="arrow-back" size={22} color={THEME_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={{ width: 40 }} />
      </View>

      {loadingPrefs ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME_COLORS.primary} />
        </View>
      ) : (
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Settings Groups */}
        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Cài đặt ứng dụng</Text>

          <View style={styles.groupCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                {renderIcon("notifications-outline")}
                <Text style={styles.settingLabel}>Thông báo</Text>
              </View>
              <Switch
                value={preferences.notifications}
                onValueChange={(v) => updatePreference("notifications", v)}
                {...switchProps}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                {renderIcon("location-outline")}
                <Text style={styles.settingLabel}>Dịch vụ vị trí</Text>
              </View>
              <Switch
                value={preferences.location}
                onValueChange={(v) => updatePreference("location", v)}
                {...switchProps}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                {renderIcon("moon-outline")}
                <Text style={styles.settingLabel}>Chế độ tối</Text>
              </View>
              <Switch
                value={preferences.darkMode}
                onValueChange={(v) => updatePreference("darkMode", v)}
                {...switchProps}
              />
            </View>
          </View>
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Ngôn ngữ & khu vực</Text>

          <View style={styles.groupCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                {renderIcon("language-outline")}
                <Text style={styles.settingLabel}>Ngôn ngữ</Text>
              </View>
              <Text style={styles.settingValue}>{language}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                {renderIcon("cash-outline")}
                <Text style={styles.settingLabel}>Tiền tệ</Text>
              </View>
              <Text style={styles.settingValue}>{currency}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACE["4xl"],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  settingGroup: {
    marginTop: SPACE.section - SPACE.sm,
    paddingHorizontal: SPACE.screen,
  },
  groupTitle: {
    ...TYPOGRAPHY.overline,
    marginBottom: SPACE.md,
    marginLeft: SPACE.xs,
  },
  groupCard: {
    ...UI.card,
    paddingVertical: SPACE.xs,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.lg,
    minHeight: 64,
  },
  divider: {
    ...UI.divider,
    marginLeft: SPACE.lg + 40 + SPACE.md,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    flexShrink: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    ...TYPOGRAPHY.bodyStrong,
  },
  settingValue: {
    ...TYPOGRAPHY.body,
    color: THEME_COLORS.textMuted,
  },
})
