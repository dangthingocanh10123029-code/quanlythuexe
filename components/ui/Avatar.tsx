import { View, Image, Text, StyleSheet } from "react-native"
import { THEME_COLORS } from "../../utils/theme"

interface AvatarProps {
  source?: { uri: string }
  size?: number
  name?: string
  backgroundColor?: string
}

export default function Avatar({ source, size = 50, name, backgroundColor = THEME_COLORS.primarySoft }: AvatarProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {source ? (
        <Image source={source} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View style={[styles.placeholder, { backgroundColor, width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{name ? getInitials(name) : "?"}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  image: {
    resizeMode: "cover",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: THEME_COLORS.primary,
    fontWeight: "700",
  },
})
