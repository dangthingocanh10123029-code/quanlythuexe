"use client"

import { useState, useEffect, useMemo } from "react"
import type { StyleProp, TextStyle } from "react-native"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, Animated, Modal, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { db } from "../config/firebase"
import * as ImagePicker from 'expo-image-picker';
import { LineChart, BarChart } from "react-native-chart-kit"
import { Dimensions } from "react-native"
import { formatCurrency, formatDate } from "../utils/helpers"
import { getBookingStatusLabel, PAYMENT_STATUS_LABELS } from "../utils/constants"
import { cars as localCars } from "../data/cars"
import { THEME_COLORS, RADIUS, SPACE, SHADOWS, TYPOGRAPHY, UI, PRESS_OPACITY } from "../utils/theme"

interface Car {
  id: string
  name: string
  brand: string
  pricePerDay: number
  type: string
  fuel: string
  seats: number
  year?: number
  image: string
  createdAt: Date
  status: string
  bookings: number
  rating: number
  availability: boolean
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: Date | null;
  status: 'active' | 'inactive';
  isAdmin: boolean;
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
}

const adminTabs = [
  { id: "cars", name: "Xe", icon: "car" },
  { id: "bookings", name: "Đơn đặt xe", icon: "calendar" },
  { id: "users", name: "Người dùng", icon: "people" },
  { id: "reports", name: "Báo cáo", icon: "analytics" },
]

// Bộ lọc trạng thái đơn (giá trị so sánh không phân biệt hoa thường)
const BOOKING_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: getBookingStatusLabel("pending") },
  { id: "upcoming", label: getBookingStatusLabel("upcoming") },
  { id: "active", label: getBookingStatusLabel("active") },
  { id: "completed", label: getBookingStatusLabel("completed") },
  { id: "cancelled", label: getBookingStatusLabel("cancelled") },
]

const USER_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "active", label: "Hoạt động" },
  { id: "inactive", label: "Đã khoá" },
  { id: "admin", label: "Quản trị viên" },
]

// Đơn đã thanh toán được tính vào doanh thu
const PAID_STATUSES = ["upcoming", "active", "completed"]

// Nhãn hiển thị cho trạng thái xe / người dùng (giá trị lưu giữ nguyên tiếng Anh)
const getCarStatusLabel = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "available":
      return "Còn xe"
    case "unavailable":
    case "rented":
      return "Hết xe"
    default:
      return status || "Chưa xác định"
  }
}

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

// Hiển thị yes/no qua Alert (web không hỗ trợ nút trong Alert nên dùng window.confirm)
const confirmAction = (title: string, message: string, confirmText: string, onConfirm: () => void, destructive = true) => {
  if (Platform.OS === "web") {
    const confirmFn = (globalThis as any).confirm
    if (typeof confirmFn !== "function" || confirmFn(`${title}\n\n${message}`)) onConfirm()
    return
  }
  Alert.alert(title, message, [
    { text: "Không", style: "cancel" },
    { text: confirmText, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ])
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
  backgroundColor: "#FFFFFF",
  backgroundGradientFrom: "#FFFFFF",
  backgroundGradientTo: "#FFFFFF",
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
    stroke: "#FFFFFF",
  },
}

// Cặp màu nền soft + chữ đậm cho badge trạng thái
// `info` (Đang thuê) không có trong utils/theme.ts nên định nghĩa cục bộ
const TONES = {
  success: { bg: THEME_COLORS.successSoft, fg: THEME_COLORS.success },
  danger: { bg: THEME_COLORS.dangerSoft, fg: THEME_COLORS.danger },
  warning: { bg: THEME_COLORS.warningSoft, fg: THEME_COLORS.warning },
  primary: { bg: THEME_COLORS.primarySoft, fg: THEME_COLORS.primary },
  info: { bg: "#ECFEFF", fg: "#0E7490" },
  neutral: { bg: THEME_COLORS.surfaceMuted, fg: THEME_COLORS.textSecondary },
}
type Tone = keyof typeof TONES

