import { Image, StyleSheet, Text, TouchableOpacity, type ImageSourcePropType, type ViewStyle } from "react-native"
import { PRESS_OPACITY, SPACE, UI } from "../utils/theme"

type BrandChipProps = {
  name: string
  logo: ImageSourcePropType
  selected?: boolean
  onPress: () => void
  style?: ViewStyle
}

export default function BrandChip({ name, logo, selected = false, onPress, style }: BrandChipProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && UI.chipActive, style]}
      onPress={onPress}
      activeOpacity={PRESS_OPACITY}
    >
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.label, selected && UI.chipTextActive]}>{name}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    ...UI.chip,
    flexDirection: "row",
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
  },
  logo: {
    width: 22,
    height: 22,
  },
  label: {
    ...UI.chipText,
  },
})

