import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { THEME_COLORS, RADIUS, SHADOWS, SPACE, layout } from "../../utils/theme"

// Thanh tab nổi: nền trắng, viền mảnh, bo RADIUS.sheet, căn đều hai bên.
// Chiều cao 72 + cách đáy 20 → nội dung các màn tab cần paddingBottom >= ~110.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 2,
          fontWeight: "600",
        },
        tabBarStyle: {
          position: "absolute",
          bottom: SPACE.lg,
          left: SPACE.screen,
          right: SPACE.screen,
          backgroundColor: THEME_COLORS.surface,
          borderRadius: RADIUS.sheet,
          height: layout.tabBarHeight,
          borderWidth: 1,
          borderTopWidth: 1,
          borderColor: THEME_COLORS.border,
          borderTopColor: THEME_COLORS.border,
          paddingHorizontal: SPACE.sm,
          paddingTop: SPACE.sm,
          paddingBottom: SPACE.sm,
          ...SHADOWS.tabBar,
        },
        tabBarActiveTintColor: THEME_COLORS.primary,
        tabBarInactiveTintColor: THEME_COLORS.textMuted,
        tabBarActiveBackgroundColor: THEME_COLORS.primarySubtle,
        tabBarItemStyle: {
          paddingTop: 0,
          borderRadius: RADIUS.control,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Xe",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "car" : "car-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Chuyến đi",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
