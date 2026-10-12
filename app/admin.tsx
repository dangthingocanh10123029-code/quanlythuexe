"use client"

import { useState, useEffect, useMemo } from "react"
import type { StyleProp, TextStyle } from "react-native"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Animated, Modal, Platform, ActivityIndicator, KeyboardAvoidingView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { collection, addDoc, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { db } from "../config/firebase"
import * as ImagePicker from 'expo-image-picker';
import { LineChart, BarChart } from "react-native-chart-kit"
import { Dimensions } from "react-native"
import { formatCurrency, formatDate } from "../utils/helpers"
import { confirmDialog, showAlert } from "../utils/dialog"
import { addCarType, deleteCarType, replyTicket, setUserRole } from "../utils/adminActions"
import EmptyState from "../components/EmptyState"
import PaymentLogo from "../components/ui/PaymentLogo"
import {
  AMENITIES,
  CAR_STATUS_LABELS,
  COMPENSATION_POLICY,
  FUEL_LEVELS,
  getBookingStatusLabel,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
  PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TRANSMISSIONS,
  USER_ROLE_LABELS,
} from "../utils/constants"
import { useCars, getCarImage } from "../hooks/useCars"
import { useAuth } from "../hooks/useAuth"
import { useAllLicenses } from "../hooks/useLicense"
import { useAllReviews, type Review } from "../hooks/useReviews"
import { useAllTickets, type SupportTicket } from "../hooks/useSupportTickets"
import { useCarTypes, type CarType } from "../hooks/useCarTypes"
import { seedCars, deleteCar } from "../utils/carActions"
import { rejectLicense, verifyLicense } from "../utils/licenseActions"
import { cancelBooking, confirmBooking, deleteReview, handOverBooking, previewRefund, previewReturn, rejectBooking, returnBooking } from "../utils/bookingActions"
import { bookingRevenue, calcCompensation, getBookingRange, listPayments, summarizePayments, type CompensationInput } from "../utils/booking"
import type { Car, CarStatus, Transmission } from "../types/car"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: Date | null;
  status: 'active' | 'inactive';
  isAdmin: boolean;
  role?: "staff";
  avatar: string;
}

interface BookingAddOn {
  id?: string | number;
  name?: string;
  price?: number;
}

interface BookingPayment {
  method?: string;
  amount?: number | string;
  transactionId?: string;
  paidAt?: any;
  status?: string;
  [key: string]: any;
}

// Đơn đặt xe đọc từ collection `bookings`
interface Booking {
  id: string;
  userId: string;
  carId: string;
  carName: string;
  carImage: any;
  duration: number;
  location: string;
  status: string;
  price: number;
  selectedAddOns: BookingAddOn[];
  createdAt: Date | null;
  pickupDate: any;
  cancelledAt: Date | null;
  payment: BookingPayment | null;
  // Field mới (G2–G4), đơn cũ có thể thiếu
  returnDate?: any;
  returnLocation?: string;
  subtotal?: number;
  deposit?: number;
  handover?: { odometer?: number; fuelLevel?: string; conditionNote?: string; documentsChecked?: boolean; depositCollected?: boolean; rentCollected?: boolean; at?: any } | null;
  returnInspection?: {
    odometer?: number;
    fuelLevel?: string;
    damageNote?: string;
    lateFee?: number;
    extraFees?: number;
    depositRefund?: number;
    compensations?: { id: string; label: string; qty: number; amount: number }[];
    compensationTotal?: number;
    otherFees?: number;
    extraDue?: number;
    at?: any;
  } | null;
  rejectReason?: string;
  rejectedAt?: any;
  cancelledBy?: "user" | "admin";
}

const adminTabs = [
  { id: "cars", name: "Xe", icon: "car" },
  { id: "bookings", name: "Đơn đặt xe", icon: "calendar" },
  { id: "payments", name: "Thanh toán", icon: "card" },
  { id: "users", name: "Người dùng", icon: "people" },
  { id: "reviews", name: "Đánh giá", icon: "star" },
  { id: "support", name: "Hỗ trợ", icon: "chatbubbles" },
  { id: "reports", name: "Báo cáo", icon: "analytics" },
]

const REVIEW_STARS = [5, 4, 3, 2, 1]

// Bộ lọc trạng thái đơn (giá trị so sánh không phân biệt hoa thường)
const BOOKING_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: getBookingStatusLabel("pending") },
  { id: "confirmed", label: getBookingStatusLabel("confirmed") },
  { id: "upcoming", label: getBookingStatusLabel("upcoming") },
  { id: "active", label: getBookingStatusLabel("active") },
  { id: "completed", label: getBookingStatusLabel("completed") },
  { id: "cancelled", label: getBookingStatusLabel("cancelled") },
  { id: "rejected", label: getBookingStatusLabel("rejected") },
]

const USER_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "active", label: "Hoạt động" },
  { id: "inactive", label: "Đã khoá" },
  { id: "admin", label: USER_ROLE_LABELS.admin },
  { id: "staff", label: USER_ROLE_LABELS.staff },
]

// Vai trò hiển thị (khoá của USER_ROLE_LABELS)
const getUserRole = (u: { isAdmin: boolean; role?: "staff" }) => (u.isAdmin ? "admin" : u.role === "staff" ? "staff" : "customer")

// Thanh toán (G7): lọc theo trạng thái / phương thức (giá trị payment.method đang lưu)
const PAYMENT_FILTERS = [
  { id: "all", label: "Tất cả" },
  ...["completed", "refunded", "pending", "failed"].map((id) => ({ id, label: PAYMENT_STATUS_LABELS[id] })),
]
const PAYMENT_METHOD_FILTERS = [
  { id: "all", label: "Mọi phương thức" },
  ...[PAYMENT_METHODS.CARD.label, PAYMENT_METHODS.MOMO.short, PAYMENT_METHODS.ZALOPAY.short, PAYMENT_METHODS.CASH.short].map(
    (m) => ({ id: m, label: m }),
  ),
]
const PAYMENT_LOGO_IDS: Record<string, "credit-card" | "momo" | "zalopay"> = {
  [PAYMENT_METHODS.CARD.label]: "credit-card",
  "Credit Card": "credit-card",
  [PAYMENT_METHODS.MOMO.short]: "momo",
  [PAYMENT_METHODS.ZALOPAY.short]: "zalopay",
}
// Nhãn trạng thái thanh toán; "unpaid" = đơn chưa có giao dịch
const getPaymentLabel = (key?: string) => PAYMENT_STATUS_LABELS[normalizeStatus(key)] || (key === "unpaid" ? "Chưa thanh toán" : key || "Không rõ")

// Phiếu hỗ trợ (G7)
const TICKET_FILTERS = ["open", "resolved", "all"]
// Đơn đã thanh toán được tính vào doanh thu
const PAID_STATUSES = ["upcoming", "active", "completed"]

// Nhãn hiển thị cho trạng thái xe / người dùng (giá trị lưu giữ nguyên tiếng Anh)
const getCarStatusLabel = (status?: string) => CAR_STATUS_LABELS[status || ""] || status || "Chưa xác định"

const USER_STATUS_LABELS: Record<User["status"], string> = {
  active: "Hoạt động",
  inactive: "Đã khoá",
}

const normalizeStatus = (status?: string) => (status || "").toLowerCase().replace("canceled", "cancelled")

// Chuyển Timestamp / Date / chuỗi / số về Date (null nếu không hợp lệ)
const toDate = (value: any): Date | null => {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value?.toDate === "function") return value.toDate()
  if (typeof value === "object" && typeof value.seconds === "number") return new Date(value.seconds * 1000)
  if (typeof value === "string" || typeof value === "number") {
    // Hỗ trợ cả dạng "dd/mm/yyyy"
    if (typeof value === "string") {
      const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
    }
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

const formatAnyDate = (value: any, format = "short") => {
  const d = toDate(value)
  return d ? formatDate(d, format) : ""
}

const avatarFor = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=1054CF&color=fff`

// Nhận diện chuỗi giá kiểu "1.200.000" / "1 200 000" / "1200000"
const parsePriceInput = (value: string): number => {
  const trimmed = (value || "").trim()
  if (/^\d{1,3}([.,\s]\d{3})+$/.test(trimmed)) return Number(trimmed.replace(/[.,\s]/g, ""))
  return Number(trimmed)
}

const screenWidth = Dimensions.get("window").width
// Chiều rộng biểu đồ = màn hình - lề màn hình - padding thẻ - viền thẻ
const chartWidth = screenWidth - SPACE.screen * 2 - SPACE.lg * 2 - 2
const chartConfig = {
  backgroundColor: THEME_COLORS.surface,
  backgroundGradientFrom: THEME_COLORS.surface,
  backgroundGradientTo: THEME_COLORS.surface,
  color: (opacity = 1) => `rgba(16, 84, 207, ${opacity})`, // primary #1054CF
  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`, // textMuted #94A3B8
  strokeWidth: 2,
  barPercentage: 0.6,
  propsForLabels: {
    fontSize: 11,
  },
  propsForBackgroundLines: {
    stroke: THEME_COLORS.border,
    strokeDasharray: "4 6",
  },
  propsForDots: {
    r: "4",
    strokeWidth: "2",
    stroke: THEME_COLORS.surface,
  },
}

// Cặp màu nền soft + chữ đậm cho badge trạng thái (đơn: cùng tông với BookingStatusBadge)
const TONES = {
  success: { bg: THEME_COLORS.successSoft, fg: THEME_COLORS.success },
  danger: { bg: THEME_COLORS.dangerSoft, fg: THEME_COLORS.danger },
  warning: { bg: THEME_COLORS.warningSoft, fg: THEME_COLORS.warning },
  primary: { bg: THEME_COLORS.primarySoft, fg: THEME_COLORS.primary },
  neutral: { bg: THEME_COLORS.surfaceMuted, fg: THEME_COLORS.textSecondary },
}
type Tone = keyof typeof TONES

const getBookingTone = (status?: string): Tone => {
  switch (normalizeStatus(status)) {
    case "cancelled":
    case "rejected":
      return "danger"
    case "pending":
      return "warning"
    case "confirmed":
    case "upcoming":
      return "primary"
    case "active":
    case "completed":
      return "success"
    default:
      return "neutral"
  }
}

const getCarTone = (status?: string): Tone => {
  switch (status) {
    case "Available":
      return "success"
    case "Rented":
      return "primary"
    case "Maintenance":
      return "warning"
    default:
      return "neutral"
  }
}

// Biên bản giao xe / nhận lại xe (G4)
const emptyInspectionForm = {
  documentsChecked: false,
  depositCollected: false,
  rentCollected: false, // đơn trả tiền mặt khi nhận xe (G7)
  conditionNote: "",
  odometer: "",
  fuelLevel: "",
  damageNote: "",
  extraFees: "",
  compensations: [] as CompensationInput[],
}

