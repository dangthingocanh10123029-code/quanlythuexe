import { Image, Modal, StyleSheet, Text, TouchableOpacity, View, type ImageSourcePropType } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import PrimaryButton from "./PrimaryButton"
import { PRESS_OPACITY, RADIUS, SHADOWS, SPACE, THEME_COLORS, TYPOGRAPHY } from "../utils/theme"

type PromoModalProps = {
  visible: boolean
  onClose: () => void
  onAction: () => void
  image: ImageSourcePropType
  title: string
  description: string
  promoCode?: string
  countdown?: string
  actionLabel?: string
}

export default function PromoModal({
  visible,
  onClose,
  onAction,
  image,
  title,
  description,
  promoCode,
  countdown,
  actionLabel = "Xem xe ngay",
}: PromoModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Đóng khuyến mãi"
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
          </TouchableOpacity>

          {countdown ? (
            <View style={styles.timer}>
              <Ionicons name="time-outline" size={17} color={THEME_COLORS.primary} />
              <Text style={styles.timerText}>{countdown}</Text>
            </View>
          ) : null}

          <View style={styles.imageWrap}>
            <Image source={image} style={styles.image} resizeMode="contain" />
          </View>
          <View style={styles.copy}>
            <Text style={styles.overline}>DÀNH RIÊNG CHO BẠN</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>
              {description}
              {promoCode ? <Text style={styles.code}> {promoCode}</Text> : null}
            </Text>
          </View>
          <PrimaryButton title={actionLabel} icon="arrow-forward" onPress={onAction} style={styles.action} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACE.screen,
    backgroundColor: THEME_COLORS.overlay,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    padding: SPACE["2xl"],
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
    alignItems: "center",
    ...SHADOWS.raised,
  },
  closeButton: {
    position: "absolute",
    top: SPACE.lg,
    right: SPACE.lg,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  timer: {
    minHeight: 32,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME_COLORS.primarySoft,
  },
  timerText: {
    color: THEME_COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  imageWrap: {
    width: "100%",
    height: 174,
    borderRadius: RADIUS.card,
    overflow: "hidden",
    backgroundColor: THEME_COLORS.primarySubtle,
    marginTop: SPACE.lg,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  copy: {
    alignItems: "center",
    marginTop: SPACE.xl,
  },
  overline: {
    ...TYPOGRAPHY.overline,
    color: THEME_COLORS.primary,
    marginBottom: SPACE.xs,
  },
  title: {
    ...TYPOGRAPHY.h1,
    textAlign: "center",
  },
  description: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginTop: SPACE.sm,
  },
  code: {
    color: THEME_COLORS.primary,
    fontWeight: "800",
  },
  action: {
    alignSelf: "stretch",
    marginTop: SPACE["2xl"],
  },
})

