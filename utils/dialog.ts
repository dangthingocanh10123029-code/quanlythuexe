import { Alert, Platform } from "react-native"

// Alert.alert không hiện gì trên web (react-native-web) → dùng window.alert / window.confirm.
const webWindow = () => (Platform.OS === "web" ? (globalThis as any) : null)

// Thông báo một nút OK
export function showAlert(title: string, message?: string, onOk?: () => void) {
  const w = webWindow()
  if (w) {
    w.alert?.(message ? `${title}\n\n${message}` : title)
    onOk?.()
    return
  }
  Alert.alert(title, message, onOk ? [{ text: "OK", onPress: onOk }] : undefined)
}

// Hỏi xác nhận (Huỷ / nút hành động); chỉ gọi onConfirm khi người dùng đồng ý
export function confirmDialog(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void,
  { destructive = false, cancelText = "Không" }: { destructive?: boolean; cancelText?: string } = {},
) {
  const w = webWindow()
  if (w) {
    if (typeof w.confirm !== "function" || w.confirm(`${title}\n\n${message}`)) onConfirm()
    return
  }
  Alert.alert(title, message, [
    { text: cancelText, style: "cancel" },
    { text: confirmText, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ])
}
