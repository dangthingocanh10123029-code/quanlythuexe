"use client"

import { useRef, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking, Modal, type TextStyle } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../../config/firebase"
import { useAuth } from "../../hooks/useAuth"
import { HOTLINE, SUPPORT_EMAIL } from "../../utils/constants"
import { PRESS_OPACITY, RADIUS, SHADOWS, SPACE, THEME_COLORS, TYPOGRAPHY, UI } from "../../utils/theme"

const BUG_REPORT_SUBJECT = "Báo lỗi ứng dụng"

// Hướng dẫn đặt xe theo đúng luồng trong app
const bookingGuideSteps = [
  {
    icon: "search",
    title: "Tìm xe",
    description: "Ở tab Trang chủ hoặc tab Xe, tìm theo tên hãng/mẫu xe và lọc theo thành phố, loại xe, nhiên liệu, số chỗ, khoảng giá. Ở tab Xe, bấm biểu tượng trái tim để lưu vào Xe yêu thích.",
  },
  {
    icon: "car-sport",
    title: "Xem chi tiết xe",
    description: "Bấm vào xe để xem thông số, giá thuê theo ngày và đánh giá của khách đã thuê.",
  },
  {
    icon: "arrow-forward-circle",
    title: "Bấm \"Thuê ngay\"",
    description: "Ở cuối trang chi tiết xe, bấm \"Thuê ngay\" để chuyển sang màn Xác nhận đặt xe.",
  },
  {
    icon: "location",
    title: "Chọn Thời gian thuê & Điểm nhận xe",
    description: "Chọn số ngày thuê, điểm nhận xe và các Dịch vụ thêm (nếu cần). Chi tiết giá đã gồm VAT 10% hiển thị ngay bên dưới.",
  },
  {
    icon: "wallet",
    title: "Chọn Phương thức thanh toán",
    description: "Chọn Thẻ ngân hàng, MoMo hoặc ZaloPay rồi bấm \"Tiếp tục thanh toán\".",
  },
  {
    icon: "card",
    title: "Thanh toán",
    description: "Nhập thông tin thanh toán và xác nhận. Khi thanh toán thành công, đơn chuyển sang trạng thái \"Sắp nhận xe\".",
  },
  {
    icon: "calendar",
    title: "Theo dõi chuyến đi",
    description: "Đơn đặt xe hiện trong tab Chuyến đi. Khi nhận xe, nhớ mang theo CCCD và GPLX bản gốc.",
  },
]

const faqData = [
  {
    id: 1,
    question: "Làm sao để đặt xe trên RENTO?",
    answer:
      "Bạn chọn xe ưng ý, chọn ngày nhận – trả xe và điểm nhận xe, sau đó bấm \"Đặt xe ngay\" và thanh toán qua MoMo, ZaloPay hoặc thẻ ngân hàng. Đơn đặt xe sẽ hiện trong tab Chuyến đi ngay khi thanh toán thành công.",
  },
  {
    id: 2,
    question: "Thuê xe tự lái cần những giấy tờ gì?",
    answer:
      "Bạn cần CCCD (hoặc hộ chiếu đối với người nước ngoài) và giấy phép lái xe hạng B1 hoặc B2 trở lên còn hiệu lực. Người thuê phải từ 21 tuổi trở lên. Khi nhận xe, nhân viên sẽ đối chiếu giấy tờ bản gốc.",
  },
  {
    id: 3,
    question: "Có phải đặt cọc khi thuê xe không?",
    answer:
      "Có. Khi nhận xe, bạn để lại tài sản thế chấp là 15.000.000đ tiền mặt/chuyển khoản hoặc xe máy kèm cà vẹt chính chủ. Tiền cọc được hoàn lại trong vòng 1–3 ngày làm việc sau khi trả xe và kiểm tra không phát sinh phạt nguội.",
  },
  {
    id: 4,
    question: "Tôi có thể huỷ chuyến không?",
    answer:
      "Có. Huỷ trước giờ nhận xe từ 24 giờ trở lên được hoàn 100% tiền thuê. Huỷ trong vòng 24 giờ trước giờ nhận xe sẽ mất phí 30% tiền thuê. Tiền hoàn sẽ về MoMo, ZaloPay hoặc tài khoản ngân hàng bạn đã dùng để thanh toán.",
  },
  {
    id: 5,
    question: "Trả xe trễ giờ thì sao?",
    answer:
      "Trả xe trễ dưới 1 giờ được miễn phí. Từ giờ thứ 2 trở đi, phụ phí 100.000đ/giờ; trễ quá 5 giờ sẽ tính thêm một ngày thuê. Nếu muốn gia hạn, bạn hãy gọi hotline trước giờ trả xe để được hỗ trợ.",
  },
  {
    id: 6,
    question: "Giá thuê đã bao gồm bảo hiểm và xăng chưa?",
    answer:
      "Giá thuê đã bao gồm bảo hiểm vật chất xe cơ bản và thuế VAT. Xăng không bao gồm: xe được giao với mức nhiên liệu nhất định và bạn vui lòng trả xe với mức nhiên liệu tương đương. Phí cầu đường, gửi xe và phạt nguội (nếu có) do người thuê chi trả.",
  },
]

