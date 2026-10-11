import { useState } from "react"
import { Platform, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native"
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker"
import { Ionicons } from "@expo/vector-icons"
import { formatDate } from "../utils/helpers"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../utils/theme"

export type DateTimeRangePickerProps = {
  pickupAt: Date
  returnAt: Date
  onPickupChange: (date: Date) => void
  onReturnChange: (date: Date) => void
}

type ActiveField = "pickup" | "return"

const DAY = 86_400_000
const HOUR = 3_600_000
const INPUT_BOX = UI.input as ViewStyle

export default function DateTimeRangePicker({
  pickupAt,
  returnAt,
  onPickupChange,
  onReturnChange,
}: DateTimeRangePickerProps) {
  const [activeField, setActiveField] = useState<ActiveField | null>(null)
  const [androidMode, setAndroidMode] = useState<"date" | "time">("date")
  const [draft, setDraft] = useState(pickupAt)

  const openPicker = (field: ActiveField) => {
    setActiveField(field)
    setDraft(field === "pickup" ? pickupAt : returnAt)
    setAndroidMode("date")
  }

  const applyDate = (field: ActiveField, value: Date) => {
    if (field === "pickup") {
      onPickupChange(value)
      if (value >= returnAt) onReturnChange(new Date(value.getTime() + DAY))
      return
    }
    onReturnChange(value <= pickupAt ? new Date(pickupAt.getTime() + HOUR) : value)
  }

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (!activeField) return
    if (event.type === "dismissed" || !selected) {
      setActiveField(null)
      return
    }

    if (Platform.OS === "android" && androidMode === "date") {
      const next = new Date(draft)
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate())
      setDraft(next)
      setAndroidMode("time")
      return
    }

    const next = Platform.OS === "android"
      ? new Date(draft.getFullYear(), draft.getMonth(), draft.getDate(), selected.getHours(), selected.getMinutes())
      : selected
    setDraft(next)
    applyDate(activeField, next)
    if (Platform.OS === "android") setActiveField(null)
  }

  const renderField = (field: ActiveField, label: string, icon: keyof typeof Ionicons.glyphMap, value: Date) => {
    const active = activeField === field
    return (
      <TouchableOpacity
        style={[styles.field, active && styles.fieldActive]}
        onPress={() => openPicker(field)}
        activeOpacity={PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDate(value, "datetime")}`}
      >
        <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
          <Ionicons name={icon} size={18} color={active ? THEME_COLORS.primary : THEME_COLORS.textSecondary} />
        </View>
        <View style={styles.fieldText}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{formatDate(value, "datetime")}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={THEME_COLORS.textMuted} />
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {renderField("pickup", "Nhận xe", "log-in-outline", pickupAt)}
      <View style={styles.connector}>
        <View style={styles.connectorLine} />
        <Ionicons name="arrow-down" size={14} color={THEME_COLORS.textMuted} />
        <View style={styles.connectorLine} />
      </View>
      {renderField("return", "Trả xe", "log-out-outline", returnAt)}

      {activeField ? (
        <View style={styles.pickerPanel}>
          <DateTimePicker
            key={`${activeField}-${androidMode}`}
            value={draft}
            mode={Platform.OS === "ios" ? "datetime" : androidMode}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={activeField === "pickup" ? new Date() : pickupAt}
            locale="vi-VN"
            onChange={handleChange}
          />
          {Platform.OS === "ios" ? (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setActiveField(null)}
              activeOpacity={PRESS_OPACITY}
            >
              <Text style={styles.doneText}>Xong</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {},
  field: {
    ...INPUT_BOX,
    height: "auto",
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACE.sm,
  },
  fieldActive: {
    ...UI.inputFocused,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME_COLORS.surfaceMuted,
    marginRight: SPACE.md,
  },
  iconWrapActive: {
    backgroundColor: THEME_COLORS.primarySoft,
  },
  fieldText: {
    flex: 1,
  },
  label: {
    ...TYPOGRAPHY.caption,
  },
  value: {
    ...TYPOGRAPHY.bodyStrong,
    marginTop: 1,
  },
  connector: {
    height: 24,
    width: 36,
    marginLeft: SPACE.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  connectorLine: {
    width: 1,
    flex: 1,
    backgroundColor: THEME_COLORS.borderStrong,
  },
  pickerPanel: {
    marginTop: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  doneButton: {
    ...UI.secondaryButton,
    height: 42,
    alignSelf: "flex-end",
    paddingHorizontal: SPACE.xl,
  },
  doneText: {
    ...UI.secondaryButtonText,
    fontSize: 14,
  },
})
