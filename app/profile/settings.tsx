"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "../../config/firebase"
import { useAuth } from "../../hooks/useAuth"

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

const COLORS = {
  background: "#ededed",
  primary: "#1054CF",
  secondary: "#FFB700",
  white: "#ffffff",
  black: "#000000",
  gray: "#666666",
  lightGray: "#e0e0e0",
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={{ width: 24 }} />
      </View>

      {loadingPrefs ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
      <ScrollView style={styles.content}>
        {/* Settings Groups */}
        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Cài đặt ứng dụng</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications" size={24} color={COLORS.primary} />
              <Text style={styles.settingLabel}>Thông báo</Text>
            </View>
            <Switch
              value={preferences.notifications}
              onValueChange={(v) => updatePreference("notifications", v)}
              trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="location" size={24} color={COLORS.primary} />
              <Text style={styles.settingLabel}>Dịch vụ vị trí</Text>
            </View>
            <Switch
              value={preferences.location}
              onValueChange={(v) => updatePreference("location", v)}
              trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={24} color={COLORS.primary} />
              <Text style={styles.settingLabel}>Chế độ tối</Text>
            </View>
            <Switch
              value={preferences.darkMode}
              onValueChange={(v) => updatePreference("darkMode", v)}
              trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        <View style={styles.settingGroup}>
          <Text style={styles.groupTitle}>Ngôn ngữ & khu vực</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="language" size={24} color={COLORS.primary} />
              <Text style={styles.settingLabel}>Ngôn ngữ</Text>
            </View>
            <Text style={styles.settingValue}>{language}</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="cash" size={24} color={COLORS.primary} />
              <Text style={styles.settingLabel}>Tiền tệ</Text>
            </View>
            <Text style={styles.settingValue}>{currency}</Text>
          </View>
        </View>
      </ScrollView>
      )}
    </SafeAreaView>
  )
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.black,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  settingGroup: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.black,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.black,
  },
  settingValue: {
    fontSize: 15,
    color: COLORS.gray,
  },
})