const emptyCarForm = {
  name: "",
  brand: "",
  price: "",
  type: "",
  fuel: "",
  seats: "",
  year: "",
  carImage: "", // data URI admin tải lên
  imageKey: "", // ảnh có sẵn (xe mẫu)
  licensePlate: "",
  transmission: "Số tự động" as Transmission,
  deposit: "",
  description: "",
  amenities: [] as string[],
  status: "Available" as CarStatus,
  // Thông số kỹ thuật (G9), nhập dạng chuỗi trước khi lưu
  engine: "",
  power: "",
  fuelConsumption: "",
  airbags: "",
  color: "",
  odometer: "",
  trunkCapacity: "",
}

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState("cars")
  const [showAddCarForm, setShowAddCarForm] = useState(false)
  const [newCar, setNewCar] = useState(emptyCarForm)
  const [editingCarId, setEditingCarId] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const { cars, loading: carsLoading } = useCars()
  const [inspection, setInspection] = useState<{ bookingId: string; kind: "handover" | "return" } | null>(null)
  const [inspectionForm, setInspectionForm] = useState(emptyInspectionForm)
  const [inspectionSubmitting, setInspectionSubmitting] = useState(false)
  const { user: authUser, loading: authLoading } = useAuth()
  const isAdmin = authUser?.isAdmin === true
  // Nhân viên (users.role "staff", G7) vào được trang quản trị nhưng không thấy tab Người dùng
  const isStaff = !isAdmin && authUser?.role === "staff"
  const canManage = isAdmin || isStaff
  const visibleTabs = isAdmin ? adminTabs : adminTabs.filter((tab) => tab.id !== "users")
  const { licenses, loading: licensesLoading } = useAllLicenses(canManage)
  const { reviews, loading: reviewsLoading } = useAllReviews(canManage)
  const [reviewFilter, setReviewFilter] = useState("all")
  const { tickets, loading: ticketsLoading } = useAllTickets(canManage)
  const [ticketFilter, setTicketFilter] = useState("open")
  const [replyTicketId, setReplyTicketId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replying, setReplying] = useState(false)
  const { carTypes } = useCarTypes()
  const [newTypeName, setNewTypeName] = useState("")
  const [addingType, setAddingType] = useState(false)
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  const [bookings, setBookings] = useState<Booking[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loaded, setLoaded] = useState({ cars: false, bookings: false, users: false })

  const [bookingFilter, setBookingFilter] = useState("all")
  const [bookingSearch, setBookingSearch] = useState("")
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  // Từ chối đơn Pending (modal nhập lý do)
  const [rejectBookingId, setRejectBookingId] = useState<string | null>(null)
  const [bookingRejectReason, setBookingRejectReason] = useState("")
  const [bookingRejecting, setBookingRejecting] = useState(false)

  const [userSearch, setUserSearch] = useState("")
  const [userFilter, setUserFilter] = useState("all")
  const [showUserFilters, setShowUserFilters] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [rejectLicenseId, setRejectLicenseId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [licenseProcessingId, setLicenseProcessingId] = useState<string | null>(null)

  // Ô nhập đang focus (để áp UI.inputFocused)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  // Add these animation states at the top of AdminScreen
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  // Add this animation effect
  useEffect(() => {
    // Reset animations when tab changes
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.9);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab]); // Add activeTab as dependency to re-run animation on tab change

  // Chỉ quản trị viên (users/{uid}.isAdmin) hoặc nhân viên (role "staff") mới vào được trang quản trị
  useEffect(() => {
    if (!authLoading && !canManage) router.replace("/login")
  }, [authLoading, canManage])

  // Đơn đặt xe (collection `bookings`)
  useEffect(() => {
    if (!canManage) return
    const unsubscribe = onSnapshot(
      collection(db, "bookings"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const b = d.data()
          return {
            ...b,
            id: d.id,
            userId: b.userId || "",
            carId: b.carId != null ? String(b.carId) : "",
            carName: b.carName || "Xe không rõ",
            carImage: b.carImage,
            duration: Number(b.duration) || 0,
            location: b.location || "",
            status: b.status || "",
            price: Number(b.price) || 0,
            selectedAddOns: Array.isArray(b.selectedAddOns) ? b.selectedAddOns : [],
            createdAt: toDate(b.createdAt),
            pickupDate: b.pickupDate ?? null,
            cancelledAt: toDate(b.cancelledAt),
            payment: b.payment && typeof b.payment === "object" ? b.payment : null,
          } as Booking
        })
        data.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        setBookings(data)
        setLoaded((prev) => ({ ...prev, bookings: true }))
      },
      (error) => {
        console.error("Error loading bookings:", error)
        setLoaded((prev) => ({ ...prev, bookings: true }))
      }
    )
    return () => unsubscribe()
  }, [canManage])

  // Người dùng (collection `users`)
  useEffect(() => {
    if (!canManage) return
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const u = d.data()
          const name = u.fullName || u.name || u.displayName || (u.email ? String(u.email).split("@")[0] : "Người dùng")
          const locked = u.disabled === true || normalizeStatus(u.status) === "inactive"
          return {
            id: d.id,
            name,
            email: u.email || "",
            phone: u.phone || "",
            joinDate: toDate(u.createdAt),
            status: locked ? "inactive" : "active",
            isAdmin: u.isAdmin === true,
            role: u.role === "staff" ? "staff" : undefined,
            avatar: u.avatar || avatarFor(name),
          } as User
        })
        data.sort((a, b) => (b.joinDate?.getTime() || 0) - (a.joinDate?.getTime() || 0))
        setUsers(data)
        setLoaded((prev) => ({ ...prev, users: true }))
      },
      (error) => {
        console.error("Error loading users:", error)
        setLoaded((prev) => ({ ...prev, users: true }))
      }
    )
    return () => unsubscribe()
  }, [canManage])

  const usersById = useMemo(() => {
    const map: Record<string, User> = {}
    users.forEach((u) => { map[u.id] = u })
    return map
  }, [users])

  const pendingLicenses = useMemo(
    () => licenses.filter((license) => license.status === "pending"),
    [licenses],
  )

  const bookingCountByUser = useMemo(() => {
    const map: Record<string, number> = {}
    bookings.forEach((b) => { if (b.userId) map[b.userId] = (map[b.userId] || 0) + 1 })
    return map
  }, [bookings])

  const getCustomerName = (booking: Booking) => usersById[booking.userId]?.name || "Khách hàng không xác định"

  const getCustomerAvatar = (booking: Booking) => usersById[booking.userId]?.avatar || avatarFor(getCustomerName(booking))

  // Ảnh xe của đơn: theo xe trên Firestore; đơn cũ có thể còn carImage dạng chuỗi (URL / data URI)
  const getBookingImageSource = (booking: Booking): any => {
    const car = cars.find((c) => c.id === booking.carId)
    if (car) return getCarImage(car)
    if (typeof booking.carImage === "string" && booking.carImage) return { uri: booking.carImage }
    return null
  }

  const isPaid = (booking: Booking) => PAID_STATUSES.includes(normalizeStatus(booking.status))

  // "pending" = tiền mặt chờ thu khi giao xe (G7); "unpaid" = chưa có giao dịch
  const getPaymentStatusKey = (booking: Booking): "paid" | "pending" | "unpaid" | "refunded" | "failed" => {
    const paymentStatus = normalizeStatus(booking.payment?.status)
    if (paymentStatus === "refunded") return "refunded"
    if (paymentStatus === "failed") return "failed"
    if (paymentStatus === "pending") return "pending"
    if (booking.payment || isPaid(booking)) return "paid"
    return "unpaid"
  }

  const getPaymentTone = (key?: string): Tone => {
    const k = normalizeStatus(key)
    if (k === "paid" || k === "completed") return "success"
    if (k === "pending" || k === "unpaid") return "warning"
    return "danger"
  }

  // ===== Thanh toán (U7.5) =====
  const paymentRows = useMemo(() => listPayments(bookings as any), [bookings])
  const paymentSummary = useMemo(() => summarizePayments(paymentRows), [paymentRows])
  const filteredPayments = paymentRows.filter(
    (r) =>
      (paymentFilter === "all" || normalizeStatus(r.status) === paymentFilter) &&
      (paymentMethodFilter === "all" || r.method === paymentMethodFilter),
  )

  // ===== Số liệu thống kê =====
  const stats = useMemo(() => {
    const now = new Date()
    // Doanh thu (L4.3) = tiền thuê đã thanh toán − tiền hoàn + phí phát sinh khi trả xe
    const paidBookings = bookings.filter((b) => bookingRevenue(b as any) !== 0)
    const revenueDate = (b: Booking) => toDate(b.payment?.paidAt) || b.createdAt
    const totalRevenue = paidBookings.reduce((sum, b) => sum + bookingRevenue(b as any), 0)
    const monthRevenue = paidBookings
      .filter((b) => {
        const d = revenueDate(b)
        return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((sum, b) => sum + bookingRevenue(b as any), 0)

    // Doanh thu 6 tháng gần nhất (triệu đồng)
    const months: { key: number; label: string; value: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: d.getFullYear() * 12 + d.getMonth(), label: `T${d.getMonth() + 1}`, value: 0 })
    }
    paidBookings.forEach((b) => {
      const d = revenueDate(b)
      if (!d) return
      const month = months.find((m) => m.key === d.getFullYear() * 12 + d.getMonth())
      if (month) month.value += bookingRevenue(b as any)
    })
    const revenueByMonth = months.map((m) => ({ label: m.label, value: Math.round(m.value / 100000) / 10 }))

    // Số xe theo loại (các xe đang hiển thị ở tab Quản lý xe)
    const typeCounts: Record<string, number> = {}
    cars.forEach((c) => {
      const type = (c.type || "").trim() || "Khác"
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })
    const carsByType = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label: label.length > 9 ? `${label.slice(0, 8)}…` : label, value }))

    return {
      totalCars: cars.length,
      totalBookings: bookings.length,
      activeBookings: bookings.filter((b) => normalizeStatus(b.status) === "active").length,
      totalRevenue,
      monthRevenue,
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.status === "active").length,
      revenueByMonth,
      carsByType,
    }
  }, [bookings, cars, users])

  const filteredBookings = useMemo(() => {
    const q = bookingSearch.trim().toLowerCase()
    return bookings.filter((b) => {
      if (bookingFilter !== "all" && normalizeStatus(b.status) !== bookingFilter) return false
      if (!q) return true
      const customer = (usersById[b.userId]?.name || "").toLowerCase()
      return b.carName.toLowerCase().includes(q) || customer.includes(q) || b.id.toLowerCase().includes(q)
    })
  }, [bookings, bookingFilter, bookingSearch, usersById])

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    return users.filter((u) => {
      if (userFilter === "active" && u.status !== "active") return false
      if (userFilter === "inactive" && u.status !== "inactive") return false
      if (userFilter === "admin" && !u.isAdmin) return false
      if (userFilter === "staff" && getUserRole(u) !== "staff") return false
      if (!q) return true
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.phone || "").toLowerCase().includes(q)
      )
    })
  }, [users, userFilter, userSearch])

  const selectedBooking = selectedBookingId ? bookings.find((b) => b.id === selectedBookingId) || null : null
  const selectedUser = selectedUserId ? usersById[selectedUserId] || null : null

  // Add this type for form validation
  interface FormErrors {
    [key: string]: string;
  }

  // Kiểm tra dữ liệu form thêm/sửa xe
  const validateCarData = (data: typeof newCar): FormErrors => {
    const errors: FormErrors = {};
    const currentYear = new Date().getFullYear();

    if (!data.name.trim()) errors.name = "Vui lòng nhập tên xe";
    else if (data.name.trim().length > 60) errors.name = "Tên xe tối đa 60 ký tự";

    if (!data.brand.trim()) errors.brand = "Vui lòng nhập hãng xe";

    const price = parsePriceInput(data.price);
    if (!data.price.trim()) {
      errors.price = "Vui lòng nhập giá thuê";
    } else if (!Number.isFinite(price) || price <= 0) {
      errors.price = "Giá thuê phải là số dương (VND)";
    } else if (!Number.isInteger(price)) {
      errors.price = "Giá thuê phải là số nguyên (VND), không có phần thập phân";
    } else if (price < 100000) {
      errors.price = "Giá thuê tối thiểu là 100.000đ/ngày";
    } else if (price > 100000000) {
      errors.price = "Giá thuê tối đa là 100.000.000đ/ngày";
    }

    const seats = Number(data.seats.trim());
    if (!data.seats.trim() || !Number.isInteger(seats)) {
      errors.seats = "Vui lòng nhập số chỗ hợp lệ";
    } else if (seats < 2 || seats > 50) {
      errors.seats = "Số chỗ phải từ 2 đến 50";
    }

    if (data.year.trim()) {
      const year = Number(data.year.trim());
      if (!Number.isInteger(year) || year < 1990 || year > currentYear + 1) {
        errors.year = `Năm sản xuất phải từ 1990 đến ${currentYear + 1}`;
      }
    }

    if (!data.carImage && !data.imageKey) errors.carImage = "Vui lòng thêm ảnh xe";

    if (data.deposit.trim()) {
      const deposit = parsePriceInput(data.deposit);
      if (!Number.isInteger(deposit) || deposit < 0) errors.deposit = "Tiền cọc phải là số nguyên không âm (VND)";
    }

    return errors;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      showAlert('Cần cấp quyền', 'Vui lòng cho phép truy cập thư viện ảnh để tải ảnh xe lên.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setNewCar(prev => ({ ...prev, carImage: base64Image, imageKey: "" }));
      setFormErrors(prev => ({ ...prev, carImage: "" }));
    }
  };

  const updateField = <K extends keyof typeof emptyCarForm>(field: K, value: (typeof emptyCarForm)[K]) => {
    setNewCar(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: "" }))
  }

  const closeCarForm = () => {
    setShowAddCarForm(false)
    setEditingCarId(null)
    setNewCar(emptyCarForm)
    setFormErrors({})
  }

  const openAddCarForm = () => {
    if (showAddCarForm && !editingCarId) {
      closeCarForm()
      return
    }
    setEditingCarId(null)
    setNewCar(emptyCarForm)
    setFormErrors({})
    setShowAddCarForm(true)
  }

  const openEditCarForm = (car: Car) => {
    setEditingCarId(car.id)
    setNewCar({
      name: car.name || "",
      brand: car.brand || "",
      price: car.pricePerDay ? String(car.pricePerDay) : "",
      type: car.type || "",
      fuel: car.fuel || "",
      seats: car.seats ? String(car.seats) : "",
      year: car.year ? String(car.year) : "",
      carImage: car.image || "",
      imageKey: car.imageKey || "",
      licensePlate: car.licensePlate || "",
      transmission: car.transmission || "Số tự động",
      deposit: car.deposit ? String(car.deposit) : "",
      description: car.description || "",
      amenities: car.amenities || [],
      status: car.status || "Available",
      engine: car.engine || "",
      power: car.power != null ? String(car.power) : "",
      fuelConsumption: car.fuelConsumption || "",
      airbags: car.airbags != null ? String(car.airbags) : "",
      color: car.color || "",
      odometer: car.odometer != null ? String(car.odometer) : "",
      trunkCapacity: car.trunkCapacity != null ? String(car.trunkCapacity) : "",
    })
    setFormErrors({})
    setShowAddCarForm(true)
  }

  // Thêm xe mới hoặc lưu thay đổi khi đang sửa
  const handleSaveCar = async () => {
    if (isSubmitting) return;

    const errors = validateCarData(newCar);
    setFormErrors(errors);
    const messages = Object.values(errors).filter(Boolean);
    if (messages.length > 0) {
      showAlert('Thông tin chưa hợp lệ', messages.join('\n'));
      return;
    }

    setIsSubmitting(true);

    try {
      const carFields: { [key: string]: any } = {
        name: newCar.name.trim(),
        brand: newCar.brand.trim(),
        pricePerDay: parsePriceInput(newCar.price),
        type: newCar.type.trim() || 'Chưa xác định',
        fuel: newCar.fuel.trim() || 'Chưa xác định',
        seats: Number(newCar.seats.trim()),
        licensePlate: newCar.licensePlate.trim().toUpperCase(),
        transmission: newCar.transmission,
        deposit: newCar.deposit.trim() ? parsePriceInput(newCar.deposit) : 0,
        description: newCar.description.trim(),
        amenities: newCar.amenities,
        status: newCar.status,
        imageKey: newCar.imageKey,
        engine: newCar.engine.trim(),
        fuelConsumption: newCar.fuelConsumption.trim(),
        color: newCar.color.trim(),
      };
      if (newCar.carImage) carFields.image = newCar.carImage;
      // Số nguyên không âm; để trống thì không ghi
      for (const key of ["power", "airbags", "odometer", "trunkCapacity"] as const) {
        const n = parsePriceInput(newCar[key]);
        if (newCar[key].trim() && Number.isInteger(n) && n >= 0) carFields[key] = n;
      }
      if (newCar.year.trim()) carFields.year = Number(newCar.year.trim());

      if (editingCarId) {
        await updateDoc(doc(db, 'cars', editingCarId), {
          ...carFields,
          updatedAt: new Date().toISOString(),
        });
        showAlert('Thành công', 'Đã cập nhật thông tin xe!');
      } else {
        await addDoc(collection(db, 'cars'), {
          ...carFields,
          createdAt: new Date().toISOString(),
          bookings: 0,
          rating: 0,
          reviewCount: 0,
        });
        showAlert('Thành công', 'Đã thêm xe mới!');
      }

      closeCarForm();
    } catch (error: any) {
      console.error('Error saving car:', error);
      showAlert(
        'Lỗi',
        editingCarId
          ? 'Không thể cập nhật xe. Vui lòng kiểm tra kết nối mạng và thử lại.'
          : 'Không thể thêm xe. Vui lòng kiểm tra kết nối mạng và thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteCar = (car: Car) => {
    confirmDialog("Xoá xe", `Bạn có chắc muốn xoá xe "${car.name}"? Thao tác này không thể hoàn tác.`, "Xoá", async () => {
      try {
        await deleteCar(car.id)
        if (editingCarId === car.id) closeCarForm()
        showAlert("Thành công", "Đã xoá xe.")
      } catch (error: any) {
        console.error("Error deleting car:", error)
        showAlert("Không thể xoá xe", error?.message || "Vui lòng thử lại.")
      }
    }, { destructive: true })
  }

  const handleSeedCars = async () => {
    if (isSeeding) return
    setIsSeeding(true)
    try {
      const added = await seedCars()
      showAlert("Nạp dữ liệu xe mẫu", added > 0 ? `Đã thêm ${added} xe mẫu.` : "Tất cả xe mẫu đã có sẵn.")
    } catch (error) {
      console.error("Error seeding cars:", error)
      showAlert("Lỗi", "Không thể nạp dữ liệu xe mẫu. Vui lòng thử lại.")
    } finally {
      setIsSeeding(false)
    }
  }

  // ===== Thao tác với đơn đặt xe =====
  // Đơn chưa giao xe mới huỷ được (D5); admin huỷ thì hoàn 100% nếu khách đã thanh toán
  const canCancel = (booking: Booking) => ["pending", "confirmed", "upcoming"].includes(normalizeStatus(booking.status))
  const canDecide = (booking: Booking) => normalizeStatus(booking.status) === "pending"

  const handleCancelBooking = (booking: Booking) => {
    const refund = previewRefund(booking as any, "admin")
    confirmDialog(
      "Huỷ đơn",
      `Bạn có chắc muốn huỷ đơn ${booking.carName} của ${getCustomerName(booking)}?` +
        (refund.amount > 0 ? `\n\nKhách sẽ được hoàn ${formatCurrency(refund.amount)} (100%).` : ""),
      "Huỷ đơn",
      async () => {
        try {
          await cancelBooking(booking.id, "admin")
          showAlert("Thành công", "Đã huỷ đơn đặt xe.")
        } catch (error: any) {
          console.error("Error cancelling booking:", error)
          showAlert("Không thể huỷ đơn", error?.message || "Vui lòng thử lại.")
        }
      },
      { destructive: true },
    )
  }

  // Pending → Confirmed (kiểm tra lại trùng lịch + GPLX đã xác minh)
  const handleConfirmBooking = (booking: Booking) => {
    confirmDialog(
      "Xác nhận đơn",
      `Xác nhận đơn ${booking.carName} của ${getCustomerName(booking)}? Khách sẽ được thông báo để thanh toán.`,
      "Xác nhận",
      async () => {
        try {
          await confirmBooking(booking.id)
          showAlert("Thành công", "Đã xác nhận đơn. Đơn chuyển sang Chờ thanh toán.")
        } catch (error: any) {
          console.error("Error confirming booking:", error)
          showAlert("Không thể xác nhận", error?.message || "Vui lòng thử lại.")
        }
      },
    )
  }

  // Pending → Rejected; U3.4 gọi từ modal nhập lý do. Trả về true nếu thành công.
  const handleRejectBooking = async (bookingId: string, reason: string) => {
    try {
      await rejectBooking(bookingId, reason)
      showAlert("Đã từ chối đơn", "Khách đã được thông báo kèm lý do.")
      return true
    } catch (error: any) {
      console.error("Error rejecting booking:", error)
      showAlert("Không thể từ chối", error?.message || "Vui lòng thử lại.")
      return false
    }
  }

  const openRejectBooking = (booking: Booking) => {
    setSelectedBookingId(null) // tránh chồng 2 Modal (iOS không mở được)
    setBookingRejectReason("")
    setRejectBookingId(booking.id)
  }

  const submitRejectBooking = async () => {
    if (!rejectBookingId || bookingRejecting) return
    setBookingRejecting(true)
    const ok = await handleRejectBooking(rejectBookingId, bookingRejectReason)
    setBookingRejecting(false)
    if (ok) setRejectBookingId(null)
  }

  // Upcoming → Active (biên bản giao xe), Active → Completed (biên bản nhận lại xe)
  const handleAdvanceBooking = (booking: Booking) => {
    const current = normalizeStatus(booking.status)
    if (current !== "upcoming" && current !== "active") return
    setSelectedBookingId(null) // tránh chồng 2 Modal (iOS không mở được)
    setInspectionForm(emptyInspectionForm)
    setInspection({ bookingId: booking.id, kind: current === "upcoming" ? "handover" : "return" })
  }

  const inspectionBooking = inspection ? bookings.find((b) => b.id === inspection.bookingId) ?? null : null
  const inspectionCar = inspectionBooking ? cars.find((c) => c.id === inspectionBooking.carId) ?? null : null
  const compensationPreview = calcCompensation(inspectionForm.compensations)
  const otherFeesPreview = parsePriceInput(inspectionForm.extraFees || "0") || 0
  // Phí trễ / hoàn cọc tự tính cho biên bản nhận lại xe (cùng công thức returnBooking)
  const returnPreview = inspectionBooking
    ? previewReturn(inspectionBooking as any, inspectionCar, compensationPreview.total + otherFeesPreview)
    : null

  const updateInspection = <K extends keyof typeof emptyInspectionForm>(field: K, value: (typeof emptyInspectionForm)[K]) =>
    setInspectionForm((prev) => ({ ...prev, [field]: value }))

  const toggleCompensation = (policyId: string) => {
    setInspectionForm((prev) => {
      const selected = prev.compensations.some((item) => item.id === policyId)
      const policy = COMPENSATION_POLICY.find((item) => item.id === policyId)
      return {
        ...prev,
        compensations: selected
          ? prev.compensations.filter((item) => item.id !== policyId)
          : [...prev.compensations, policy?.custom ? { id: policyId, amount: 0 } : { id: policyId, qty: 1 }],
      }
    })
  }

  const updateCompensation = (policyId: string, changes: Partial<CompensationInput>) => {
    setInspectionForm((prev) => ({
      ...prev,
      compensations: prev.compensations.map((item) => item.id === policyId ? { ...item, ...changes } : item),
    }))
  }

  const submitInspection = async () => {
    if (!inspection || inspectionSubmitting) return
    const f = inspectionForm
    setInspectionSubmitting(true)
    try {
      if (inspection.kind === "handover") {
        await handOverBooking(inspection.bookingId, {
          documentsChecked: f.documentsChecked,
          depositCollected: f.depositCollected,
          conditionNote: f.conditionNote,
          odometer: Number(f.odometer.trim()),
          fuelLevel: f.fuelLevel,
          ...(f.rentCollected ? { rentCollected: true } : {}), // Firestore không nhận undefined
        })
        showAlert("Đã giao xe", "Đơn chuyển sang Đang thuê, xe chuyển sang Đang cho thuê.")
      } else {
        const result = await returnBooking(inspection.bookingId, {
          odometer: Number(f.odometer.trim()),
          fuelLevel: f.fuelLevel,
          damageNote: f.damageNote,
          extraFees: parsePriceInput(f.extraFees || "0"),
          compensations: f.compensations,
        })
        showAlert(
          "Đã nhận lại xe",
          `Đền bù: ${formatCurrency(compensationPreview.total)}\nPhí khác: ${formatCurrency(otherFeesPreview)}\nPhí trễ giờ: ${formatCurrency(result.lateFee)}\nHoàn cọc: ${formatCurrency(result.depositRefund)}` +
            (result.extraDue > 0 ? `\nKhách trả thêm: ${formatCurrency(result.extraDue)}` : ""),
        )
      }
      setInspection(null)
    } catch (error: any) {
      console.error("Error saving inspection:", error)
      showAlert("Chưa lưu được biên bản", error?.message || "Vui lòng thử lại.")
    } finally {
      setInspectionSubmitting(false)
    }
  }

  // ===== Loại xe (U7.2) =====
  const handleAddCarType = async () => {
    if (addingType) return
    setAddingType(true)
    try {
      await addCarType(newTypeName)
      setNewTypeName("")
    } catch (error: any) {
      showAlert("Không thể thêm loại xe", error?.message || "Vui lòng thử lại.")
    } finally {
      setAddingType(false)
    }
  }

  const handleDeleteCarType = (type: CarType) => {
    confirmDialog("Xoá loại xe", `Xoá loại xe "${type.name}"?`, "Xoá", async () => {
      try {
        await deleteCarType(type.id)
      } catch (error: any) {
        showAlert("Không thể xoá loại xe", error?.message || "Vui lòng thử lại.")
      }
    }, { destructive: true })
  }

  // ===== Phiếu hỗ trợ (U7.1) =====
  const openReplyTicket = (ticket: SupportTicket) => {
    setReplyText("")
    setReplyTicketId(ticket.id)
  }

  const submitReplyTicket = async () => {
    if (!replyTicketId || replying) return
    setReplying(true)
    try {
      await replyTicket(replyTicketId, replyText)
      setReplyTicketId(null)
      showAlert("Đã gửi phản hồi", "Khách hàng đã được thông báo.")
    } catch (error: any) {
      console.error("Error replying ticket:", error)
      showAlert("Không thể gửi phản hồi", error?.message || "Vui lòng thử lại.")
    } finally {
      setReplying(false)
    }
  }

  const getTicketCustomerName = (ticket: SupportTicket) =>
    usersById[ticket.userId]?.name || ticket.userEmail || "Khách hàng"

  // ===== Thao tác với người dùng =====
  // Gán / bỏ vai trò nhân viên (chỉ quản trị viên). U7.3 gọi từ modal chi tiết người dùng.
  const handleSetStaff = (user: User, staff: boolean) => {
    confirmDialog(
      staff ? "Gán vai trò nhân viên" : "Bỏ vai trò nhân viên",
      staff
        ? `${user.name} sẽ vào được trang quản trị (xe, đơn, GPLX, đánh giá) nhưng không quản lý người dùng.`
        : `${user.name} sẽ không vào được trang quản trị nữa.`,
      staff ? "Gán" : "Bỏ vai trò",
      async () => {
        try {
          await setUserRole(user.id, staff ? "staff" : null)
          showAlert("Thành công", staff ? "Đã gán vai trò nhân viên." : "Đã bỏ vai trò nhân viên.")
        } catch (error: any) {
          console.error("Error setting user role:", error)
          showAlert("Không thể đổi vai trò", error?.message || "Vui lòng thử lại.")
        }
      },
      { destructive: !staff },
    )
  }

  const handleToggleUserLock = (user: User) => {
    const locking = user.status === "active"
    confirmDialog(
      locking ? "Khoá tài khoản" : "Mở khoá tài khoản",
      locking
        ? `Khoá tài khoản ${user.name}? Người dùng sẽ được đánh dấu ngừng hoạt động.`
        : `Mở khoá tài khoản ${user.name}?`,
      locking ? "Khoá" : "Mở khoá",
      async () => {
        try {
          await updateDoc(doc(db, "users", user.id), {
            status: locking ? "inactive" : "active",
            disabled: locking,
            updatedAt: new Date(),
          })
          showAlert("Thành công", locking ? "Đã khoá tài khoản." : "Đã mở khoá tài khoản.")
        } catch (error) {
          console.error("Error updating user status:", error)
          showAlert("Lỗi", "Không thể cập nhật tài khoản. Vui lòng thử lại.")
        }
      },
      { destructive: locking },
    )
  }

  const handleVerifyLicense = async (uid: string) => {
    setLicenseProcessingId(uid)
    try {
      await verifyLicense(uid)
      showAlert("Đã duyệt GPLX", "Giấy phép lái xe của khách hàng đã được xác minh.")
    } catch (error: any) {
      showAlert("Không thể duyệt GPLX", error?.message || "Vui lòng thử lại.")
    } finally {
      setLicenseProcessingId(null)
    }
  }

  const handleRejectLicense = async () => {
    if (!rejectLicenseId) return
    setLicenseProcessingId(rejectLicenseId)
    try {
      await rejectLicense(rejectLicenseId, rejectReason)
      setRejectLicenseId(null)
      setRejectReason("")
      showAlert("Đã từ chối GPLX", "Lý do từ chối đã được gửi đến khách hàng.")
    } catch (error: any) {
      showAlert("Không thể từ chối GPLX", error?.message || "Vui lòng thử lại.")
    } finally {
      setLicenseProcessingId(null)
    }
  }

  // ===== Đánh giá (U5.4) =====
  const handleDeleteReview = (review: Review) => {
    const carName = cars.find((c) => c.id === review.carId)?.name || "xe đã xoá"
    confirmDialog(
      "Xoá đánh giá",
      `Xoá đánh giá ${review.rating} sao của ${review.userName || "khách hàng"} cho ${carName}? Điểm trung bình của xe sẽ được tính lại.`,
      "Xoá",
      async () => {
        setDeletingReviewId(review.id)
        try {
          await deleteReview(review.id)
          showAlert("Đã xoá đánh giá", "Điểm đánh giá của xe đã được cập nhật.")
        } catch (error: any) {
          console.error("Error deleting review:", error)
          showAlert("Không thể xoá đánh giá", error?.message || "Vui lòng thử lại.")
        } finally {
          setDeletingReviewId(null)
        }
      },
      { destructive: true },
    )
  }

  const renderBadge = (label: string, tone: Tone) => (
    <View style={[styles.statusBadge, { backgroundColor: TONES[tone].bg }]}>
      <Text style={[styles.statusText, { color: TONES[tone].fg }]} numberOfLines={1}>{label}</Text>
    </View>
  )

  const renderStatusBadge = (status: string) =>
    renderBadge(getBookingStatusLabel(status) || "Không rõ", getBookingTone(status))

  const renderEmpty = (icon: string, text: string) => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon as any} size={28} color={THEME_COLORS.textMuted} />
      </View>
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  )

  // Ô thống kê: icon tròn primarySoft, nhãn overline, số liệu lớn
  const renderStatCard = (icon: string, label: string, value: string | number, small = false) => (
    <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon as any} size={18} color={THEME_COLORS.primary} />
      </View>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
      <Text style={[styles.statNumber, small && styles.statNumberSmall]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Animated.View>
  )

  // Hàng thông tin: nhãn (caption) – giá trị (bodyStrong)
  const renderInfoRow = (label: string, value: string, valueStyle?: any) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]} numberOfLines={1}>{value}</Text>
    </View>
  )

  const getRentalPeriodText = (booking: Booking) => {
    const start = toDate(booking.pickupDate)
    if (start && booking.duration > 0) {
      const end = new Date(start.getTime() + booking.duration * 24 * 60 * 60 * 1000)
      return `${formatDate(start)} - ${formatDate(end)} (${booking.duration} ngày)`
    }
    if (typeof booking.pickupDate === "string" && booking.pickupDate) {
      return `Từ ${booking.pickupDate}${booking.duration ? ` · ${booking.duration} ngày` : ""}`
    }
    return booking.duration ? `${booking.duration} ngày` : "Chưa có"
  }

  // Props focus/blur cho ô nhập
  const focusProps = (field: string) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField((prev) => (prev === field ? null : prev)),
  })

  const inputStyle = (field: string, hasError = false): StyleProp<TextStyle> => [
    styles.input,
    focusedField === field && (styles.inputFocused as TextStyle),
    hasError && styles.inputError,
  ]

  const renderCarCard = (car: Car) => (
    <View key={car.id} style={styles.carCard}>
      <View style={styles.carImageWrap}>
        {car.image || car.imageKey ? (
          <Image
            source={getCarImage(car)}
            style={styles.carImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="car-outline" size={36} color={THEME_COLORS.textMuted} />
        )}
      </View>
      <View style={styles.carInfo}>
        <View style={styles.cardTitleRow}>
          <View style={styles.flex1}>
            <Text style={styles.carName} numberOfLines={1}>{car.name}</Text>
            <Text style={styles.carBrand} numberOfLines={1}>{car.brand}{car.year ? ` · ${car.year}` : ""}</Text>
          </View>
          {renderBadge(getCarStatusLabel(car.status), getCarTone(car.status))}
        </View>
        <Text style={styles.carPrice}>{formatCurrency(car.pricePerDay)}/ngày</Text>

        <View style={styles.infoBlock}>
          {renderInfoRow("Loại xe", car.type)}
          {renderInfoRow("Số chỗ", String(car.seats))}
          {renderInfoRow("Nhiên liệu", car.fuel)}
          {renderInfoRow("Biển số", car.licensePlate || "Chưa cập nhật")}
          {renderInfoRow("Lượt đặt", String(car.bookings ?? 0))}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.smallButton, styles.smallSecondaryButton]}
            onPress={() => openEditCarForm(car)}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons name="pencil-outline" size={16} color={THEME_COLORS.textPrimary} />
            <Text style={styles.smallSecondaryText}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.smallDangerButton]}
            onPress={() => handleDeleteCar(car)}
            activeOpacity={PRESS_OPACITY}
          >
            <Ionicons name="trash-outline" size={16} color={THEME_COLORS.danger} />
            <Text style={styles.smallDangerText}>Xoá</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFieldError = (field: string) =>
    formErrors[field] ? <Text style={styles.fieldError}>{formErrors[field]}</Text> : null

  const renderCarTypes = () => (
    <View style={styles.typesCard}>
      <Text style={styles.licensesOverline}>Danh mục</Text>
      <Text style={styles.typesTitle}>Loại xe</Text>
      {carTypes.length === 0 ? (
        <Text style={styles.fieldHint}>Chưa có loại xe nào. Nạp xe mẫu hoặc thêm loại xe bên dưới.</Text>
      ) : (
        <View style={styles.choiceRow}>
          {carTypes.map((type) => {
            const count = cars.filter((c) => c.type === type.name).length
            return (
              <View key={type.id} style={styles.typeChip}>
                <Text style={styles.choiceChipText}>{type.name}</Text>
                <Text style={styles.typeCount}>{count} xe</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteCarType(type)}
                  accessibilityRole="button"
                  accessibilityLabel={`Xoá loại xe ${type.name}`}
                  hitSlop={8}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="close-circle" size={18} color={THEME_COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      )}
      <View style={styles.typeAddRow}>
        <TextInput
          style={[inputStyle("newType"), styles.flex1]}
          placeholder="Tên loại xe mới, VD: Bán tải"
          placeholderTextColor={THEME_COLORS.textMuted}
          value={newTypeName}
          onChangeText={setNewTypeName}
          onSubmitEditing={handleAddCarType}
          maxLength={30}
          returnKeyType="done"
          {...focusProps("newType")}
        />
        <TouchableOpacity
          style={[styles.addButton, styles.typeAddButton, (!newTypeName.trim() || addingType) && styles.disabledButton]}
          onPress={handleAddCarType}
          disabled={!newTypeName.trim() || addingType}
          activeOpacity={PRESS_OPACITY}
        >
          {addingType ? (
            <ActivityIndicator size="small" color={THEME_COLORS.textInverse} />
          ) : (
            <Text style={styles.addButtonText}>Thêm</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )

  // Chip loại xe trong form: danh sách carTypes + loại cũ của xe đang sửa (nếu đã bị xoá khỏi danh sách)
  const typeOptions = [
    ...carTypes.map((t) => t.name),
    ...(newCar.type && !carTypes.some((t) => t.name === newCar.type) ? [newCar.type] : []),
  ]

  const renderCarsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Quản lý xe</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddCarForm} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="add" size={20} color={THEME_COLORS.textInverse} />
          <Text style={styles.addButtonText}>Thêm xe</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Nạp dữ liệu xe mẫu"
        style={[styles.seedButton, isSeeding && styles.disabledButton]}
        onPress={handleSeedCars}
        disabled={isSeeding}
        activeOpacity={PRESS_OPACITY}
      >
        <View style={styles.seedIcon}>
          <Ionicons name="cloud-download-outline" size={22} color={THEME_COLORS.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.seedTitle}>{isSeeding ? "Đang nạp dữ liệu..." : "Nạp dữ liệu xe mẫu"}</Text>
          <Text style={styles.seedCaption}>Thêm các xe mẫu chưa có vào danh sách quản lý.</Text>
        </View>
        {isSeeding ? (
          <ActivityIndicator size="small" color={THEME_COLORS.primary} />
        ) : (
          <Ionicons name="arrow-forward" size={20} color={THEME_COLORS.primary} />
        )}
      </TouchableOpacity>

      {renderCarTypes()}

      {showAddCarForm && (
        <View style={styles.addCarForm}>
          <Text style={styles.formTitle}>{editingCarId ? "Sửa thông tin xe" : "Thêm xe mới"}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên xe *</Text>
            <TextInput
              style={inputStyle("name", !!formErrors.name)}
              placeholder="VD: BMW X5"
              placeholderTextColor={THEME_COLORS.textMuted}
              value={newCar.name}
              onChangeText={(text) => updateField("name", text)}
              {...focusProps("name")}
            />
            {renderFieldError("name")}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hãng xe *</Text>
            <TextInput
              style={inputStyle("brand", !!formErrors.brand)}
              placeholder="VD: BMW"
              placeholderTextColor={THEME_COLORS.textMuted}
              value={newCar.brand}
              onChangeText={(text) => updateField("brand", text)}
              {...focusProps("brand")}
            />
            {renderFieldError("brand")}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Giá thuê/ngày (VND) *</Text>
            <TextInput
              style={inputStyle("price", !!formErrors.price)}
              placeholder="VD: 1200000"
              placeholderTextColor={THEME_COLORS.textMuted}
              value={newCar.price}
              onChangeText={(text) => updateField("price", text)}
              keyboardType="numeric"
              {...focusProps("price")}
            />
            {renderFieldError("price")}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Loại xe</Text>
            {typeOptions.length === 0 ? (
              <Text style={styles.fieldHint}>Chưa có loại xe. Thêm loại xe ở khối "Loại xe" phía trên.</Text>
            ) : (
              <View style={styles.choiceRow}>
                {typeOptions.map((name) => {
                  const selected = newCar.type === name
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[styles.choiceChip, selected && styles.choiceChipActive]}
                      onPress={() => updateField("type", selected ? "" : name)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      activeOpacity={PRESS_OPACITY}
                    >
                      <Ionicons
                        name={selected ? "checkmark-circle" : "radio-button-off-outline"}
                        size={17}
                        color={selected ? THEME_COLORS.primary : THEME_COLORS.textMuted}
                      />
                      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nhiên liệu</Text>
            <TextInput
              style={inputStyle("fuel")}
              placeholder="VD: Xăng, Dầu diesel"
              placeholderTextColor={THEME_COLORS.textMuted}
              value={newCar.fuel}
              onChangeText={(text) => updateField("fuel", text)}
              {...focusProps("fuel")}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>Số chỗ ngồi *</Text>
              <TextInput
                style={inputStyle("seats", !!formErrors.seats)}
                placeholder="VD: 5"
                placeholderTextColor={THEME_COLORS.textMuted}
                value={newCar.seats}
                onChangeText={(text) => updateField("seats", text)}
                keyboardType="numeric"
                {...focusProps("seats")}
              />
              {renderFieldError("seats")}
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>Năm sản xuất</Text>
              <TextInput
                style={inputStyle("year", !!formErrors.year)}
                placeholder={`VD: ${new Date().getFullYear()}`}
                placeholderTextColor={THEME_COLORS.textMuted}
                value={newCar.year}
                onChangeText={(text) => updateField("year", text)}
                keyboardType="numeric"
                maxLength={4}
                {...focusProps("year")}
              />
              {renderFieldError("year")}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Biển số</Text>
            <TextInput
              style={inputStyle("licensePlate")}
              placeholder="VD: 51A-123.45"
              placeholderTextColor={THEME_COLORS.textMuted}
              value={newCar.licensePlate}
              onChangeText={(text) => updateField("licensePlate", text.toUpperCase())}
              autoCapitalize="characters"
              {...focusProps("licensePlate")}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hộp số</Text>
            <View style={styles.choiceRow}>
              {TRANSMISSIONS.map((transmission) => {
                const selected = newCar.transmission === transmission
                return (
                  <TouchableOpacity
                    key={transmission}
                    style={[styles.choiceChip, selected && styles.choiceChipActive]}
                    onPress={() => updateField("transmission", transmission)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Ionicons
                      name={selected ? "checkmark-circle" : "radio-button-off-outline"}
                      size={17}
                      color={selected ? THEME_COLORS.primary : THEME_COLORS.textMuted}
                    />
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{transmission}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tiền cọc (VND)</Text>
            <TextInput
              style={inputStyle("deposit", !!formErrors.deposit)}
              placeholder="VD: 5000000"
              placeholderTextColor={THEME_COLORS.textMuted}
              value={newCar.deposit}
              onChangeText={(text) => updateField("deposit", text)}
              keyboardType="numeric"
              {...focusProps("deposit")}
            />
            {renderFieldError("deposit")}
          </View>

          <Text style={styles.formSectionTitle}>Thông số kỹ thuật</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Động cơ</Text>
            <TextInput
              style={inputStyle("engine")}
              placeholder="VD: 2.0L Turbo"
              placeholderTextColor={THEME_COLORS.textMuted}
              value={newCar.engine}
              onChangeText={(text) => updateField("engine", text)}
              {...focusProps("engine")}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>Công suất (mã lực)</Text>
              <TextInput
                style={inputStyle("power")}
                placeholder="VD: 340"
                placeholderTextColor={THEME_COLORS.textMuted}
                value={newCar.power}
                onChangeText={(text) => updateField("power", text.replace(/\D/g, ""))}
                keyboardType="numeric"
                {...focusProps("power")}
              />
            </View>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>Số túi khí</Text>
              <TextInput
                style={inputStyle("airbags")}
                placeholder="VD: 6"
                placeholderTextColor={THEME_COLORS.textMuted}
                value={newCar.airbags}
                onChangeText={(text) => updateField("airbags", text.replace(/\D/g, ""))}
                keyboardType="numeric"
                {...focusProps("airbags")}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mức tiêu hao</Text>
            <TextInput
              style={inputStyle("fuelConsumption")}
              placeholder="VD: 6,8 L/100km"
              placeholderTextColor={THEME_COLORS.textMuted}
              value={newCar.fuelConsumption}
              onChangeText={(text) => updateField("fuelConsumption", text)}
              {...focusProps("fuelConsumption")}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Màu xe</Text>
            <TextInput
              style={inputStyle("color")}
              placeholder="VD: Trắng ngọc trai"
              placeholderTextColor={THEME_COLORS.textMuted}
              value={newCar.color}
              onChangeText={(text) => updateField("color", text)}
              {...focusProps("color")}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>Số km đã đi</Text>
              <TextInput
                style={inputStyle("odometer")}
                placeholder="VD: 18500"
                placeholderTextColor={THEME_COLORS.textMuted}
                value={newCar.odometer}
                onChangeText={(text) => updateField("odometer", text.replace(/\D/g, ""))}
                keyboardType="numeric"
                {...focusProps("odometer")}
              />
            </View>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>Dung tích cốp (lít)</Text>
              <TextInput
                style={inputStyle("trunkCapacity")}
                placeholder="VD: 650"
                placeholderTextColor={THEME_COLORS.textMuted}
                value={newCar.trunkCapacity}
                onChangeText={(text) => updateField("trunkCapacity", text.replace(/\D/g, ""))}
                keyboardType="numeric"
                {...focusProps("trunkCapacity")}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mô tả</Text>
            <TextInput
              style={[inputStyle("description"), styles.textArea]}
              placeholder="Mô tả nổi bật, trải nghiệm lái và mục đích sử dụng phù hợp..."
              placeholderTextColor={THEME_COLORS.textMuted}
              value={newCar.description}
              onChangeText={(text) => updateField("description", text)}
              multiline
              textAlignVertical="top"
              {...focusProps("description")}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tiện nghi</Text>
            <Text style={styles.fieldHint}>Bạn có thể chọn nhiều tiện nghi.</Text>
            <View style={styles.choiceRow}>
              {AMENITIES.map((amenity) => {
                const selected = newCar.amenities.includes(amenity)
                return (
                  <TouchableOpacity
                    key={amenity}
                    style={[styles.choiceChip, selected && styles.choiceChipActive]}
                    onPress={() => updateField(
                      "amenities",
                      selected
                        ? newCar.amenities.filter((item) => item !== amenity)
                        : [...newCar.amenities, amenity]
                    )}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Ionicons
                      name={selected ? "checkmark-circle" : "add-circle-outline"}
                      size={17}
                      color={selected ? THEME_COLORS.primary : THEME_COLORS.textMuted}
                    />
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{amenity}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Trạng thái</Text>
            <View style={styles.choiceRow}>
              {(Object.entries(CAR_STATUS_LABELS) as [CarStatus, string][]).map(([status, label]) => {
                const selected = newCar.status === status
                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.choiceChip, selected && styles.choiceChipActive]}
                    onPress={() => updateField("status", status)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <View style={[styles.statusDot, { backgroundColor: TONES[getCarTone(status)].fg }]} />
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ảnh xe *</Text>
            {newCar.carImage || newCar.imageKey ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={getCarImage({ image: newCar.carImage, imageKey: newCar.imageKey })}
                  style={styles.imagePreview}
                />
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={pickImage}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="image-outline" size={16} color={THEME_COLORS.textPrimary} />
                  <Text style={styles.changeImageText}>Đổi ảnh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadButton, formErrors.carImage ? styles.inputError : null]}
                onPress={pickImage}
                activeOpacity={PRESS_OPACITY}
              >
                <View style={styles.uploadIconWrap}>
                  <Ionicons name="cloud-upload-outline" size={22} color={THEME_COLORS.primary} />
                </View>
                <Text style={styles.uploadButtonText}>Tải ảnh lên</Text>
              </TouchableOpacity>
            )}
            {renderFieldError("carImage")}
          </View>

          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={closeCarForm} activeOpacity={PRESS_OPACITY}>
              <Text style={styles.cancelButtonText}>Huỷ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={handleSaveCar}
              disabled={isSubmitting}
              activeOpacity={PRESS_OPACITY}
            >
              <Text style={styles.submitButtonText}>
                {editingCarId
                  ? (isSubmitting ? "Đang lưu..." : "Lưu thay đổi")
                  : (isSubmitting ? "Đang thêm..." : "Thêm xe")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.carsList}>
        {carsLoading
          ? renderEmpty("hourglass-outline", "Đang tải danh sách xe...")
          : cars.length === 0
            ? renderEmpty("car-outline", "Chưa có xe nào. Bấm \"Thêm xe\" để thêm xe mới.")
            : cars.map((car) => renderCarCard(car))}
      </View>
    </View>
  )

  const renderFilterChips = (
    filters: { id: string; label: string }[],
    current: string,
    onSelect: (id: string) => void
  ) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
      {filters.map((f) => (
        <TouchableOpacity
          key={f.id}
          style={[styles.filterTab, current === f.id && styles.activeFilterTab]}
          onPress={() => onSelect(f.id)}
          activeOpacity={PRESS_OPACITY}
        >
          <Text style={[styles.filterTabText, current === f.id && styles.activeFilterTabText]}>{f.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )

  const renderSearchBox = (field: string, placeholder: string, value: string, onChange: (text: string) => void, extraStyle?: any) => (
    <View style={[styles.searchBox, focusedField === field && styles.inputFocused, extraStyle]}>
      <Ionicons
        name="search-outline"
        size={18}
        color={focusedField === field ? THEME_COLORS.primary : THEME_COLORS.textMuted}
      />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={THEME_COLORS.textMuted}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        {...focusProps(field)}
      />
    </View>
  )

  const renderBookingsTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, styles.tabTitleSpacing]}>Quản lý đơn đặt xe</Text>

      <View style={styles.statsGrid}>
        {renderStatCard("car-sport-outline", "Đơn đang thuê", stats.activeBookings)}
        {renderStatCard("receipt-outline", "Tổng số đơn", stats.totalBookings)}
        {renderStatCard("wallet-outline", "Doanh thu tháng này", formatCurrency(stats.monthRevenue), true)}
      </View>

      <View style={styles.bookingsFilter}>
        {renderSearchBox("bookingSearch", "Tìm theo tên xe, khách hàng, mã đơn...", bookingSearch, setBookingSearch)}
        {renderFilterChips(BOOKING_FILTERS, bookingFilter, setBookingFilter)}
      </View>

      <View style={styles.bookingsList}>
        {!loaded.bookings
          ? renderEmpty("hourglass-outline", "Đang tải đơn đặt xe...")
          : filteredBookings.length === 0
            ? <EmptyState image={bookings.length === 0 ? "bookings" : "results"} size={140} title={bookings.length === 0 ? "Chưa có đơn đặt xe nào." : "Không có đơn phù hợp."} />
            : filteredBookings.map(booking => {
          const imageSource = getBookingImageSource(booking)
          const paymentKey = getPaymentStatusKey(booking)
          const status = normalizeStatus(booking.status)
          const paymentTone = getPaymentTone(paymentKey)
          return (
          <Animated.View
            key={booking.id}
            style={[styles.bookingCard, { opacity: fadeAnim }]}
          >
            <View style={styles.bookingHeader}>
              {imageSource ? (
                <Image source={imageSource} style={styles.bookingCarImage} resizeMode="cover" />
              ) : (
                <View style={[styles.bookingCarImage, styles.imagePlaceholder]}>
                  <Ionicons name="car-outline" size={26} color={THEME_COLORS.textMuted} />
                </View>
              )}
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingCarName} numberOfLines={1}>{booking.carName}</Text>
                <View style={styles.customerInfo}>
                  <Image
                    source={{ uri: getCustomerAvatar(booking) }}
                    style={styles.customerAvatar}
                  />
                  <Text style={styles.customerName} numberOfLines={1}>{getCustomerName(booking)}</Text>
                </View>
                <Text style={styles.bookingCode} numberOfLines={1}>Mã đơn: {booking.id}</Text>
              </View>
              {renderStatusBadge(booking.status)}
            </View>

            <View style={styles.infoBlock}>
              {renderInfoRow("Ngày đặt", booking.createdAt ? formatDate(booking.createdAt) : "Chưa rõ ngày đặt")}
              {booking.duration ? renderInfoRow("Thời gian thuê", `${booking.duration} ngày`) : null}
              {renderInfoRow("Tổng cộng", formatCurrency(booking.price), styles.infoValuePrice)}
            </View>

            <View style={[styles.paymentStatus, { backgroundColor: TONES[paymentTone].bg }]}>
              <Ionicons
                name={paymentKey === 'paid' ? 'checkmark-circle' :
                      paymentKey === 'pending' || paymentKey === 'unpaid' ? 'time' : 'refresh-circle'}
                size={16}
                color={TONES[paymentTone].fg}
              />
              <Text style={[styles.paymentStatusText, { color: TONES[paymentTone].fg }]}>
                {getPaymentLabel(paymentKey)}
                {booking.payment?.method ? ` · ${booking.payment.method}` : ""}
              </Text>
            </View>

            {/* Đơn chờ xác nhận: quyết định ngay trên thẻ (từ chối thay cho huỷ để khách nhận được lý do) */}
            {canDecide(booking) && (
              <View style={styles.decisionRow}>
                <TouchableOpacity
                  style={[styles.smallButton, styles.smallDangerButton, styles.flex1]}
                  onPress={() => openRejectBooking(booking)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="close-circle-outline" size={16} color={THEME_COLORS.danger} />
                  <Text style={styles.smallDangerText}>Từ chối</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButton, styles.smallPrimaryButton, styles.flex1]}
                  onPress={() => handleConfirmBooking(booking)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={THEME_COLORS.textInverse} />
                  <Text style={styles.smallPrimaryText}>Xác nhận</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.smallButton, styles.smallSecondaryButton]}
                onPress={() => setSelectedBookingId(booking.id)}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons name="eye-outline" size={16} color={THEME_COLORS.textPrimary} />
                <Text style={styles.smallSecondaryText}>Xem chi tiết</Text>
              </TouchableOpacity>
              {(status === "upcoming" || status === "active") && (
                <TouchableOpacity
                  style={[styles.smallButton, styles.smallPrimaryButton]}
                  onPress={() => handleAdvanceBooking(booking)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name={status === "upcoming" ? "key-outline" : "return-down-back-outline"} size={16} color={THEME_COLORS.textInverse} />
                  <Text style={styles.smallPrimaryText}>{status === "upcoming" ? "Giao xe" : "Nhận lại xe"}</Text>
                </TouchableOpacity>
              )}
              {canCancel(booking) && !canDecide(booking) && (
                <TouchableOpacity
                  style={[styles.smallButton, styles.smallDangerButton]}
                  onPress={() => handleCancelBooking(booking)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Ionicons name="close-circle-outline" size={16} color={THEME_COLORS.danger} />
                  <Text style={styles.smallDangerText}>Huỷ đơn</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
          )
        })}
      </View>
    </View>
  )

  const renderPendingLicenses = () => (
    <View style={styles.licensesSection}>
      <View style={styles.licensesSectionHeader}>
        <View style={styles.flex1}>
          <Text style={styles.licensesOverline}>Xác minh hồ sơ</Text>
          <Text style={styles.licensesTitle}>GPLX chờ duyệt</Text>
        </View>
        <View style={styles.licenseCountBadge}>
          <Text style={styles.licenseCountText}>{pendingLicenses.length}</Text>
        </View>
      </View>

      {licensesLoading
        ? renderEmpty("hourglass-outline", "Đang tải giấy phép lái xe...")
        : pendingLicenses.length === 0
          ? renderEmpty("checkmark-circle-outline", "Không có GPLX nào đang chờ duyệt.")
          : pendingLicenses.map((license) => {
            const customer = usersById[license.userId]
            const processing = licenseProcessingId === license.userId
            return (
              <View key={license.userId} style={styles.licenseCard}>
                <View style={styles.licenseCustomerRow}>
                  <View style={styles.licenseIcon}>
                    <Ionicons name="card-outline" size={22} color={THEME_COLORS.primary} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.licenseCustomerName} numberOfLines={1}>
                      {customer?.name || "Khách hàng chưa cập nhật tên"}
                    </Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{customer?.email || license.userId}</Text>
                  </View>
                  {renderBadge("Chờ duyệt", "warning")}
                </View>

                <View style={styles.infoBlock}>
                  {renderInfoRow("Số GPLX", license.licenseNumber || "Chưa cập nhật")}
                  {renderInfoRow("Hạng", license.licenseClass || "Chưa cập nhật")}
                  {renderInfoRow("Có giá trị đến", formatAnyDate(license.expiryDate) || "Chưa cập nhật")}
                  {renderInfoRow("Nơi cấp", license.issuingAuthority || "Chưa cập nhật")}
                </View>

                <View style={styles.licenseImages}>
                  {[
                    { label: "Mặt trước", uri: license.frontImage },
                    { label: "Mặt sau", uri: license.backImage },
                  ].map((image) => (
                    <View key={image.label} style={styles.licenseImageColumn}>
                      <Text style={styles.licenseImageLabel}>{image.label}</Text>
                      {image.uri ? (
                        <Image source={{ uri: image.uri }} style={styles.licenseImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.licenseImage, styles.imagePlaceholder]}>
                          <Ionicons name="image-outline" size={24} color={THEME_COLORS.textMuted} />
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                <View style={styles.licenseActions}>
                  <TouchableOpacity
                    style={[styles.licenseActionButton, styles.licenseRejectButton, processing && styles.disabledButton]}
                    onPress={() => {
                      setRejectReason("")
                      setRejectLicenseId(license.userId)
                    }}
                    disabled={processing}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={THEME_COLORS.danger} />
                    <Text style={styles.licenseRejectText}>Từ chối</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.licenseActionButton, styles.licenseApproveButton, processing && styles.disabledButton]}
                    onPress={() => handleVerifyLicense(license.userId)}
                    disabled={processing}
                    activeOpacity={PRESS_OPACITY}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color={THEME_COLORS.textInverse} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color={THEME_COLORS.textInverse} />
                        <Text style={styles.licenseApproveText}>Duyệt</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
    </View>
  )

  const renderUsersTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, styles.tabTitleSpacing]}>Quản lý người dùng</Text>

      <View style={styles.statsGrid}>
        {renderStatCard("people-outline", "Tổng người dùng", stats.totalUsers)}
        {renderStatCard("pulse-outline", "Đang hoạt động", stats.activeUsers)}
        {renderStatCard("receipt-outline", "Tổng số đơn", stats.totalBookings)}
      </View>

      {renderPendingLicenses()}

      <View style={styles.userFilters}>
        {renderSearchBox("userSearch", "Tìm theo tên, email, số điện thoại...", userSearch, setUserSearch, styles.flex1)}
        <TouchableOpacity
          style={[styles.filterButton, (showUserFilters || userFilter !== "all") && styles.filterButtonActive]}
          onPress={() => setShowUserFilters(!showUserFilters)}
          activeOpacity={PRESS_OPACITY}
        >
          <Ionicons
            name="filter"
            size={18}
            color={(showUserFilters || userFilter !== "all") ? THEME_COLORS.primary : THEME_COLORS.textSecondary}
          />
          <Text style={[styles.filterButtonText, (showUserFilters || userFilter !== "all") && styles.filterButtonTextActive]}>Bộ lọc</Text>
        </TouchableOpacity>
      </View>

      {showUserFilters && (
        <View style={styles.userFilterChips}>
          {renderFilterChips(USER_FILTERS, userFilter, setUserFilter)}
        </View>
      )}

      <View style={styles.usersList}>
        {!loaded.users
          ? renderEmpty("hourglass-outline", "Đang tải người dùng...")
          : filteredUsers.length === 0
            ? users.length === 0
              ? renderEmpty("people-outline", "Chưa có người dùng nào.")
              : <EmptyState image="results" size={140} title="Không có người dùng phù hợp." />
            : filteredUsers.map(user => (
          <Animated.View
            key={user.id}
            style={[styles.userCard, { opacity: fadeAnim }]}
          >
            <View style={styles.userHeader}>
              <View style={[styles.userInfo, styles.flex1]}>
                <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                <View style={styles.flex1}>
                  <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                </View>
              </View>
              {renderBadge(USER_STATUS_LABELS[user.status], user.status === "active" ? "success" : "danger")}
            </View>

            <View style={styles.infoBlock}>
              {renderInfoRow("Vai trò", USER_ROLE_LABELS[getUserRole(user)])}
              {renderInfoRow("Số điện thoại", user.phone || "Chưa có số điện thoại")}
              {renderInfoRow("Ngày tham gia", user.joinDate ? formatDate(user.joinDate) : "Chưa rõ ngày tham gia")}
              {renderInfoRow("Đơn đặt xe", `${bookingCountByUser[user.id] || 0} đơn`)}
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.smallButton, styles.smallSecondaryButton]}
                onPress={() => setSelectedUserId(user.id)}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons name="eye-outline" size={16} color={THEME_COLORS.textPrimary} />
                <Text style={styles.smallSecondaryText}>Chi tiết</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallButton, user.status === "active" ? styles.smallDangerButton : styles.smallSuccessButton]}
                onPress={() => handleToggleUserLock(user)}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons
                  name={user.status === "active" ? "lock-closed-outline" : "lock-open-outline"}
                  size={16}
                  color={user.status === "active" ? THEME_COLORS.danger : THEME_COLORS.success}
                />
                <Text style={user.status === "active" ? styles.smallDangerText : styles.smallSuccessText}>
                  {user.status === "active" ? "Khoá" : "Mở khoá"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );

  const renderReviewsTab = () => {
    const starOf = (r: Review) => Math.round(Number(r.rating) || 0)
    const average = reviews.length ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length : 0
    const filters = [
      { id: "all", label: `Tất cả (${reviews.length})` },
      ...REVIEW_STARS.map((n) => ({ id: String(n), label: `${n} sao (${reviews.filter((r) => starOf(r) === n).length})` })),
    ]
    const visible = reviewFilter === "all" ? reviews : reviews.filter((r) => String(starOf(r)) === reviewFilter)
    return (
      <View style={styles.tabContent}>
        <Text style={[styles.tabTitle, styles.tabTitleSpacing]}>Quản lý đánh giá</Text>

        <View style={styles.statsGrid}>
          {renderStatCard("chatbubbles-outline", "Tổng đánh giá", reviews.length)}
          {renderStatCard("star-outline", "Điểm trung bình", reviews.length ? `${average.toFixed(1).replace(".", ",")} / 5` : "—")}
          {renderStatCard("alert-circle-outline", "Từ 2 sao trở xuống", reviews.filter((r) => starOf(r) <= 2).length)}
        </View>

        <View style={styles.bookingsFilter}>{renderFilterChips(filters, reviewFilter, setReviewFilter)}</View>

        <View style={styles.bookingsList}>
          {reviewsLoading
            ? renderEmpty("hourglass-outline", "Đang tải đánh giá...")
            : visible.length === 0
              ? <EmptyState image={reviews.length === 0 ? "reviews" : "results"} size={140} title={reviews.length === 0 ? "Chưa có đánh giá nào." : "Không có đánh giá phù hợp."} />
              : visible.map((review) => {
                  const car = cars.find((c) => c.id === review.carId)
                  const deleting = deletingReviewId === review.id
                  const hasBooking = bookings.some((b) => b.id === review.id)
                  return (
                    <Animated.View key={review.id} style={[styles.bookingCard, { opacity: fadeAnim }]}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>{(review.userName || "K").charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.flex1}>
                          <Text style={styles.bookingCarName} numberOfLines={1}>{review.userName || "Khách hàng"}</Text>
                          <Text style={styles.bookingCode}>{formatAnyDate(review.createdAt, "datetime")}</Text>
                        </View>
                        <View style={styles.reviewStars}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Ionicons key={n} name={n <= starOf(review) ? "star" : "star-outline"} size={14} color={THEME_COLORS.accent} />
                          ))}
                        </View>
                      </View>

                      <View style={styles.reviewCarRow}>
                        <Ionicons name="car-sport-outline" size={16} color={THEME_COLORS.textMuted} />
                        <Text style={styles.reviewCarName} numberOfLines={1}>{car?.name || "Xe đã bị xoá"}</Text>
                        {hasBooking ? <Text style={[styles.bookingCode, styles.shrink]} numberOfLines={1}>Mã đơn: {review.id}</Text> : null}
                      </View>

                      <Text style={review.comment ? styles.reviewComment : styles.reviewNoComment}>
                        {review.comment || "Không có nhận xét."}
                      </Text>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[styles.smallButton, styles.smallDangerButton, deleting && styles.disabledButton]}
                          onPress={() => handleDeleteReview(review)}
                          disabled={deleting}
                          activeOpacity={PRESS_OPACITY}
                        >
                          {deleting ? (
                            <ActivityIndicator size="small" color={THEME_COLORS.danger} />
                          ) : (
                            <Ionicons name="trash-outline" size={16} color={THEME_COLORS.danger} />
                          )}
                          <Text style={styles.smallDangerText}>Xoá đánh giá</Text>
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                  )
                })}
        </View>
      </View>
    )
  }

  const renderReportsTab = () => {
    const hasRevenue = stats.revenueByMonth.some((m) => m.value > 0)
    return (
    <Animated.View
      style={[styles.tabContent, { opacity: fadeAnim }]}
    >
      <Text style={[styles.tabTitle, styles.tabTitleSpacing]}>Báo cáo & Thống kê</Text>

      <View style={styles.statsGrid}>
        {renderStatCard("car-outline", "Tổng số xe", stats.totalCars)}
        {renderStatCard("receipt-outline", "Tổng số đơn", stats.totalBookings)}
        {renderStatCard("people-outline", "Người dùng", stats.totalUsers)}
        {renderStatCard("wallet-outline", "Tổng doanh thu", formatCurrency(stats.totalRevenue), true)}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartOverline}>Doanh thu</Text>
        <Text style={styles.chartTitle}>Doanh thu 6 tháng gần nhất (triệu đồng)</Text>
        {hasRevenue ? (
          <LineChart
            data={{
              labels: stats.revenueByMonth.map((m) => m.label),
              datasets: [{
                data: stats.revenueByMonth.map((m) => m.value)
              }]
            }}
            width={chartWidth}
            height={220}
            chartConfig={{ ...chartConfig, decimalPlaces: 1 }}
            yAxisSuffix="tr"
            fromZero
            bezier
            style={styles.chart}
          />
        ) : (
          renderEmpty("trending-up-outline", "Chưa có doanh thu trong 6 tháng gần nhất.")
        )}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartOverline}>Đội xe</Text>
        <Text style={styles.chartTitle}>Số xe theo loại</Text>
        {stats.carsByType.length > 0 ? (
          <BarChart
            data={{
              labels: stats.carsByType.map((t) => t.label),
              datasets: [{
                data: stats.carsByType.map((t) => t.value)
              }]
            }}
            width={chartWidth}
            height={220}
            yAxisLabel=""
            yAxisSuffix=" xe"
            chartConfig={{ ...chartConfig, decimalPlaces: 0, fillShadowGradientOpacity: 1 }}
            style={styles.chart}
            showValuesOnTopOfBars
            fromZero
          />
        ) : (
          renderEmpty("bar-chart-outline", "Chưa có xe nào để thống kê.")
        )}
      </View>
    </Animated.View>
    )
  };

  // ===== Tab Thanh toán (U7.5): giao dịch suy từ bookings =====
  const renderPaymentsTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, styles.tabTitleSpacing]}>Quản lý thanh toán</Text>

      <View style={styles.statsGrid}>
        {renderStatCard("wallet-outline", "Đã thu", formatCurrency(paymentSummary.totalPaid), true)}
        {renderStatCard("refresh-circle-outline", "Đã hoàn", formatCurrency(paymentSummary.totalRefunded), true)}
        {renderStatCard("cash-outline", "Chờ thu tiền mặt", formatCurrency(paymentSummary.pendingCash), true)}
        {renderStatCard("alert-circle-outline", "Giao dịch lỗi", paymentSummary.failedCount)}
      </View>

      <View style={styles.bookingsFilter}>
        {renderFilterChips(PAYMENT_FILTERS, paymentFilter, setPaymentFilter)}
        {renderFilterChips(PAYMENT_METHOD_FILTERS, paymentMethodFilter, setPaymentMethodFilter)}
      </View>

      <View style={styles.bookingsList}>
        {!loaded.bookings
          ? renderEmpty("hourglass-outline", "Đang tải giao dịch...")
          : filteredPayments.length === 0
            ? <EmptyState image={paymentRows.length === 0 ? "bookings" : "results"} size={140} title={paymentRows.length === 0 ? "Chưa có giao dịch nào." : "Không có giao dịch phù hợp."} />
            : filteredPayments.map((row) => {
                const status = normalizeStatus(row.status)
                const logoId = PAYMENT_LOGO_IDS[row.method]
                return (
                  <TouchableOpacity
                    key={row.bookingId}
                    style={styles.bookingCard}
                    onPress={() => setSelectedBookingId(row.bookingId)}
                    accessibilityRole="button"
                    activeOpacity={PRESS_OPACITY}
                  >
                    <View style={styles.bookingHeader}>
                      {logoId ? (
                        <PaymentLogo method={logoId} size={40} />
                      ) : (
                        <View style={styles.paymentIcon}>
                          <Ionicons name="cash-outline" size={20} color={THEME_COLORS.primary} />
                        </View>
                      )}
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingCarName} numberOfLines={1}>{row.carName || "Xe không rõ"}</Text>
                        <Text style={styles.customerName} numberOfLines={1}>
                          {usersById[row.userId]?.name || "Khách hàng không xác định"}
                        </Text>
                      </View>
                      {renderBadge(getPaymentLabel(row.status), getPaymentTone(row.status))}
                    </View>

                    <View style={styles.infoBlock}>
                      {renderInfoRow("Số tiền", formatCurrency(row.amount), styles.infoValuePrice)}
                      {renderInfoRow("Phương thức", row.method || "Chưa rõ")}
                      {renderInfoRow(
                        "Thời gian",
                        row.at ? formatDate(row.at, "datetime") : status === "pending" ? "Thu khi giao xe" : "Chưa rõ",
                      )}
                      {row.refundAmount > 0
                        ? renderInfoRow(
                            "Đã hoàn",
                            `${formatCurrency(row.refundAmount)}${row.refundedAt ? ` · ${formatDate(row.refundedAt)}` : ""}`,
                          )
                        : null}
                    </View>
                  </TouchableOpacity>
                )
              })}
      </View>
    </View>
  )

  // ===== Tab Hỗ trợ (U7.1) =====
  const renderSupportTab = () => {
    const countOf = (id: string) => (id === "all" ? tickets.length : tickets.filter((t) => t.status === id).length)
    const filters = TICKET_FILTERS.map((id) => ({
      id,
      label: `${id === "all" ? "Tất cả" : TICKET_STATUS_LABELS[id]} (${countOf(id)})`,
    }))
    const visible = ticketFilter === "all" ? tickets : tickets.filter((t) => t.status === ticketFilter)
    return (
      <View style={styles.tabContent}>
        <Text style={[styles.tabTitle, styles.tabTitleSpacing]}>Yêu cầu hỗ trợ</Text>

        <View style={styles.bookingsFilter}>{renderFilterChips(filters, ticketFilter, setTicketFilter)}</View>

        <View style={styles.bookingsList}>
          {ticketsLoading
            ? renderEmpty("hourglass-outline", "Đang tải yêu cầu hỗ trợ...")
            : visible.length === 0
              ? renderEmpty(
                  "chatbubbles-outline",
                  tickets.length === 0
                    ? "Chưa có yêu cầu hỗ trợ nào."
                    : ticketFilter === "open"
                      ? "Không còn yêu cầu nào đang chờ xử lý."
                      : "Không có yêu cầu phù hợp.",
                )
              : visible.map((ticket) => {
                  const name = getTicketCustomerName(ticket)
                  const resolved = ticket.status === "resolved"
                  const priority = ticket.priority || "medium"
                  return (
                    <View key={ticket.id} style={styles.bookingCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.flex1}>
                          <Text style={styles.bookingCarName} numberOfLines={1}>{name}</Text>
                          <Text style={styles.bookingCode}>{formatAnyDate(ticket.createdAt, "datetime")}</Text>
                        </View>
                        {renderBadge(TICKET_STATUS_LABELS[ticket.status] || ticket.status, resolved ? "success" : "warning")}
                      </View>

                      <View style={styles.ticketSubjectRow}>
                        <Text style={[styles.bookingCarName, styles.flex1]}>{ticket.subject}</Text>
                        {renderBadge(
                          `Ưu tiên ${(PRIORITY_LABELS[priority] || priority).toLowerCase()}`,
                          priority === "high" ? "danger" : priority === "low" ? "neutral" : "primary",
                        )}
                      </View>
                      <Text style={styles.reviewComment}>{ticket.message}</Text>

                      {resolved && ticket.reply ? (
                        <View style={styles.ticketReply}>
                          <Text style={styles.licensesOverline}>
                            Phản hồi của RENTO{ticket.repliedAt ? ` · ${formatAnyDate(ticket.repliedAt, "datetime")}` : ""}
                          </Text>
                          <Text style={styles.reviewComment}>{ticket.reply}</Text>
                        </View>
                      ) : (
                        <View style={styles.cardActions}>
                          <TouchableOpacity
                            style={[styles.smallButton, styles.smallPrimaryButton]}
                            onPress={() => openReplyTicket(ticket)}
                            activeOpacity={PRESS_OPACITY}
                          >
                            <Ionicons name="chatbubble-ellipses-outline" size={16} color={THEME_COLORS.textInverse} />
                            <Text style={styles.smallPrimaryText}>Trả lời</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )
                })}
        </View>
      </View>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "cars":
        return renderCarsTab()
      case "bookings":
        return renderBookingsTab()
      case "users":
        return renderUsersTab()
      case "payments":
        return renderPaymentsTab()
      case "reviews":
        return renderReviewsTab()
      case "support":
        return renderSupportTab()
      case "reports":
        return renderReportsTab()
      default:
        return renderCarsTab()
    }
  }

  const renderDetailRow = (label: string, value: string) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "—"}</Text>
    </View>
  )

  const renderModalHeader = (title: string, onClose: () => void) => (
    <>
      <View style={styles.modalHandle} />
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{title}</Text>
        <TouchableOpacity style={styles.iconCircle} onPress={onClose} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="close" size={20} color={THEME_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </>
  )

  const renderBookingDetailModal = () => {
    const booking = selectedBooking
    if (!booking) return null
    const customer = usersById[booking.userId]
    const imageSource = getBookingImageSource(booking)
    const status = normalizeStatus(booking.status)
    const payment = booking.payment
    const paymentKey = getPaymentStatusKey(booking)
    const paymentStatusLabel =
      (payment?.status && PAYMENT_STATUS_LABELS[normalizeStatus(payment.status)]) || getPaymentLabel(paymentKey)
    const { handover, returnInspection: back } = booking
    const distance =
      handover?.odometer != null && back?.odometer != null ? Number(back.odometer) - Number(handover.odometer) : null
    const displayedOtherFees = back?.otherFees ?? (back?.compensationTotal == null ? Number(back?.extraFees) || 0 : 0)
    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedBookingId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {renderModalHeader("Chi tiết đơn đặt xe", () => setSelectedBookingId(null))}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {imageSource ? (
                <View style={styles.modalImageWrap}>
                  <Image source={imageSource} style={styles.modalCarImage} resizeMode="contain" />
                </View>
              ) : null}
              <View style={styles.modalStatusRow}>
                <Text style={[styles.modalCarName, styles.flex1]} numberOfLines={2}>{booking.carName}</Text>
                {renderStatusBadge(booking.status)}
              </View>

              <Text style={styles.detailSection}>Thông tin đơn</Text>
              <View style={styles.detailGroup}>
                {renderDetailRow("Mã đơn", booking.id)}
                {renderDetailRow("Ngày đặt", formatAnyDate(booking.createdAt, "datetime"))}
                {renderDetailRow("Trạng thái", getBookingStatusLabel(booking.status))}
                {booking.cancelledAt ? renderDetailRow("Ngày huỷ", formatDate(booking.cancelledAt, "datetime")) : null}
                {booking.cancelledBy ? renderDetailRow("Người huỷ", booking.cancelledBy === "admin" ? "Quản trị viên" : "Khách hàng") : null}
                {booking.rejectedAt ? renderDetailRow("Ngày từ chối", formatAnyDate(booking.rejectedAt, "datetime")) : null}
                {booking.rejectReason ? renderDetailRow("Lý do từ chối", booking.rejectReason) : null}
              </View>

              <Text style={styles.detailSection}>Khách hàng</Text>
              <View style={styles.detailGroup}>
                {renderDetailRow("Họ tên", customer?.name || "Khách hàng không xác định")}
                {renderDetailRow("Email", customer?.email || "")}
                {renderDetailRow("Số điện thoại", customer?.phone || "")}
              </View>

              <Text style={styles.detailSection}>Thuê xe</Text>
              <View style={styles.detailGroup}>
                {renderDetailRow("Xe", booking.carName)}
                {renderDetailRow("Thời gian thuê", getRentalPeriodText(booking))}
                {renderDetailRow("Điểm nhận xe", booking.location)}
              </View>

              <Text style={styles.detailSection}>Dịch vụ thêm</Text>
              <View style={styles.detailGroup}>
                {booking.selectedAddOns.length === 0 ? (
                  <Text style={styles.detailEmpty}>Không có</Text>
                ) : (
                  booking.selectedAddOns.map((addon, index) => (
                    <View key={`${addon.id ?? index}`}>
                      {renderDetailRow(addon.name || "Dịch vụ", formatCurrency(addon.price || 0))}
                    </View>
                  ))
                )}
              </View>

              <Text style={styles.detailSection}>Thanh toán</Text>
              <View style={styles.detailGroup}>
                {renderDetailRow("Tổng cộng", formatCurrency(booking.price))}
                {renderDetailRow("Trạng thái", paymentStatusLabel)}
                {payment ? (
                  <>
                    {renderDetailRow("Phương thức", payment.method || "")}
                    {renderDetailRow(
                      paymentKey === "pending" ? "Số tiền cần thu" : "Số tiền đã trả",
                      payment.amount != null ? formatCurrency(payment.amount) : "",
                    )}
                    {renderDetailRow("Mã giao dịch", payment.transactionId || "")}
                    {renderDetailRow("Thời gian thanh toán", formatAnyDate(payment.paidAt, "datetime"))}
                    {payment.refundAmount
                      ? renderDetailRow(
                          "Tiền hoàn",
                          `${formatCurrency(payment.refundAmount)}${payment.refundPercent ? ` (${payment.refundPercent}%)` : ""}`,
                        )
                      : null}
                    {payment.refundedAt ? renderDetailRow("Ngày hoàn", formatAnyDate(payment.refundedAt, "datetime")) : null}
                  </>
                ) : null}
              </View>

              {handover ? (
                <>
                  <Text style={styles.detailSection}>Biên bản giao xe</Text>
                  <View style={styles.detailGroup}>
                    {renderDetailRow("Thời gian giao", formatAnyDate(handover.at, "datetime"))}
                    {renderDetailRow("Số km", handover.odometer != null ? `${handover.odometer} km` : "")}
                    {renderDetailRow("Mức nhiên liệu", handover.fuelLevel || "")}
                    {renderDetailRow("Giấy tờ (CCCD, GPLX)", handover.documentsChecked ? "Đã kiểm tra" : "Chưa kiểm tra")}
                    {renderDetailRow(
                      "Tiền cọc",
                      handover.depositCollected ? `Đã thu${booking.deposit ? ` ${formatCurrency(booking.deposit)}` : ""}` : "Chưa thu",
                    )}
                    {handover.rentCollected ? renderDetailRow("Tiền thuê", `Đã thu tiền mặt ${formatCurrency(booking.price)}`) : null}
                    {renderDetailRow("Tình trạng xe", handover.conditionNote || "")}
                  </View>
                </>
              ) : null}

              {back ? (
                <>
                  <Text style={styles.detailSection}>Biên bản nhận lại xe</Text>
                  <View style={styles.detailGroup}>
                    {renderDetailRow("Thời gian trả", formatAnyDate(back.at, "datetime"))}
                    {renderDetailRow(
                      "Số km",
                      back.odometer != null
                        ? `${back.odometer} km${distance != null && distance >= 0 ? ` (đã đi ${distance} km)` : ""}`
                        : "",
                    )}
                    {renderDetailRow("Mức nhiên liệu", back.fuelLevel || "")}
                    {renderDetailRow("Hư hỏng", back.damageNote || "Không có")}
                    {(back.compensations ?? []).map((line) => (
                      <View key={line.id}>
                        {renderDetailRow(`${line.label} × ${line.qty}`, formatCurrency(line.amount))}
                      </View>
                    ))}
                    {back.compensationTotal != null
                      ? renderDetailRow("Đền bù", formatCurrency(back.compensationTotal))
                      : null}
                    {back.otherFees != null || back.extraFees != null
                      ? renderDetailRow("Phí khác", formatCurrency(displayedOtherFees))
                      : null}
                    {renderDetailRow("Phí trễ giờ", formatCurrency(back.lateFee || 0))}
                    {renderDetailRow("Tiền cọc hoàn lại", formatCurrency(back.depositRefund || 0))}
                    {(back.extraDue ?? 0) > 0 ? renderDetailRow("Khách trả thêm", formatCurrency(back.extraDue ?? 0)) : null}
                  </View>
                </>
              ) : null}

              <View style={styles.modalActions}>
                {canDecide(booking) && (
                  <>
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalPrimaryButton]}
                      onPress={() => handleConfirmBooking(booking)}
                      activeOpacity={PRESS_OPACITY}
                    >
                      <Text style={styles.modalPrimaryText}>Xác nhận đơn</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalDangerButton]}
                      onPress={() => openRejectBooking(booking)}
                      activeOpacity={PRESS_OPACITY}
                    >
                      <Text style={styles.modalDangerText}>Từ chối đơn</Text>
                    </TouchableOpacity>
                  </>
                )}
                {(status === "upcoming" || status === "active") && (
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalPrimaryButton]}
                    onPress={() => handleAdvanceBooking(booking)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={styles.modalPrimaryText}>{status === "upcoming" ? "Giao xe" : "Nhận lại xe"}</Text>
                  </TouchableOpacity>
                )}
                {canCancel(booking) && !canDecide(booking) && (
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalDangerButton]}
                    onPress={() => handleCancelBooking(booking)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={styles.modalDangerText}>Huỷ đơn</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    )
  }

  const renderUserDetailModal = () => {
    const user = selectedUser
    if (!user) return null
    const userBookings = bookings.filter((b) => b.userId === user.id)
    const spent = userBookings.reduce((sum, b) => sum + bookingRevenue(b as any), 0)
    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedUserId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {renderModalHeader("Thông tin người dùng", () => setSelectedUserId(null))}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalUserHeader}>
                <Image source={{ uri: user.avatar }} style={styles.modalUserAvatar} />
                <View style={styles.flex1}>
                  <Text style={styles.modalCarName} numberOfLines={1}>{user.name}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                </View>
                {renderBadge(USER_STATUS_LABELS[user.status], user.status === "active" ? "success" : "danger")}
              </View>
              <View style={styles.detailGroup}>
                {renderDetailRow("Số điện thoại", user.phone)}
                {renderDetailRow("Ngày tham gia", user.joinDate ? formatDate(user.joinDate) : "")}
                {renderDetailRow("Vai trò", USER_ROLE_LABELS[getUserRole(user)])}
                {renderDetailRow("Trạng thái", USER_STATUS_LABELS[user.status])}
                {renderDetailRow("Số đơn đặt xe", String(userBookings.length))}
                {renderDetailRow("Tổng chi tiêu", formatCurrency(spent))}
              </View>

              <Text style={styles.detailSection}>Đơn đặt xe</Text>
              {userBookings.length === 0 ? (
                <Text style={styles.detailEmpty}>Chưa có đơn nào</Text>
              ) : (
                <View style={styles.userBookingList}>
                  {userBookings.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={styles.userBookingRow}
                      activeOpacity={PRESS_OPACITY}
                      onPress={() => {
                        setSelectedUserId(null)
                        setSelectedBookingId(b.id)
                      }}
                    >
                      <View style={styles.flex1}>
                        <Text style={styles.userBookingName} numberOfLines={1}>{b.carName}</Text>
                        <Text style={styles.userEmail}>
                          {b.createdAt ? formatDate(b.createdAt) : ""} · {formatCurrency(b.price)}
                        </Text>
                      </View>
                      {renderStatusBadge(b.status)}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                {isAdmin && !user.isAdmin ? (
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalSecondaryButton]}
                    onPress={() => handleSetStaff(user, user.role !== "staff")}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={styles.rejectCancelText}>
                      {user.role === "staff" ? "Bỏ vai trò nhân viên" : "Gán vai trò nhân viên"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.modalActionButton, user.status === "active" ? styles.modalDangerButton : styles.modalPrimaryButton]}
                  onPress={() => handleToggleUserLock(user)}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Text style={user.status === "active" ? styles.modalDangerText : styles.modalPrimaryText}>
                    {user.status === "active" ? "Khoá tài khoản" : "Mở khoá tài khoản"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    )
  }

  const renderRejectLicenseModal = () => {
    if (!rejectLicenseId) return null
    const customer = usersById[rejectLicenseId]
    const processing = licenseProcessingId === rejectLicenseId
    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setRejectLicenseId(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.rejectModalContent]}>
            {renderModalHeader("Từ chối GPLX", () => setRejectLicenseId(null))}
            <Text style={styles.rejectLicenseDescription}>
              Nhập lý do để {customer?.name || "khách hàng"} biết thông tin nào cần cập nhật trước khi gửi lại.
            </Text>
            <Text style={styles.inputLabel}>Lý do từ chối</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="VD: Ảnh mặt trước bị mờ, không đọc được số GPLX..."
              placeholderTextColor={THEME_COLORS.textMuted}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.rejectCancelButton]}
                onPress={() => setRejectLicenseId(null)}
                disabled={processing}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={styles.rejectCancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalDangerButton, processing && styles.disabledButton]}
                onPress={handleRejectLicense}
                disabled={processing}
                activeOpacity={PRESS_OPACITY}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={THEME_COLORS.danger} />
                ) : (
                  <Text style={styles.modalDangerText}>Xác nhận từ chối</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  const renderRejectBookingModal = () => {
    const booking = rejectBookingId ? bookings.find((b) => b.id === rejectBookingId) : null
    if (!booking) return null
    const canSubmit = bookingRejectReason.trim().length > 0 && !bookingRejecting
    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setRejectBookingId(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.rejectModalContent]}>
            {renderModalHeader("Từ chối đơn đặt xe", () => setRejectBookingId(null))}
            <Text style={styles.rejectLicenseDescription}>
              Đơn {booking.carName} của {getCustomerName(booking)}. Lý do sẽ được gửi kèm thông báo cho khách.
            </Text>
            <Text style={styles.inputLabel}>Lý do từ chối</Text>
            <TextInput
              style={[styles.input, styles.textArea, focusedField === "bookingRejectReason" && (styles.inputFocused as TextStyle)]}
              value={bookingRejectReason}
              onChangeText={setBookingRejectReason}
              placeholder="VD: Xe đang bảo dưỡng trong thời gian này, vui lòng chọn xe khác..."
              placeholderTextColor={THEME_COLORS.textMuted}
              multiline
              textAlignVertical="top"
              autoFocus
              {...focusProps("bookingRejectReason")}
            />
            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.rejectCancelButton]}
                onPress={() => setRejectBookingId(null)}
                disabled={bookingRejecting}
                activeOpacity={PRESS_OPACITY}
              >
                <Text style={styles.rejectCancelText}>Quay lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalDangerButton, styles.flex1, !canSubmit && styles.disabledButton]}
                onPress={submitRejectBooking}
                disabled={!canSubmit}
                activeOpacity={PRESS_OPACITY}
              >
                {bookingRejecting ? (
                  <ActivityIndicator size="small" color={THEME_COLORS.danger} />
                ) : (
                  <Text style={styles.modalDangerText}>Từ chối đơn</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  // Bottom sheet trả lời phiếu hỗ trợ (U7.1)
  const renderReplyTicketModal = () => {
    const ticket = replyTicketId ? tickets.find((t) => t.id === replyTicketId) : null
    if (!ticket) return null
    const close = () => !replying && setReplyTicketId(null)
    const canSubmit = replyText.trim().length > 0 && !replying
    return (
      <Modal visible transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalContent, styles.rejectModalContent]}>
            {renderModalHeader("Trả lời yêu cầu hỗ trợ", close)}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.detailGroup}>
                {renderDetailRow("Khách hàng", getTicketCustomerName(ticket))}
                {renderDetailRow("Chủ đề", ticket.subject)}
              </View>
              <Text style={[styles.reviewComment, styles.ticketQuote]}>{ticket.message}</Text>
              <Text style={styles.inputLabel}>Nội dung phản hồi</Text>
              <TextInput
                style={[styles.input, styles.textArea, focusedField === "ticketReply" && (styles.inputFocused as TextStyle)]}
                value={replyText}
                onChangeText={setReplyText}
                placeholder="VD: RENTO đã kiểm tra và hoàn tiền cho bạn, vui lòng kiểm tra tài khoản trong 3–5 ngày làm việc..."
                placeholderTextColor={THEME_COLORS.textMuted}
                multiline
                textAlignVertical="top"
                autoFocus
                {...focusProps("ticketReply")}
              />
              <Text style={styles.inspectionHint}>Khách hàng sẽ nhận được thông báo kèm nội dung phản hồi.</Text>
              <View style={styles.rejectModalActions}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.rejectCancelButton]}
                  onPress={close}
                  disabled={replying}
                  activeOpacity={PRESS_OPACITY}
                >
                  <Text style={styles.rejectCancelText}>Quay lại</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.modalPrimaryButton, styles.flex1, !canSubmit && styles.disabledButton]}
                  onPress={submitReplyTicket}
                  disabled={!canSubmit}
                  activeOpacity={PRESS_OPACITY}
                >
                  {replying ? (
                    <ActivityIndicator size="small" color={THEME_COLORS.textInverse} />
                  ) : (
                    <Text style={styles.modalPrimaryText}>Gửi phản hồi</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    )
  }

  // Bottom sheet biên bản giao xe (Upcoming → Active) / nhận lại xe (Active → Completed)
  const renderInspectionModal = () => {
    if (!inspection || !inspectionBooking) return null
    const booking = inspectionBooking
    const isHandover = inspection.kind === "handover"
    const f = inspectionForm
    const close = () => !inspectionSubmitting && setInspection(null)
    const deposit = Number(booking.deposit ?? inspectionCar?.deposit) || 0
    const range = getBookingRange(booking)
    const handoverKm = booking.handover?.odometer
    const km = f.odometer === "" ? null : Number(f.odometer)
    const kmTooLow = !isHandover && km != null && handoverKm != null && km < handoverKm
    const totalFees = returnPreview ? returnPreview.lateFee + returnPreview.extraFees : 0
    const customAmountMissing = f.compensations.some((item) => {
      const policy = COMPENSATION_POLICY.find((entry) => entry.id === item.id)
      return policy?.custom && (!Number.isFinite(item.amount) || (item.amount ?? 0) <= 0)
    })
    // Khách chọn trả tiền mặt khi nhận xe: phải thu tiền thuê trước khi giao (G7)
    const cashDue = normalizeStatus(booking.payment?.status) === "pending"
    const ready = isHandover
      ? f.documentsChecked && f.depositCollected && (!cashDue || f.rentCollected) && !!f.conditionNote.trim() && km != null && !!f.fuelLevel
      : km != null && !kmTooLow && !!f.fuelLevel && !customAmountMissing

    const checkRow = (field: "documentsChecked" | "depositCollected" | "rentCollected", title: string, caption: string) => (
      <TouchableOpacity
        style={[styles.checkRow, f[field] && styles.checkRowActive]}
        onPress={() => updateInspection(field, !f[field])}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: f[field] }}
        activeOpacity={PRESS_OPACITY}
      >
        <Ionicons
          name={f[field] ? "checkbox" : "square-outline"}
          size={22}
          color={f[field] ? THEME_COLORS.primary : THEME_COLORS.textMuted}
        />
        <View style={styles.flex1}>
          <Text style={styles.checkTitle}>{title}</Text>
          <Text style={styles.checkCaption}>{caption}</Text>
        </View>
      </TouchableOpacity>
    )

    return (
      <Modal visible transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalContent}>
            {renderModalHeader(isHandover ? "Biên bản giao xe" : "Biên bản nhận lại xe", close)}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.detailGroup}>
                {renderDetailRow("Xe", [booking.carName, inspectionCar?.licensePlate].filter(Boolean).join(" · "))}
                {renderDetailRow("Khách hàng", getCustomerName(booking))}
                {isHandover
                  ? renderDetailRow("Giờ nhận theo đơn", range ? formatDate(range.start, "datetime") : "")
                  : renderDetailRow(
                      "Lúc giao",
                      [handoverKm != null ? `${handoverKm} km` : "", booking.handover?.fuelLevel ? `xăng ${booking.handover.fuelLevel}` : ""]
                        .filter(Boolean)
                        .join(" · "),
                    )}
              </View>

              {isHandover ? (
                <>
                  <Text style={styles.detailSection}>{cashDue ? "Giấy tờ, tiền thuê & tiền cọc" : "Giấy tờ & tiền cọc"}</Text>
                  <View style={styles.checkList}>
                    {checkRow("documentsChecked", "Đã kiểm tra giấy tờ", "CCCD và GPLX bản gốc khớp với hồ sơ đặt xe")}
                    {cashDue
                      ? checkRow("rentCollected", `Đã thu tiền thuê ${formatCurrency(booking.price)}`, "Khách chọn trả tiền mặt khi nhận xe")
                      : null}
                    {checkRow("depositCollected", "Đã thu tiền cọc", deposit ? formatCurrency(deposit) : "Đơn không có tiền cọc")}
                  </View>
                </>
              ) : null}

              <Text style={styles.detailSection}>{isHandover ? "Số km lúc giao" : "Số km lúc trả"}</Text>
              <TextInput
                style={inputStyle("inspectionOdometer", kmTooLow)}
                value={f.odometer}
                onChangeText={(t) => updateInspection("odometer", t.replace(/\D/g, ""))}
                placeholder="VD: 12500"
                placeholderTextColor={THEME_COLORS.textMuted}
                keyboardType="number-pad"
                {...focusProps("inspectionOdometer")}
              />
              {kmTooLow ? (
                <Text style={styles.fieldError}>Số km khi trả phải lớn hơn hoặc bằng lúc giao ({handoverKm} km).</Text>
              ) : !isHandover && handoverKm != null ? (
                <Text style={styles.inspectionHint}>
                  Lúc giao: {handoverKm} km{km != null ? ` · Đã đi ${km - handoverKm} km` : ""}
                </Text>
              ) : null}

              <Text style={styles.detailSection}>Mức nhiên liệu</Text>
              <View style={styles.choiceRow}>
                {FUEL_LEVELS.map((level) => {
                  const selected = f.fuelLevel === level
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[styles.choiceChip, styles.fuelChip, selected && styles.choiceChipActive]}
                      onPress={() => updateInspection("fuelLevel", level)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      activeOpacity={PRESS_OPACITY}
                    >
                      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{level}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              {!isHandover && booking.handover?.fuelLevel ? (
                <Text style={styles.inspectionHint}>Lúc giao: {booking.handover.fuelLevel}</Text>
              ) : null}

              <Text style={styles.detailSection}>{isHandover ? "Tình trạng xe lúc giao" : "Hư hỏng (nếu có)"}</Text>
              <TextInput
                style={[inputStyle("inspectionNote"), styles.textArea]}
                value={isHandover ? f.conditionNote : f.damageNote}
                onChangeText={(t) => updateInspection(isHandover ? "conditionNote" : "damageNote", t)}
                placeholder={
                  isHandover
                    ? "VD: Xe sạch, trầy nhẹ cản sau bên trái, đủ 2 chìa khoá..."
                    : "Để trống nếu xe không có hư hỏng mới"
                }
                placeholderTextColor={THEME_COLORS.textMuted}
                multiline
                textAlignVertical="top"
                {...focusProps("inspectionNote")}
              />

              {!isHandover && returnPreview ? (
                <>
                  <Text style={styles.detailSection}>Hạng mục đền bù</Text>
                  <Text style={styles.inspectionLead}>Chọn tất cả hạng mục phát sinh khi kiểm tra xe.</Text>
                  <View style={styles.choiceRow}>
                    {COMPENSATION_POLICY.map((policy) => {
                      const selected = f.compensations.some((item) => item.id === policy.id)
                      return (
                        <TouchableOpacity
                          key={policy.id}
                          style={[styles.choiceChip, selected && styles.choiceChipActive]}
                          onPress={() => toggleCompensation(policy.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          activeOpacity={PRESS_OPACITY}
                        >
                          <Ionicons
                            name={selected ? "checkmark-circle" : "add-circle-outline"}
                            size={17}
                            color={selected ? THEME_COLORS.primary : THEME_COLORS.textMuted}
                          />
                          <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{policy.label}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  {f.compensations.map((item) => {
                    const policy = COMPENSATION_POLICY.find((entry) => entry.id === item.id)
                    if (!policy) return null
                    const qty = Math.max(1, item.qty ?? 1)
                    return (
                      <View key={item.id} style={styles.compensationEditor}>
                        <View style={styles.compensationEditorHeader}>
                          <View style={styles.flex1}>
                            <Text style={styles.compensationLabel}>{policy.label}</Text>
                            <Text style={styles.compensationNote}>{policy.note}</Text>
                          </View>
                          {!policy.custom ? (
                            <Text style={styles.compensationUnit}>
                              {formatCurrency(policy.unit ?? 0)}/{policy.unitLabel ?? "đơn vị"}
                            </Text>
                          ) : null}
                        </View>
                        {policy.custom ? (
                          <>
                            <TextInput
                              style={inputStyle(`compensation-${policy.id}`, (item.amount ?? 0) <= 0)}
                              value={item.amount ? String(item.amount) : ""}
                              onChangeText={(text) => updateCompensation(policy.id, { amount: Number(text.replace(/\D/g, "")) || 0 })}
                              placeholder="Nhập số tiền theo thực tế"
                              placeholderTextColor={THEME_COLORS.textMuted}
                              keyboardType="number-pad"
                              {...focusProps(`compensation-${policy.id}`)}
                            />
                            {(item.amount ?? 0) <= 0 ? <Text style={styles.fieldError}>Vui lòng nhập số tiền đền bù.</Text> : null}
                          </>
                        ) : (
                          <View style={styles.quantityRow}>
                            <TouchableOpacity
                              style={[styles.quantityButton, qty <= 1 && styles.disabledButton]}
                              onPress={() => updateCompensation(policy.id, { qty: Math.max(1, qty - 1) })}
                              disabled={qty <= 1}
                              accessibilityLabel={`Giảm số lượng ${policy.label}`}
                              activeOpacity={PRESS_OPACITY}
                            >
                              <Ionicons name="remove" size={18} color={THEME_COLORS.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.quantityValue}>{qty}</Text>
                            <TouchableOpacity
                              style={styles.quantityButton}
                              onPress={() => updateCompensation(policy.id, { qty: qty + 1 })}
                              accessibilityLabel={`Tăng số lượng ${policy.label}`}
                              activeOpacity={PRESS_OPACITY}
                            >
                              <Ionicons name="add" size={18} color={THEME_COLORS.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.compensationAmount}>{formatCurrency((policy.unit ?? 0) * qty)}</Text>
                          </View>
                        )}
                      </View>
                    )
                  })}

                  <Text style={styles.detailSection}>Phí khác</Text>
                  <TextInput
                    style={inputStyle("inspectionFees")}
                    value={f.extraFees}
                    onChangeText={(t) => updateInspection("extraFees", t.replace(/\D/g, ""))}
                    placeholder="0"
                    placeholderTextColor={THEME_COLORS.textMuted}
                    keyboardType="number-pad"
                    {...focusProps("inspectionFees")}
                  />
                  <Text style={styles.inspectionHint}>Chi phí ngoài các hạng mục đền bù ở trên (VND).</Text>

                  <Text style={styles.detailSection}>Quyết toán tiền cọc</Text>
                  <View style={styles.detailGroup}>
                    {renderDetailRow("Giờ trả theo đơn", range ? formatDate(range.end, "datetime") : "")}
                    {renderDetailRow("Đền bù", formatCurrency(compensationPreview.total))}
                    {renderDetailRow("Phí khác", formatCurrency(otherFeesPreview))}
                    {renderDetailRow("Phí trễ giờ", formatCurrency(returnPreview.lateFee))}
                    {renderDetailRow("Tổng phí", formatCurrency(totalFees))}
                    {renderDetailRow("Tiền cọc", formatCurrency(deposit))}
                    <View style={styles.settleTotalRow}>
                      <Text style={styles.settleTotalLabel}>Hoàn cọc</Text>
                      <Text style={styles.settleTotalValue}>{formatCurrency(returnPreview.depositRefund)}</Text>
                    </View>
                    {returnPreview.extraDue > 0 ? (
                      <View style={styles.extraDueRow}>
                        <Text style={styles.extraDueLabel}>Khách trả thêm</Text>
                        <Text style={styles.extraDueValue}>{formatCurrency(returnPreview.extraDue)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.inspectionHint}>Phí trễ giờ tính đến thời điểm xác nhận: mỗi giờ 10% giá ngày, tối đa 1 ngày.</Text>
                </>
              ) : null}

              <View style={styles.modalActions}>
                {!ready ? <Text style={styles.inspectionHint}>Điền đủ các mục bắt buộc để xác nhận biên bản.</Text> : null}
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.modalPrimaryButton, (!ready || inspectionSubmitting) && styles.disabledButton]}
                  onPress={submitInspection}
                  disabled={!ready || inspectionSubmitting}
                  activeOpacity={PRESS_OPACITY}
                >
                  {inspectionSubmitting ? (
                    <ActivityIndicator color={THEME_COLORS.textInverse} />
                  ) : (
                    <Text style={styles.modalPrimaryText}>{isHandover ? "Xác nhận giao xe" : "Xác nhận nhận lại xe"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    )
  }

  if (!canManage) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={THEME_COLORS.primary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()} activeOpacity={PRESS_OPACITY}>
            <Ionicons name="arrow-back" size={20} color={THEME_COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Trang quản trị</Text>
          <View>{renderBadge(USER_ROLE_LABELS[isStaff ? "staff" : "admin"], isStaff ? "neutral" : "primary")}</View>
        </View>

        {/* Thanh chuyển tab dạng segmented control */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={PRESS_OPACITY}
              >
                <Ionicons
                  name={(isActive ? tab.icon : `${tab.icon}-outline`) as any}
                  size={18}
                  color={isActive ? THEME_COLORS.primary : THEME_COLORS.textMuted}
                />
                <Text style={[styles.tabText, isActive && styles.activeTabText]} numberOfLines={1}>
                  {tab.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderTabContent()}
      </ScrollView>

      {renderBookingDetailModal()}
      {renderInspectionModal()}
      {renderUserDetailModal()}
      {renderRejectLicenseModal()}
      {renderRejectBookingModal()}
      {renderReplyTicketModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    ...UI.screen,
  },
  flex1: {
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },

  // ===== Header + segmented control =====
  header: {
    backgroundColor: THEME_COLORS.background,
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.sm,
    paddingBottom: SPACE.lg,
    gap: SPACE.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    flex: 1,
  },
  headerDivider: {
    ...UI.divider,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsContainer: {
    flexGrow: 0,
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  tabsContent: {
    flexGrow: 1,
    padding: SPACE.xs,
    gap: SPACE.xs,
  },
  tab: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.control - SPACE.xs,
    gap: 2,
  },
  activeTab: {
    backgroundColor: THEME_COLORS.surface,
    ...SHADOWS.card,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: THEME_COLORS.textMuted,
  },
  activeTabText: {
    color: THEME_COLORS.primary,
    fontWeight: "700",
  },

  // ===== Nội dung =====
  content: {
    flex: 1,
    backgroundColor: THEME_COLORS.background,
  },
  contentContainer: {
    paddingBottom: SPACE.section,
  },
  tabContent: {
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE["2xl"],
  },
  tabHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACE["2xl"],
  },
  tabTitle: {
    ...TYPOGRAPHY.h2,
  },
  tabTitleSpacing: {
    marginBottom: SPACE.lg,
  },
  addButton: {
    ...UI.primaryButton,
    height: 40,
    paddingHorizontal: SPACE.lg,
    flexDirection: "row",
    gap: SPACE.xs,
  },
  addButtonText: {
    ...UI.primaryButtonText,
    fontSize: 14,
  },
  seedButton: {
    ...UI.secondaryButton,
    height: "auto",
    minHeight: 72,
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: SPACE.md,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    marginTop: -SPACE.md,
    marginBottom: SPACE.xl,
  },
  seedIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  seedTitle: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.primary,
  },
  seedCaption: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },

  // ===== Loại xe (G7) =====
  typesCard: {
    ...UI.card,
    padding: SPACE.lg,
    marginBottom: SPACE.xl,
  },
  typesTitle: {
    ...TYPOGRAPHY.h3,
    marginTop: 2,
    marginBottom: SPACE.md,
  },
  typeChip: {
    ...UI.chip,
    flexDirection: "row",
    gap: SPACE.sm,
  },
  typeCount: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
  typeAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    marginTop: SPACE.lg,
  },
  typeAddButton: {
    alignSelf: "stretch", // cao bằng ô nhập bên cạnh
    height: "auto",
  },

  // ===== Thanh toán / hỗ trợ (G7) =====
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketSubjectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE.md,
    marginTop: SPACE.md,
  },
  ticketReply: {
    marginTop: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  ticketQuote: {
    marginBottom: SPACE.lg,
  },

  // ===== Form thêm/sửa xe =====
  addCarForm: {
    ...UI.card,
    ...SHADOWS.raised,
    padding: SPACE.xl,
    marginBottom: SPACE.section,
  },
  formTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACE.xl,
  },
  formSectionTitle: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACE.sm,
    marginBottom: SPACE.lg,
  },
  inputRow: {
    flexDirection: "row",
    gap: SPACE.md,
  },
  inputGroup: {
    marginBottom: SPACE.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: SPACE.sm,
  },
  input: {
    ...UI.input,
  },
  inputFocused: {
    ...UI.inputFocused,
  },
  inputError: {
    borderColor: THEME_COLORS.danger,
  },
  fieldError: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.danger,
    marginTop: SPACE.xs,
  },
  fieldHint: {
    ...TYPOGRAPHY.caption,
    marginTop: -SPACE.xs,
    marginBottom: SPACE.md,
  },
  textArea: {
    height: 112,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.md,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE.sm,
  },
  choiceChip: {
    ...UI.chip,
    flexDirection: "row",
    gap: SPACE.xs,
  },
  choiceChipActive: {
    ...UI.chipActive,
  },
  choiceChipText: {
    ...UI.chipText,
  },
  choiceChipTextActive: {
    ...UI.chipTextActive,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
  },
  formButtons: {
    flexDirection: "row",
    gap: SPACE.md,
    marginTop: SPACE.sm,
  },
  cancelButton: {
    ...UI.secondaryButton,
    flex: 1,
    paddingHorizontal: SPACE.lg,
  },
  cancelButtonText: {
    ...UI.secondaryButtonText,
  },
  submitButton: {
    ...UI.primaryButton,
    flex: 1,
    paddingHorizontal: SPACE.lg,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...UI.primaryButtonText,
  },
  imagePreviewContainer: {
    borderRadius: RADIUS.control,
    overflow: "hidden",
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  imagePreview: {
    width: "100%",
    height: 180,
  },
  changeImageButton: {
    position: "absolute",
    right: SPACE.md,
    bottom: SPACE.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
    backgroundColor: THEME_COLORS.surface,
    paddingHorizontal: SPACE.md,
    height: 36,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  changeImageText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME_COLORS.textPrimary,
  },
  uploadButton: {
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.sm,
    paddingVertical: SPACE["2xl"],
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: THEME_COLORS.borderStrong,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  uploadIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME_COLORS.primary,
  },

  // ===== Thẻ xe =====
  carsList: {
    gap: SPACE.lg,
  },
  carCard: {
    ...UI.card,
    overflow: "hidden",
  },
  carImageWrap: {
    height: 160,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  carImage: {
    width: "100%",
    height: "100%",
  },
  carInfo: {
    padding: SPACE.lg,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE.md,
  },
  carName: {
    ...TYPOGRAPHY.h3,
  },
  carBrand: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  carPrice: {
    ...TYPOGRAPHY.price,
    marginTop: SPACE.sm,
  },

  // Hàng thông tin label – giá trị dùng chung
  infoBlock: {
    marginTop: SPACE.md,
    paddingTop: SPACE.md,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
    gap: SPACE.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACE.md,
  },
  infoLabel: {
    ...TYPOGRAPHY.caption,
  },
  infoValue: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
    flexShrink: 1,
    textAlign: "right",
  },
  infoValuePrice: {
    color: THEME_COLORS.primary,
    fontWeight: "700",
  },

  // Nút hành động nhỏ trong thẻ
  decisionRow: {
    flexDirection: "row",
    gap: SPACE.sm,
    marginTop: SPACE.lg,
  },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE.sm,
    marginTop: SPACE.lg,
  },
  smallButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.control,
  },
  smallPrimaryButton: {
    backgroundColor: THEME_COLORS.primary,
    ...SHADOWS.primaryButton,
  },
  smallPrimaryText: {
    color: THEME_COLORS.textInverse,
    fontSize: 13,
    fontWeight: "700",
  },
  smallSecondaryButton: {
    backgroundColor: THEME_COLORS.surface,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
  },
  smallSecondaryText: {
    color: THEME_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  smallDangerButton: {
    backgroundColor: THEME_COLORS.dangerSoft,
  },
  smallDangerText: {
    color: THEME_COLORS.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  smallSuccessButton: {
    backgroundColor: THEME_COLORS.successSoft,
  },
  smallSuccessText: {
    color: THEME_COLORS.success,
    fontSize: 13,
    fontWeight: "600",
  },

  // ===== Ô thống kê =====
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE.md,
    marginBottom: SPACE.section,
  },
  statCard: {
    ...UI.card,
    flexGrow: 1,
    flexBasis: "40%",
    padding: SPACE.lg,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE.md,
  },
  statLabel: {
    ...TYPOGRAPHY.overline,
  },
  statNumber: {
    ...TYPOGRAPHY.display,
    marginTop: SPACE.xs,
  },
  statNumberSmall: {
    ...TYPOGRAPHY.h1,
  },

  // ===== Biểu đồ =====
  chartCard: {
    ...UI.card,
    padding: SPACE.lg,
    marginBottom: SPACE.lg,
  },
  chartOverline: {
    ...TYPOGRAPHY.overline,
  },
  chartTitle: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACE.xs,
    marginBottom: SPACE.lg,
  },
  chart: {
    borderRadius: RADIUS.control,
  },

  // ===== Tìm kiếm + bộ lọc =====
  searchBox: {
    ...UI.input,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: THEME_COLORS.textPrimary,
  },
  bookingsFilter: {
    gap: SPACE.md,
    marginBottom: SPACE.lg,
  },
  filterTabs: {
    gap: SPACE.sm,
  },
  filterTab: {
    ...UI.chip,
  },
  activeFilterTab: {
    ...UI.chipActive,
  },
  filterTabText: {
    ...UI.chipText,
  },
  activeFilterTabText: {
    ...UI.chipTextActive,
  },
  userFilters: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 48,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
  },
  filterButtonActive: {
    ...UI.chipActive,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: THEME_COLORS.textSecondary,
  },
  filterButtonTextActive: {
    color: THEME_COLORS.primary,
    fontWeight: "600",
  },
  userFilterChips: {
    marginTop: SPACE.md,
  },

  // ===== Duyệt GPLX =====
  licensesSection: {
    marginBottom: SPACE.section,
  },
  licensesSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    marginBottom: SPACE.lg,
  },
  licensesOverline: {
    ...TYPOGRAPHY.overline,
  },
  licensesTitle: {
    ...TYPOGRAPHY.h3,
    marginTop: 2,
  },
  licenseCountBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME_COLORS.warningSoft,
  },
  licenseCountText: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.warning,
  },
  licenseCard: {
    ...UI.card,
    padding: SPACE.lg,
    marginBottom: SPACE.lg,
  },
  licenseCustomerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  licenseIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME_COLORS.primarySoft,
  },
  licenseCustomerName: {
    ...TYPOGRAPHY.bodyStrong,
  },
  licenseImages: {
    flexDirection: "row",
    gap: SPACE.md,
    marginTop: SPACE.lg,
  },
  licenseImageColumn: {
    flex: 1,
  },
  licenseImageLabel: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.textSecondary,
    marginBottom: SPACE.sm,
  },
  licenseImage: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  licenseActions: {
    flexDirection: "row",
    gap: SPACE.md,
    marginTop: SPACE.lg,
  },
  licenseActionButton: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.control,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.sm,
  },
  licenseRejectButton: {
    backgroundColor: THEME_COLORS.dangerSoft,
  },
  licenseRejectText: {
    color: THEME_COLORS.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  licenseApproveButton: {
    backgroundColor: THEME_COLORS.primary,
    ...SHADOWS.primaryButton,
  },
  licenseApproveText: {
    color: THEME_COLORS.textInverse,
    fontSize: 14,
    fontWeight: "700",
  },

  // ===== Badge trạng thái =====
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.pill,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // ===== Thẻ đơn đặt xe =====
  bookingsList: {
    gap: SPACE.lg,
  },
  bookingCard: {
    ...UI.card,
    padding: SPACE.lg,
  },
  bookingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE.md,
  },
  bookingCarImage: {
    width: 72,
    height: 56,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  bookingInfo: {
    flex: 1,
    gap: 4,
  },
  bookingCarName: {
    ...TYPOGRAPHY.bodyStrong,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  customerAvatar: {
    width: 18,
    height: 18,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  customerName: {
    fontSize: 13,
    color: THEME_COLORS.textSecondary,
    flexShrink: 1,
  },
  bookingCode: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
  paymentStatus: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: SPACE.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  paymentStatusText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
  },

  // ===== Thẻ người dùng =====
  usersList: {
    gap: SPACE.lg,
    marginTop: SPACE.lg,
  },
  userCard: {
    ...UI.card,
    padding: SPACE.lg,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE.md,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  userName: {
    ...TYPOGRAPHY.bodyStrong,
  },
  userEmail: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },

  // ===== Trạng thái rỗng =====
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACE["3xl"],
    paddingHorizontal: SPACE.lg,
    gap: SPACE.md,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    ...TYPOGRAPHY.body,
    color: THEME_COLORS.textMuted,
    textAlign: "center",
  },

  // ===== Modal (bottom sheet) =====
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME_COLORS.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: THEME_COLORS.surface,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACE.screen,
    paddingTop: SPACE.sm,
    maxHeight: "88%",
    ...SHADOWS.raised,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.borderStrong,
    marginBottom: SPACE.md,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACE.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    flex: 1,
  },
  modalScroll: {
    paddingBottom: SPACE["3xl"],
  },
  modalImageWrap: {
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderRadius: RADIUS.card,
    marginBottom: SPACE.lg,
    overflow: "hidden",
  },
  modalCarImage: {
    width: "100%",
    height: 160,
  },
  modalStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    marginBottom: SPACE.sm,
  },
  modalCarName: {
    ...TYPOGRAPHY.h3,
  },
  modalUserHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    marginBottom: SPACE.lg,
  },
  modalUserAvatar: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  detailSection: {
    ...TYPOGRAPHY.overline,
    marginTop: SPACE["2xl"],
    marginBottom: SPACE.sm,
  },
  detailGroup: {
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.xs,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACE.md,
    paddingVertical: 10,
  },
  detailLabel: {
    ...TYPOGRAPHY.caption,
    flexShrink: 0,
    maxWidth: "45%",
  },
  detailValue: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
    flex: 1,
    textAlign: "right",
  },
  detailEmpty: {
    ...TYPOGRAPHY.body,
    color: THEME_COLORS.textMuted,
    paddingVertical: 10,
  },
  userBookingList: {
    gap: SPACE.sm,
  },
  userBookingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
  },
  userBookingName: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
  },
  modalActions: {
    gap: SPACE.md,
    marginTop: SPACE["2xl"],
  },
  modalActionButton: {
    height: 52,
    borderRadius: RADIUS.control,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACE["2xl"],
  },
  modalPrimaryButton: {
    ...UI.primaryButton,
  },
  modalPrimaryText: {
    ...UI.primaryButtonText,
  },
  modalDangerButton: {
    backgroundColor: THEME_COLORS.dangerSoft,
  },
  modalDangerText: {
    color: THEME_COLORS.danger,
    fontSize: 16,
    fontWeight: "700",
  },
  rejectModalContent: {
    paddingBottom: SPACE["3xl"],
  },
  rejectLicenseDescription: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACE.lg,
  },
  rejectModalActions: {
    flexDirection: "row",
    gap: SPACE.md,
    marginTop: SPACE.lg,
  },
  rejectCancelButton: {
    ...UI.secondaryButton,
    flex: 1,
  },
  rejectCancelText: {
    ...UI.secondaryButtonText,
  },
  modalSecondaryButton: {
    ...UI.secondaryButton,
  },

  // ===== Biên bản giao / nhận lại xe =====
  checkList: {
    gap: SPACE.sm,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
    padding: SPACE.lg,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    backgroundColor: THEME_COLORS.surface,
  },
  checkRowActive: {
    borderColor: THEME_COLORS.primary,
    backgroundColor: THEME_COLORS.primarySubtle,
  },
  checkTitle: {
    ...TYPOGRAPHY.bodyStrong,
  },
  checkCaption: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  fuelChip: {
    flex: 1,
  },
  inspectionHint: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACE.sm,
  },
  inspectionLead: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACE.md,
  },
  compensationEditor: {
    marginTop: SPACE.md,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surfaceMuted,
  },
  compensationEditorHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE.md,
    marginBottom: SPACE.md,
  },
  compensationLabel: {
    ...TYPOGRAPHY.bodyStrong,
    fontSize: 14,
  },
  compensationNote: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  compensationUnit: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.primary,
    fontWeight: "700",
    maxWidth: "40%",
    textAlign: "right",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.sm,
  },
  quantityButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    borderRadius: RADIUS.control,
    backgroundColor: THEME_COLORS.surface,
  },
  quantityValue: {
    ...TYPOGRAPHY.bodyStrong,
    minWidth: 24,
    textAlign: "center",
  },
  compensationAmount: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.primary,
    flex: 1,
    textAlign: "right",
  },
  settleTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACE.md,
    paddingVertical: SPACE.md,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
  },
  settleTotalLabel: {
    ...TYPOGRAPHY.bodyStrong,
  },
  settleTotalValue: {
    ...TYPOGRAPHY.price,
    color: THEME_COLORS.success,
  },
  extraDueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACE.md,
    paddingVertical: SPACE.md,
    borderTopWidth: 1,
    borderTopColor: THEME_COLORS.border,
  },
  extraDueLabel: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.danger,
  },
  extraDueValue: {
    ...TYPOGRAPHY.price,
    color: THEME_COLORS.danger,
  },

  // ===== Đánh giá =====
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.md,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: THEME_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: {
    ...TYPOGRAPHY.bodyStrong,
    color: THEME_COLORS.primary,
  },
  reviewStars: {
    flexDirection: "row",
    gap: 1,
  },
  reviewCarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.xs,
    marginTop: SPACE.md,
  },
  reviewCarName: {
    ...TYPOGRAPHY.caption,
    color: THEME_COLORS.textSecondary,
    fontWeight: "600",
    flexShrink: 1,
  },
  reviewComment: {
    ...TYPOGRAPHY.body,
    marginTop: SPACE.sm,
  },
  reviewNoComment: {
    ...TYPOGRAPHY.body,
    color: THEME_COLORS.textMuted,
    fontStyle: "italic",
    marginTop: SPACE.sm,
  },
})
