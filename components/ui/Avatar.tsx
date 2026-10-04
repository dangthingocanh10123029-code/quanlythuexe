import { View, Image, Text, StyleSheet } from "react-native"

interface AvatarProps {
  source?: { uri: string }
  size?: number
  name?: string
  backgroundColor?: string
}

export default function Avatar({ source, size = 50, name, backgroundColor = "#4169e1" }: AvatarProps) {
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
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{name ? getInitials(name) : "?"}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  image: {
    resizeMode: "cover",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "#ffffff",
    fontWeight: "bold",
  },
})
