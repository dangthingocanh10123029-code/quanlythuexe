import type { ReactNode } from "react"
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import PrimaryButton from "./PrimaryButton"
import { PRESS_OPACITY, RADIUS, SHADOWS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../utils/theme"

type FilterBottomSheetProps = {
  visible: boolean
  onClose: () => void
  onReset: () => void
  onApply: () => void
  activeCount?: number
  children: ReactNode
  title?: string
}

export default function FilterBottomSheet({
  visible,
  onClose,
  onReset,
  onApply,
  activeCount = 0,
  children,
  title = "Bộ lọc",
}: FilterBottomSheetProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>Tuỳ chỉnh để tìm chiếc xe phù hợp nhất</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Đóng bộ lọc"
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={PRESS_OPACITY}
            >
              <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={onReset} activeOpacity={PRESS_OPACITY}>
              <Text style={styles.resetText}>Đặt lại</Text>
            </TouchableOpacity>
            <PrimaryButton
              title={`Áp dụng${activeCount > 0 ? ` (${activeCount})` : ""}`}
              onPress={onApply}
              style={styles.applyButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: THEME_COLORS.overlay,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: "88%",
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.sm,
    paddingBottom: SPACE["2xl"],
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    backgroundColor: THEME_COLORS.surface,
    ...SHADOWS.raised,
  },
  handle: {
    width: 44,
    height: 5,
    alignSelf: "center",
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.borderStrong,
    marginBottom: SPACE.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACE.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  content: {
    paddingBottom: SPACE["2xl"],
  },
  footer: {
    flexDirection: "row",
    gap: SPACE.md,
    paddingTop: SPACE.lg,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
  },
  resetButton: {
    ...UI.secondaryButton,
    flex: 1,
  },
  resetText: {
    ...UI.secondaryButtonText,
  },
  applyButton: {
    flex: 2,
  },
})

