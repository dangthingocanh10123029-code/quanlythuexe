"use client"

import { useRef, useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking, Modal } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../../config/firebase"
import { useAuth } from "../../hooks/useAuth"
import { HOTLINE, SUPPORT_EMAIL } from "../../utils/constants"

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trợ giúp & Hỗ trợ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView ref={scrollRef} style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hỗ trợ nhanh</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => (showContactForm ? setShowContactForm(false) : openContactForm())}
            >
              <Ionicons name="create" size={24} color="#4169e1" />
              <Text style={styles.quickActionText}>Liên hệ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => setShowGuide(true)}>
              <Ionicons name="document-text" size={24} color="#4169e1" />
              <Text style={styles.quickActionText}>Hướng dẫn</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={() => openContactForm(BUG_REPORT_SUBJECT)}>
              <Ionicons name="bug" size={24} color="#4169e1" />
              <Text style={styles.quickActionText}>Báo lỗi</Text>
            </TouchableOpacity>
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
                  style={styles.input}
                  placeholder="Bạn cần hỗ trợ về vấn đề gì?"
                  value={contactForm.subject}
                  onChangeText={(text) => setContactForm({ ...contactForm, subject: text })}
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
                  style={[styles.input, styles.textArea]}
                  placeholder="Mô tả chi tiết vấn đề hoặc câu hỏi của bạn..."
                  value={contactForm.message}
                  onChangeText={(text) => setContactForm({ ...contactForm, message: text })}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowContactForm(false)}>
                  <Text style={styles.cancelButtonText}>Huỷ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, submitting && { opacity: 0.6 }]}
                  onPress={handleSubmitForm}
                  disabled={submitting}
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
              >
                <View style={styles.contactOptionLeft}>
                  <Ionicons name={option.icon as any} size={24} color="#4169e1" />
                  <View style={styles.contactOptionText}>
                    <Text style={styles.contactOptionTitle}>{option.title}</Text>
                    <Text style={styles.contactOptionDescription}>{option.description}</Text>
                    <Text style={styles.contactOptionValue}>{option.value}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#cccccc" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Câu hỏi thường gặp</Text>
          <View style={styles.faqContainer}>
            {faqData.map((faq) => (
              <View key={faq.id} style={styles.faqItem}>
                <TouchableOpacity style={styles.faqQuestion} onPress={() => toggleFaq(faq.id)}>
                  <Text style={styles.faqQuestionText}>{faq.question}</Text>
                  <Ionicons name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"} size={20} color="#666666" />
                </TouchableOpacity>
                {expandedFaq === faq.id && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyHeader}>
              <Ionicons name="warning" size={24} color="#ff4444" />
              <Text style={styles.emergencyTitle}>Liên hệ khẩn cấp</Text>
            </View>
            <Text style={styles.emergencyText}>
              Gặp sự cố khẩn cấp trong lúc thuê xe (tai nạn, hỏng xe, mất giấy tờ...)? Gọi ngay đường dây nóng 24/7:
            </Text>
            <TouchableOpacity style={styles.emergencyButton} onPress={callHotline}>
              <Ionicons name="call" size={20} color="#ffffff" />
              <Text style={styles.emergencyButtonText}>Gọi khẩn cấp: {HOTLINE}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Booking guide modal */}
      <Modal animationType="slide" transparent visible={showGuide} onRequestClose={() => setShowGuide(false)}>
        <View style={styles.guideOverlay}>
          <View style={styles.guideContent}>
            <View style={styles.guideHeader}>
              <Text style={styles.guideTitle}>Hướng dẫn đặt xe</Text>
              <TouchableOpacity onPress={() => setShowGuide(false)}>
                <Ionicons name="close" size={24} color="#666666" />
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
                      <Ionicons name={step.icon as any} size={18} color="#4169e1" />
                      <Text style={styles.guideStepTitle}>{step.title}</Text>
                    </View>
                    <Text style={styles.guideStepDescription}>{step.description}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.guideCloseButton} onPress={() => setShowGuide(false)}>
              <Text style={styles.guideCloseButtonText}>Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  guideOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  guideContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  guideTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  guideStep: {
    flexDirection: "row",
    marginBottom: 16,
  },
  guideStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1054CF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  guideStepNumberText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  guideStepBody: {
    flex: 1,
  },
  guideStepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  guideStepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    flexShrink: 1,
  },
  guideStepDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  guideCloseButton: {
    backgroundColor: "#1054CF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  guideCloseButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: "#ededed",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 20,
  },
  quickAction: {
    alignItems: "center",
    color: "#1054CF",
  },
  quickActionText: {
    fontSize: 12,
    color: "#4169e1",
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  contactForm: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  priorityContainer: {
    flexDirection: "row",
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedPriority: {
    backgroundColor: "#4169e1",
    borderColor: "#4169e1",
  },
  priorityText: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "600",
  },
  selectedPriorityText: {
    color: "#ffffff",
  },
  formButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cancelButtonText: {
    color: "#666666",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#1054CF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  contactOptions: {
    gap: 12,
  },
  contactOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contactOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  contactOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  contactOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 2,
  },
  contactOptionDescription: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 2,
  },
  contactOptionValue: {
    fontSize: 12,
    color: "#4169e1",
    fontWeight: "600",
  },
  faqContainer: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  faqAnswerText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  emergencyCard: {
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ffe0e0",
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ff4444",
    marginLeft: 12,
  },
  emergencyText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
    marginBottom: 16,
  },
  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff4444",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emergencyButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
})
