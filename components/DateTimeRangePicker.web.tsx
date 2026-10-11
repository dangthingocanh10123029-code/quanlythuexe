import { useMemo, useState } from "react"
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { formatDate } from "../utils/helpers"
import { PRESS_OPACITY, RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../utils/theme"
import type { DateTimeRangePickerProps } from "./DateTimeRangePicker"

type ActiveField = "pickup" | "return"

const DAY = 86_400_000
const HOUR = 3_600_000
const HOURS = Array.from({ length: 15 }, (_, index) => index + 7)

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export default function DateTimeRangePicker({
  pickupAt,
  returnAt,
  onPickupChange,
  onReturnChange,
  returnLocked = false,
}: DateTimeRangePickerProps) {
  const [activeField, setActiveField] = useState<ActiveField>("pickup")
  const selected = activeField === "pickup" ? pickupAt : returnAt
  const dates = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return Array.from({ length: 14 }, (_, index) => new Date(start.getTime() + (index + 1) * DAY))
  }, [])

  const applyDate = (value: Date) => {
    if (activeField === "pickup") {
      onPickupChange(value)
      if (!returnLocked && value >= returnAt) onReturnChange(new Date(value.getTime() + DAY))
      return
    }
    onReturnChange(value <= pickupAt ? new Date(pickupAt.getTime() + HOUR) : value)
  }

  const selectDay = (day: Date) => {
    const next = new Date(day)
    next.setHours(selected.getHours(), 0, 0, 0)
    applyDate(next)
  }

  const selectHour = (hour: number) => {
    const next = new Date(selected)
    next.setHours(hour, 0, 0, 0)
    applyDate(next)
  }

  const renderField = (field: ActiveField, label: string, icon: keyof typeof Ionicons.glyphMap, value: Date) => {
    const active = activeField === field
    const locked = field === "return" && returnLocked
    return (
      <TouchableOpacity
        style={[styles.field, active && styles.fieldActive, locked && styles.fieldLocked]}
        onPress={() => setActiveField(field)}
        disabled={locked}
        activeOpacity={PRESS_OPACITY}
        accessibilityRole="button"
        accessibilityState={{ disabled: locked }}
      >
        <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
          <Ionicons name={icon} size={18} color={active ? THEME_COLORS.primary : THEME_COLORS.textSecondary} />
        </View>
        <View style={styles.fieldText}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{formatDate(value, "datetime")}</Text>
        </View>
        {active ? <Ionicons name="checkmark-circle" size={20} color={THEME_COLORS.primary} /> : null}
        {locked ? <Ionicons name="lock-closed" size={16} color={THEME_COLORS.textMuted} /> : null}
      </TouchableOpacity>
    )
  }

  return (
    <View>
      <View style={styles.fieldsRow}>
        {renderField("pickup", "Nhận xe", "log-in-outline", pickupAt)}
        <Ionicons name="arrow-forward" size={18} color={THEME_COLORS.textMuted} />
        {renderField("return", "Trả xe", "log-out-outline", returnAt)}
      </View>

      <View style={styles.selectorPanel}>
        <Text style={styles.selectorLabel}>Chọn ngày {activeField === "pickup" ? "nhận" : "trả"}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {dates.map((date) => {
            const active = sameDay(date, selected)
            return (
              <TouchableOpacity
                key={date.toISOString()}
                style={[styles.dateChip, active && styles.chipActive]}
                onPress={() => selectDay(date)}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={[styles.dateChipText, active && styles.chipTextActive]}>{formatDate(date)}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <Text style={styles.selectorLabel}>Chọn giờ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {HOURS.map((hour) => {
            const active = selected.getHours() === hour
            return (
              <TouchableOpacity
                key={hour}
                style={[styles.timeChip, active && styles.chipActive]}
                onPress={() => selectHour(hour)}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={[styles.timeChipText, active && styles.chipTextActive]}>{`${String(hour).padStart(2, "0")}:00`}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fieldsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
  },
  field: {
    flex: 1,
    minHeight: 74,
    padding: SPACE.md,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
  },
  fieldActive: {
    ...UI.inputFocused,
    backgroundColor: THEME_COLORS.primarySubtle,
  },
  fieldLocked: {
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME_COLORS.surfaceMuted,
    marginRight: SPACE.sm,
  },
  iconWrapActive: {
    backgroundColor: THEME_COLORS.primarySoft,
  },
  fieldText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    ...TYPOGRAPHY.caption,
  },
  value: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
    marginTop: 2,
  },
  selectorPanel: {
    marginTop: SPACE.lg,
    paddingTop: SPACE.md,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
  },
  selectorLabel: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.textSecondary,
    marginBottom: SPACE.sm,
  },
  chipRow: {
    gap: SPACE.sm,
    paddingBottom: SPACE.md,
  },
  dateChip: {
    ...UI.chip,
    minWidth: 92,
  },
  timeChip: {
    ...UI.chip,
    minWidth: 68,
  },
  chipActive: {
    ...UI.chipActive,
  },
  dateChipText: {
    ...UI.chipText,
    fontSize: 13,
  },
  timeChipText: {
    ...UI.chipText,
  },
  chipTextActive: {
    ...UI.chipTextActive,
  },
})