const contactOptions = [
  {
    id: 1,
    title: "Gọi tổng đài",
    description: "Thứ 2 – Chủ nhật, 7:00 – 22:00",
    icon: "call",
    action: "call",
    value: HOTLINE,
  },
  {
    id: 2,
    title: "Gửi email",
    description: "Phản hồi trong vòng 24 giờ",
    icon: "mail",
    action: "email",
    value: SUPPORT_EMAIL,
  },
  {
    id: 3,
    title: "Chat trực tuyến",
    description: "Trò chuyện trực tiếp với nhân viên hỗ trợ",
    icon: "chatbubble",
    action: "chat",
    value: "Hoạt động 24/7",
  },
  {
    id: 4,
    title: "Zalo",
    description: "Nhắn tin qua Zalo OA của RENTO",
    icon: "chatbubbles",
    action: "zalo",
    value: "0901 234 567",
  },
]

const PRIORITY_LABELS: Record<string, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
}

export default function SupportScreen() {
  const { user } = useAuth()
  const scrollRef = useRef<ScrollView>(null)
  const contactFormY = useRef(0)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showContactForm, setShowContactForm] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: "",
    priority: "medium",
  })

  const toggleFaq = (id: number) => {
    setExpandedFaq(expandedFaq === id ? null : id)
  }

  const openUrl = async (url: string, fallbackMessage: string) => {
    try {
      await Linking.openURL(url)
    } catch (error) {
      console.error("Error opening URL:", url, error)
      Alert.alert("Không mở được", fallbackMessage)
    }
  }

  const scrollToContactForm = () => {
    // Chờ form render xong rồi mới cuộn tới
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(contactFormY.current - 10, 0), animated: true })
    }, 100)
  }

  const openContactForm = (subject?: string) => {
    if (subject !== undefined) {
      setContactForm((prev) => ({ ...prev, subject }))
    }
    setShowContactForm(true)
    scrollToContactForm()
  }

  const callHotline = () => {
    openUrl(`tel:${HOTLINE.replace(/\s/g, "")}`, `Bạn vui lòng gọi trực tiếp tổng đài ${HOTLINE}.`)
  }

  const handleContactAction = (action: string, value: string) => {
    switch (action) {
      case "call":
        callHotline()
        break
      case "email":
        openUrl(
          `mailto:${value}?subject=${encodeURIComponent("Yêu cầu hỗ trợ RENTO")}`,
          `Bạn vui lòng gửi email tới ${value}.`,
        )
        break
      case "chat":
        // Chưa có kênh chat thời gian thực: dùng form gửi yêu cầu hỗ trợ trong ứng dụng
        openContactForm()
        break
      case "zalo":
        openUrl(`https://zalo.me/${value.replace(/\s/g, "")}`, `Bạn vui lòng nhắn Zalo tới số ${value}.`)
        break
    }
  }

  const handleSubmitForm = async () => {
    const subject = contactForm.subject.trim()
    const message = contactForm.message.trim()
    if (!subject || !message) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ tiêu đề và nội dung")
      return
    }
    if (!user?.id) {
      Alert.alert("Bạn chưa đăng nhập", "Vui lòng đăng nhập để gửi yêu cầu hỗ trợ.")
      return
    }

    setSubmitting(true)
    try {
      await addDoc(collection(db, "supportTickets"), {
        userId: user.id,
        userEmail: user.email || "",
        subject,
        message,
        priority: contactForm.priority,
        status: "open",
        createdAt: serverTimestamp(),
      })
      Alert.alert("Đã gửi", "Yêu cầu của bạn đã được gửi. RENTO sẽ phản hồi trong vòng 24 giờ.", [
        {
          text: "OK",
          onPress: () => {
            setShowContactForm(false)
            setContactForm({ subject: "", message: "", priority: "medium" })
          },
        },
      ])
    } catch (error) {
      console.error("Error submitting support ticket:", error)
      Alert.alert("Gửi thất bại", "Không gửi được yêu cầu hỗ trợ. Vui lòng kiểm tra kết nối mạng và thử lại.")
    } finally {
      setSubmitting(false)
    }
  }

  const focusProps = (field: string) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField((prev) => (prev === field ? null : prev)),
    placeholderTextColor: THEME_COLORS.textMuted,
  })

  const quickActions = [
    {
      key: "contact",
      icon: "create-outline",
      label: "Liên hệ",
      onPress: () => (showContactForm ? setShowContactForm(false) : openContactForm()),
    },
    { key: "guide", icon: "document-text-outline", label: "Hướng dẫn", onPress: () => setShowGuide(true) },
    { key: "bug", icon: "bug-outline", label: "Báo lỗi", onPress: () => openContactForm(BUG_REPORT_SUBJECT) },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="arrow-back" size={22} color={THEME_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trợ giúp & Hỗ trợ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hỗ trợ nhanh</Text>
          <View style={styles.quickActions}>
            {quickActions.map((qa) => (
              <TouchableOpacity key={qa.key} style={styles.quickAction} onPress={qa.onPress} activeOpacity={PRESS_OPACITY}>
                <View style={styles.quickActionIcon}>
                  <Ionicons name={qa.icon as any} size={22} color={THEME_COLORS.primary} />
                </View>
                <Text style={styles.quickActionText}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contact Form */}
        {showContactForm && (
          <View
            style={styles.section}
            onLayout={(e) => {
              contactFormY.current = e.nativeEvent.layout.y
            }}
          >
            <Text style={styles.sectionTitle}>Gửi tin nhắn cho chúng tôi</Text>
            <View style={styles.contactForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tiêu đề</Text>
                <TextInput
                  style={[styles.input, focusedField === "subject" && styles.inputFocused]}
                  placeholder="Bạn cần hỗ trợ về vấn đề gì?"
                  value={contactForm.subject}
                  onChangeText={(text) => setContactForm({ ...contactForm, subject: text })}
                  {...focusProps("subject")}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mức độ ưu tiên</Text>
                <View style={styles.priorityContainer}>
                  {["low", "medium", "high"].map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[styles.priorityButton, contactForm.priority === priority && styles.selectedPriority]}
                      onPress={() => setContactForm({ ...contactForm, priority })}
                      activeOpacity={PRESS_OPACITY}
                    >
                      <Text
                        style={[styles.priorityText, contactForm.priority === priority && styles.selectedPriorityText]}
                      >
                        {PRIORITY_LABELS[priority]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nội dung</Text>
                <TextInput
                  style={[styles.input, styles.textArea, focusedField === "message" && styles.inputFocused]}
                  placeholder="Mô tả chi tiết vấn đề hoặc câu hỏi của bạn..."
                  value={contactForm.message}
                  onChangeText={(text) => setContactForm({ ...contactForm, message: text })}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  {...focusProps("message")}
                />
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowContactForm(false)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Text style={styles.cancelButtonText}>Huỷ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.buttonDisabled]}
                  onPress={handleSubmitForm}
                  disabled={submitting}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Text style={styles.submitButtonText}>{submitting ? "Đang gửi..." : "Gửi tin nhắn"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kênh liên hệ</Text>
          <View style={styles.contactOptions}>
            {contactOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.contactOption}
                onPress={() => handleContactAction(option.action, option.value)}
                activeOpacity={PRESS_OPACITY}
              >
                <View style={styles.contactOptionLeft}>
                  <View style={styles.contactIcon}>
                    <Ionicons name={`${option.icon}-outline` as any} size={20} color={THEME_COLORS.primary} />
                  </View>
                  <View style={styles.contactOptionText}>
                    <Text style={styles.contactOptionTitle}>{option.title}</Text>
                    <Text style={styles.contactOptionDescription}>{option.description}</Text>
                    <Text style={styles.contactOptionValue}>{option.value}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={THEME_COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Câu hỏi thường gặp</Text>
          <View style={styles.faqContainer}>
            {faqData.map((faq, index) => {
              const expanded = expandedFaq === faq.id
              return (
                <View key={faq.id}>
                  {index > 0 && <View style={styles.faqDivider} />}
                  <TouchableOpacity
                    style={styles.faqQuestion}
                    onPress={() => toggleFaq(faq.id)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={[styles.faqQuestionText, expanded && styles.faqQuestionTextActive]}>
                      {faq.question}
                    </Text>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={expanded ? THEME_COLORS.primary : THEME_COLORS.textMuted}
                    />
                  </TouchableOpacity>
                  {expanded && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyHeader}>
              <View style={styles.emergencyIcon}>
                <Ionicons name="warning-outline" size={20} color={THEME_COLORS.danger} />
              </View>
              <Text style={styles.emergencyTitle}>Liên hệ khẩn cấp</Text>
            </View>
            <Text style={styles.emergencyText}>
              Gặp sự cố khẩn cấp trong lúc thuê xe (tai nạn, hỏng xe, mất giấy tờ...)? Gọi ngay đường dây nóng 24/7:
            </Text>
            <TouchableOpacity style={styles.emergencyButton} onPress={callHotline} activeOpacity={PRESS_OPACITY}>
              <Ionicons name="call" size={18} color={THEME_COLORS.danger} />
              <Text style={styles.emergencyButtonText}>Gọi khẩn cấp: {HOTLINE}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Booking guide modal */}
      <Modal animationType="slide" transparent visible={showGuide} onRequestClose={() => setShowGuide(false)}>
        <View style={styles.guideOverlay}>
          <View style={styles.guideContent}>
            <View style={styles.guideHandle} />
            <View style={styles.guideHeader}>
              <Text style={styles.guideTitle}>Hướng dẫn đặt xe</Text>
              <TouchableOpacity
                style={styles.guideCloseIcon}
                onPress={() => setShowGuide(false)}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {bookingGuideSteps.map((step, index) => (
                <View key={step.title} style={styles.guideStep}>
                  <View style={styles.guideStepNumber}>
                    <Text style={styles.guideStepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.guideStepBody}>
                    <View style={styles.guideStepTitleRow}>
                      <Ionicons name={step.icon as any} size={16} color={THEME_COLORS.primary} />
                      <Text style={styles.guideStepTitle}>{step.title}</Text>
                    </View>
                    <Text style={styles.guideStepDescription}>{step.description}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.guideCloseButton}
              onPress={() => setShowGuide(false)}
              activeOpacity={PRESS_OPACITY}
            >
              <Text style={styles.guideCloseButtonText}>Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACE.screen,
    paddingVertical: SPACE.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME_COLORS.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACE["2xl"],
    paddingBottom: SPACE.lg,
  },
  section: {
    paddingHorizontal: SPACE.screen,
    marginBottom: SPACE.section,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACE.md,
  },
  // Hỗ trợ nhanh
  quickActions: {
    flexDirection: "row",
    gap: SPACE.md,
  },
  quickAction: {
    ...UI.card,
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACE.lg,
    paddingHorizontal: SPACE.sm,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.sm,
  },
  quickActionText: {
    fontSize: 13,
    color: THEME_COLORS.textPrimary,
    fontWeight: "600",
    textAlign: "center",
  },
  // Form gửi yêu cầu
  contactForm: {
    ...UI.card,
    padding: SPACE.xl,
  },
  inputGroup: {
    marginBottom: SPACE.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
    marginBottom: SPACE.sm,
  },
  input: {
    ...UI.input,
  },
  inputFocused: {
    ...(UI.inputFocused as TextStyle),
  },
  textArea: {
    height: undefined,
    minHeight: 120,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.md,
    textAlignVertical: "top",
  },
  priorityContainer: {
    flexDirection: "row",
    gap: SPACE.sm,
  },
  priorityButton: {
    ...UI.chip,
    flex: 1,
    alignItems: "center",
    paddingHorizontal: SPACE.sm,
  },
  selectedPriority: {
    ...UI.chipActive,
  },
  priorityText: {
    ...UI.chipText,
  },
  selectedPriorityText: {
    ...UI.chipTextActive,
  },
  formButtons: {
    flexDirection: "row",
    gap: SPACE.md,
    marginTop: SPACE.sm,
  },
  cancelButton: {
    ...UI.secondaryButton,
    flex: 1,
    height: 48,
    paddingHorizontal: SPACE.lg,
  },
  cancelButtonText: {
    ...UI.secondaryButtonText,
    fontSize: 15,
  },
  submitButton: {
    ...UI.primaryButton,
    flex: 1.4,
    height: 48,
    paddingHorizontal: SPACE.lg,
  },
  submitButtonText: {
    ...UI.primaryButtonText,
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Kênh liên hệ
  contactOptions: {
    gap: SPACE.md,
  },
  contactOption: {
    ...UI.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACE.lg,
  },
  contactOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: SPACE.md,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  contactOptionText: {
    flex: 1,
  },
  contactOptionTitle: {
    ...TYPOGRAPHY.bodyStrong,
    marginBottom: 2,
  },
  contactOptionDescription: {
    ...TYPOGRAPHY.caption,
    marginBottom: 2,
  },
  contactOptionValue: {
    fontSize: 13,
    color: THEME_COLORS.primary,
    fontWeight: "600",
  },
  // FAQ dạng accordion trong một thẻ
  faqContainer: {
    ...UI.card,
    overflow: "hidden",
  },
  faqDivider: {
    ...UI.divider,
    marginHorizontal: SPACE.lg,
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.lg,
    gap: SPACE.md,
  },
  faqQuestionText: {
    ...TYPOGRAPHY.bodyStrong,
    flex: 1,
  },
  faqQuestionTextActive: {
    color: THEME_COLORS.primary,
  },
  faqAnswer: {
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.lg,
  },
  faqAnswerText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 21,
  },
  // Khẩn cấp
  emergencyCard: {
    ...UI.card,
    padding: SPACE.xl,
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    marginBottom: SPACE.md,
  },
  emergencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyTitle: {
    ...TYPOGRAPHY.h3,
  },
  emergencyText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACE.lg,
  },
  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.sm,
    height: 48,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.dangerSoft,
  },
  emergencyButtonText: {
    color: THEME_COLORS.danger,
    fontSize: 15,
    fontWeight: "700",
  },
  // Modal hướng dẫn (bottom sheet)
  guideOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  guideContent: {
    backgroundColor: THEME_COLORS.surface,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.md,
    paddingBottom: SPACE["2xl"],
    maxHeight: "85%",
    ...SHADOWS.raised,
  },
  guideHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME_COLORS.borderStrong,
    marginBottom: SPACE.lg,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACE.xl,
  },
  guideTitle: {
    ...TYPOGRAPHY.h2,
  },
  guideCloseIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  guideStep: {
    flexDirection: "row",
    marginBottom: SPACE.xl,
  },
  guideStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACE.md,
  },
  guideStepNumberText: {
    color: THEME_COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  guideStepBody: {
    flex: 1,
  },
  guideStepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: SPACE.xs,
  },
  guideStepTitle: {
    ...TYPOGRAPHY.bodyStrong,
    flexShrink: 1,
  },
  guideStepDescription: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
  },
  guideCloseButton: {
    ...UI.primaryButton,
    marginTop: SPACE.sm,
  },
  guideCloseButtonText: {
    ...UI.primaryButtonText,
  },
})
