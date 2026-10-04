import { forwardRef, useState } from "react"
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, UI } from "../utils/theme"

type SearchBarProps = Omit<TextInputProps, "style"> & {
  onPress?: () => void
  onFilterPress?: () => void
  filterCount?: number
  containerStyle?: ViewStyle
}

const SearchBar = forwardRef<TextInput, SearchBarProps>(function SearchBar(
  {
    onPress,
    onFilterPress,
    filterCount = 0,
    containerStyle,
    value,
    onChangeText,
    placeholder = "Tìm xe...",
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const isEditable = !onPress

  const content = (
    <>
      <Ionicons name="search" size={20} color={focused ? THEME_COLORS.primary : THEME_COLORS.textMuted} />
      {isEditable ? (
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={THEME_COLORS.textMuted}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          returnKeyType="search"
          autoCorrect={false}
          {...props}
        />
      ) : (
        <Text style={styles.placeholder} numberOfLines={1}>{placeholder}</Text>
      )}
      {isEditable && typeof value === "string" && value.length > 0 ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Xoá từ khoá tìm kiếm"
          onPress={() => onChangeText?.("")}
          activeOpacity={PRESS_OPACITY}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={20} color={THEME_COLORS.textMuted} />
        </TouchableOpacity>
      ) : null}
    </>
  )

  return (
    <View style={[styles.container, containerStyle]}>
      {onPress ? (
        <TouchableOpacity style={styles.searchBox} onPress={onPress} activeOpacity={PRESS_OPACITY}>
          {content}
        </TouchableOpacity>
      ) : (
        <View style={[styles.searchBox, focused && styles.focused]}>{content}</View>
      )}

      {onFilterPress ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Mở bộ lọc"
          style={[styles.filterButton, filterCount > 0 && styles.filterButtonActive]}
          onPress={onFilterPress}
          activeOpacity={PRESS_OPACITY}
        >
          <Ionicons name="options-outline" size={21} color={THEME_COLORS.primary} />
          {filterCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}
    </View>
  )
})

export default SearchBar

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  searchBox: {
    flex: 1,
    height: UI.input.height,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
    paddingHorizontal: SPACE.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  focused: {
    ...UI.inputFocused,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: THEME_COLORS.textPrimary,
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    color: THEME_COLORS.textMuted,
  },
  filterButton: {
    width: UI.input.height,
    height: UI.input.height,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    borderColor: THEME_COLORS.primary,
    backgroundColor: THEME_COLORS.primarySoft,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME_COLORS.primary,
  },
  badgeText: {
    color: THEME_COLORS.textInverse,
    fontSize: 10,
    fontWeight: "800",
  },
})
