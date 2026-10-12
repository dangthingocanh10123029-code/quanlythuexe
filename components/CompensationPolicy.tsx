import { View, Text, StyleSheet } from "react-native"
import { COMPENSATION_POLICY } from "../utils/constants"
import { formatCurrency } from "../utils/helpers"
import { RADIUS, SPACE, THEME_COLORS, TYPOGRAPHY } from "../utils/theme"

export default function CompensationPolicy() {
  return (
    <View>
      <View style={styles.table}>
        {COMPENSATION_POLICY.map((item, index) => (
          <View
            key={item.id}
            style={[styles.row, index < COMPENSATION_POLICY.length - 1 && styles.rowDivider]}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.price}>
                {item.custom
                  ? "Theo thực tế"
                  : `${formatCurrency(item.unit ?? 0)}/${item.unitLabel ?? "đơn vị"}`}
              </Text>
            </View>
            <Text style={styles.note}>{item.note}</Text>
          </View>
        ))}
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>Tiền đền bù được trừ vào tiền cọc khi bạn trả xe.</Text>
        <Text style={styles.noticeText}>Phần vượt tiền cọc, bạn thanh toán thêm trong vòng 7 ngày.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surface,
    overflow: "hidden",
  },
  row: {
    padding: SPACE.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.border,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACE.md,
  },
  label: {
    ...TYPOGRAPHY.bodyStrong,
    flex: 1,
    fontSize: 14,
  },
  price: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.primary,
    fontWeight: "700",
    textAlign: "right",
    maxWidth: "45%",
  },
  note: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACE.xs,
  },
  notice: {
    marginTop: SPACE.md,
    padding: SPACE.md,
    gap: SPACE.xs,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.primarySoft,
  },
  noticeText: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.textSecondary,
  },
})
