import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 3,
          fontWeight: '500',
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 65,
          right: 60,
          backgroundColor: '#FFB700',
          borderRadius: 45,
          height: 80,
          borderWidth: 1.5,
          borderColor: '#1054CF',
          paddingHorizontal: 19,
          paddingTop: 10,
          paddingBottom: 10,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 3,
        },
        tabBarActiveTintColor: '#1054CF', // Màu xanh khi tab đang chọn
        tabBarInactiveTintColor: 'rgba(0, 0, 0, 0.7)', // Dark with opacity for both icon and text
        tabBarItemStyle: {
          marginHorizontal: -15,
          paddingTop: 0,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={29} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Xe",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "car" : "car-outline"} 
              size={34} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Chuyến đi",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "calendar" : "calendar-outline"} 
              size={29} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={29} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  )
}