const getBookingTone = (status?: string): Tone => {
  switch (normalizeStatus(status)) {
    case "cancelled":
      return "danger"
    case "pending":
      return "warning"
    case "upcoming":
      return "primary"
    case "active":
      return "info"
    case "completed":
      return "success"
    default:
      return "neutral"
  }
}

const getCarTone = (status?: string): Tone => {
  switch ((status || "").toLowerCase()) {
    case "available":
      return "success"
    case "unavailable":
    case "rented":
      return "danger"
    default:
      return "neutral"
  }
}

const emptyCarForm = {
  name: "",
  brand: "",
  price: "",
  type: "",
  fuel: "",
  seats: "",
  year: "",
  carImage: "",
}

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState("cars")
  const [showAddCarForm, setShowAddCarForm] = useState(false)
  const [newCar, setNewCar] = useState(emptyCarForm)
  const [editingCarId, setEditingCarId] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [cars, setCars] = useState<Car[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [bookings, setBookings] = useState<Booking[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loaded, setLoaded] = useState({ cars: false, bookings: false, users: false })

  const [bookingFilter, setBookingFilter] = useState("all")
  const [bookingSearch, setBookingSearch] = useState("")
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  const [userSearch, setUserSearch] = useState("")
  const [userFilter, setUserFilter] = useState("all")
  const [showUserFilters, setShowUserFilters] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

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

  // Xe (collection `cars`)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "cars"),
      (snapshot) => {
        const carsData = snapshot.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            name: data.name || "",
            brand: data.brand || "",
            pricePerDay: Number(data.pricePerDay) || 0,
            type: data.type || "",
            fuel: data.fuel || "",
            seats: Number(data.seats) || 0,
            year: data.year ? Number(data.year) : undefined,
            image: data.image,
            createdAt: data.createdAt,
            status: data.status,
            bookings: data.bookings,
            rating: data.rating,
            availability: data.availability,
          }
        }) as Car[]
        setCars(carsData)
        setLoaded((prev) => ({ ...prev, cars: true }))
      },
      (error) => {
        console.error("Error loading cars:", error)
        setLoaded((prev) => ({ ...prev, cars: true }))
      }
    )
    return () => unsubscribe()
  }, [])

  // Đơn đặt xe (collection `bookings`)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "bookings"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const b = d.data()
          return {
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
  }, [])

  // Người dùng (collection `users`)
  useEffect(() => {
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
  }, [])

  const usersById = useMemo(() => {
    const map: Record<string, User> = {}
    users.forEach((u) => { map[u.id] = u })
    return map
  }, [users])

  const bookingCountByUser = useMemo(() => {
    const map: Record<string, number> = {}
    bookings.forEach((b) => { if (b.userId) map[b.userId] = (map[b.userId] || 0) + 1 })
    return map
  }, [bookings])

  const getCustomerName = (booking: Booking) => usersById[booking.userId]?.name || "Khách hàng không xác định"

  const getCustomerAvatar = (booking: Booking) => usersById[booking.userId]?.avatar || avatarFor(getCustomerName(booking))

  // Ảnh xe của đơn: ưu tiên ảnh trong data/cars.ts (đơn tạo từ app), rồi xe trên Firestore, rồi field carImage
  const getBookingImageSource = (booking: Booking): any => {
    const local = localCars.find((c) => c.id === booking.carId)
    if (local?.image) return local.image
    const remote = cars.find((c) => c.id === booking.carId)
    if (remote?.image) return { uri: remote.image }
    if (typeof booking.carImage === "string" && booking.carImage) return { uri: booking.carImage }
    if (typeof booking.carImage === "number") return booking.carImage
    return null
  }

  const isPaid = (booking: Booking) => PAID_STATUSES.includes(normalizeStatus(booking.status))

  const getPaymentStatusKey = (booking: Booking): "paid" | "pending" | "refunded" | "failed" => {
    const paymentStatus = normalizeStatus(booking.payment?.status)
    if (paymentStatus === "refunded") return "refunded"
    if (paymentStatus === "failed") return "failed"
    if (booking.payment || isPaid(booking)) return "paid"
    return "pending"
  }

  // ===== Số liệu thống kê =====
  const stats = useMemo(() => {
    const now = new Date()
    const paidBookings = bookings.filter(isPaid)
    const revenueDate = (b: Booking) => toDate(b.payment?.paidAt) || b.createdAt
    const totalRevenue = paidBookings.reduce((sum, b) => sum + b.price, 0)
    const monthRevenue = paidBookings
      .filter((b) => {
        const d = revenueDate(b)
        return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((sum, b) => sum + b.price, 0)

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
      if (month) month.value += b.price
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

    if (!data.carImage) errors.carImage = "Vui lòng thêm ảnh xe";

    return errors;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Cần cấp quyền', 'Vui lòng cho phép truy cập thư viện ảnh để tải ảnh xe lên.');
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
      setNewCar(prev => ({ ...prev, carImage: base64Image }));
      setFormErrors(prev => ({ ...prev, carImage: "" }));
    }
  };

  const updateField = (field: keyof typeof emptyCarForm, value: string) => {
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
      Alert.alert('Thông tin chưa hợp lệ', messages.join('\n'));
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
        image: newCar.carImage,
      };
      if (newCar.year.trim()) carFields.year = Number(newCar.year.trim());

      if (editingCarId) {
        await updateDoc(doc(db, 'cars', editingCarId), {
          ...carFields,
          updatedAt: new Date().toISOString(),
        });
        Alert.alert('Thành công', 'Đã cập nhật thông tin xe!');
      } else {
        await addDoc(collection(db, 'cars'), {
          ...carFields,
          createdAt: new Date().toISOString(),
          status: 'Available',
          bookings: 0,
          rating: 0,
          availability: true
        });
        Alert.alert('Thành công', 'Đã thêm xe mới!');
      }

      closeCarForm();
    } catch (error: any) {
      console.error('Error saving car:', error);
      Alert.alert(
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
    confirmAction("Xoá xe", `Bạn có chắc muốn xoá xe "${car.name}"? Thao tác này không thể hoàn tác.`, "Xoá", async () => {
      try {
        await deleteDoc(doc(db, "cars", car.id))
        if (editingCarId === car.id) closeCarForm()
        Alert.alert("Thành công", "Đã xoá xe.")
      } catch (error) {
        console.error("Error deleting car:", error)
        Alert.alert("Lỗi", "Không thể xoá xe. Vui lòng thử lại.")
      }
    })
  }

  // ===== Thao tác với đơn đặt xe =====
  const canCancel = (booking: Booking) => ["pending", "upcoming", "active"].includes(normalizeStatus(booking.status))

  const handleCancelBooking = (booking: Booking) => {
    confirmAction(
      "Huỷ đơn",
      `Bạn có chắc muốn huỷ đơn ${booking.carName} của ${getCustomerName(booking)}?`,
      "Huỷ đơn",
      async () => {
        try {
          await updateDoc(doc(db, "bookings", booking.id), {
            status: "Cancelled",
            cancelledAt: new Date(),
          })
          Alert.alert("Thành công", "Đã huỷ đơn đặt xe.")
        } catch (error) {
          console.error("Error cancelling booking:", error)
          Alert.alert("Lỗi", "Không thể huỷ đơn. Vui lòng thử lại.")
        }
      }
    )
  }

  // Upcoming -> Active (giao xe), Active -> Completed (nhận lại xe)
  const handleAdvanceBooking = (booking: Booking) => {
    const current = normalizeStatus(booking.status)
    const isHandOver = current === "upcoming"
    if (!isHandOver && current !== "active") return
    confirmAction(
      isHandOver ? "Giao xe" : "Nhận lại xe",
      isHandOver
        ? `Xác nhận đã giao xe ${booking.carName} cho ${getCustomerName(booking)}?`
        : `Xác nhận đã nhận lại xe ${booking.carName} từ ${getCustomerName(booking)}?`,
      "Xác nhận",
      async () => {
        try {
          await updateDoc(
            doc(db, "bookings", booking.id),
            isHandOver
              ? { status: "Active", handedOverAt: new Date() }
              : { status: "Completed", returnedAt: new Date() }
          )
          Alert.alert("Thành công", isHandOver ? "Đơn đã chuyển sang Đang thuê." : "Đơn đã hoàn thành.")
        } catch (error) {
          console.error("Error updating booking status:", error)
          Alert.alert("Lỗi", "Không thể cập nhật trạng thái đơn. Vui lòng thử lại.")
        }
      },
      false
    )
  }

  // ===== Thao tác với người dùng =====
  const handleToggleUserLock = (user: User) => {
    const locking = user.status === "active"
    confirmAction(
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
          Alert.alert("Thành công", locking ? "Đã khoá tài khoản." : "Đã mở khoá tài khoản.")
        } catch (error) {
          console.error("Error updating user status:", error)
          Alert.alert("Lỗi", "Không thể cập nhật tài khoản. Vui lòng thử lại.")
        }
      },
      locking
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
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
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
        {car.image ? (
          <Image
            source={{ uri: car.image }}
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
            <Text style={styles.carBrand}>{car.brand}{car.year ? ` · ${car.year}` : ""}</Text>
          </View>
          {renderBadge(getCarStatusLabel(car.status), getCarTone(car.status))}
        </View>
        <Text style={styles.carPrice}>{formatCurrency(car.pricePerDay)}/ngày</Text>

        <View style={styles.infoBlock}>
          {renderInfoRow("Loại xe", car.type)}
          {renderInfoRow("Số chỗ", String(car.seats))}
          {renderInfoRow("Nhiên liệu", car.fuel)}
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

  const renderCarsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Quản lý xe</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddCarForm} activeOpacity={PRESS_OPACITY}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Thêm xe</Text>
        </TouchableOpacity>
      </View>

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

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>Loại xe</Text>
              <TextInput
                style={inputStyle("type")}
                placeholder="VD: SUV, Sedan"
                placeholderTextColor={THEME_COLORS.textMuted}
                value={newCar.type}
                onChangeText={(text) => updateField("type", text)}
                {...focusProps("type")}
              />
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
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
            <Text style={styles.inputLabel}>Ảnh xe *</Text>
            {newCar.carImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: newCar.carImage }}
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
        {!loaded.cars
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
            ? renderEmpty("calendar-outline", bookings.length === 0 ? "Chưa có đơn đặt xe nào." : "Không có đơn phù hợp.")
            : filteredBookings.map(booking => {
          const imageSource = getBookingImageSource(booking)
          const paymentKey = getPaymentStatusKey(booking)
          const status = normalizeStatus(booking.status)
          const paymentTone: Tone = paymentKey === "paid" ? "success" : paymentKey === "pending" ? "warning" : "danger"
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
                      paymentKey === 'pending' ? 'time' : 'refresh-circle'}
                size={16}
                color={TONES[paymentTone].fg}
              />
              <Text style={[styles.paymentStatusText, { color: TONES[paymentTone].fg }]}>
                {PAYMENT_STATUS_LABELS[paymentKey] ?? paymentKey}
                {booking.payment?.method ? ` · ${booking.payment.method}` : ""}
              </Text>
            </View>

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
                  <Ionicons name={status === "upcoming" ? "key-outline" : "return-down-back-outline"} size={16} color="#FFFFFF" />
                  <Text style={styles.smallPrimaryText}>{status === "upcoming" ? "Giao xe" : "Nhận lại xe"}</Text>
                </TouchableOpacity>
              )}
              {canCancel(booking) && (
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

  const renderUsersTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, styles.tabTitleSpacing]}>Quản lý người dùng</Text>

      <View style={styles.statsGrid}>
        {renderStatCard("people-outline", "Tổng người dùng", stats.totalUsers)}
        {renderStatCard("pulse-outline", "Đang hoạt động", stats.activeUsers)}
        {renderStatCard("receipt-outline", "Tổng số đơn", stats.totalBookings)}
      </View>

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
            ? renderEmpty("people-outline", users.length === 0 ? "Chưa có người dùng nào." : "Không có người dùng phù hợp.")
            : filteredUsers.map(user => (
          <Animated.View
            key={user.id}
            style={[styles.userCard, { opacity: fadeAnim }]}
          >
            <View style={styles.userHeader}>
              <View style={[styles.userInfo, styles.flex1]}>
                <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                <View style={styles.flex1}>
                  <Text style={styles.userName} numberOfLines={1}>{user.name}{user.isAdmin ? " · Quản trị viên" : ""}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                </View>
              </View>
              {renderBadge(USER_STATUS_LABELS[user.status], user.status === "active" ? "success" : "danger")}
            </View>

            <View style={styles.infoBlock}>
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
        {renderStatCard("wallet-outline", "Doanh thu (đơn đã thanh toán)", formatCurrency(stats.totalRevenue), true)}
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

  const renderTabContent = () => {
    switch (activeTab) {
      case "cars":
        return renderCarsTab()
      case "bookings":
        return renderBookingsTab()
      case "users":
        return renderUsersTab()
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
      (payment?.status && PAYMENT_STATUS_LABELS[normalizeStatus(payment.status)]) ||
      PAYMENT_STATUS_LABELS[paymentKey] ||
      paymentKey
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
                <Text style={[styles.modalCarName, styles.flex1]}>{booking.carName}</Text>
                {renderStatusBadge(booking.status)}
              </View>

              <Text style={styles.detailSection}>Thông tin đơn</Text>
              <View style={styles.detailGroup}>
                {renderDetailRow("Mã đơn", booking.id)}
                {renderDetailRow("Ngày đặt", formatAnyDate(booking.createdAt, "datetime"))}
                {renderDetailRow("Trạng thái", getBookingStatusLabel(booking.status))}
                {booking.cancelledAt ? renderDetailRow("Ngày huỷ", formatDate(booking.cancelledAt, "datetime")) : null}
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
                    {renderDetailRow("Số tiền đã trả", payment.amount != null ? formatCurrency(payment.amount) : "")}
                    {renderDetailRow("Mã giao dịch", payment.transactionId || "")}
                    {renderDetailRow("Thời gian thanh toán", formatAnyDate(payment.paidAt, "datetime"))}
                  </>
                ) : null}
              </View>

              <View style={styles.modalActions}>
                {(status === "upcoming" || status === "active") && (
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalPrimaryButton]}
                    onPress={() => handleAdvanceBooking(booking)}
                    activeOpacity={PRESS_OPACITY}
                  >
                    <Text style={styles.modalPrimaryText}>{status === "upcoming" ? "Giao xe" : "Nhận lại xe"}</Text>
                  </TouchableOpacity>
                )}
                {canCancel(booking) && (
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
    const spent = userBookings.filter(isPaid).reduce((sum, b) => sum + b.price, 0)
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
                {renderDetailRow("Vai trò", user.isAdmin ? "Quản trị viên" : "Khách hàng")}
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()} activeOpacity={PRESS_OPACITY}>
            <Ionicons name="arrow-back" size={20} color={THEME_COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Trang quản trị</Text>
        </View>

        {/* Thanh chuyển tab dạng segmented control */}
        <View style={styles.tabsContainer}>
          {adminTabs.map((tab) => {
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
                <Text style={[styles.tabText, isActive && styles.activeTabText]} numberOfLines={1}>{tab.name}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
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
      {renderUserDetailModal()}
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
    flexDirection: "row",
    backgroundColor: THEME_COLORS.surfaceMuted,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    padding: SPACE.xs,
    gap: SPACE.xs,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.xs,
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
    color: "#FFFFFF",
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
    backgroundColor: "rgba(15, 23, 42, 0.45)",
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
})
