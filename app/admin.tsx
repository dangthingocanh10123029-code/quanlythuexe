"use client"

import { useState, useEffect, useMemo } from "react"
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
  { id: "cars", name: "Quản lý xe", icon: "car" },
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
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=4169e1&color=fff`

// Nhận diện chuỗi giá kiểu "1.200.000" / "1 200 000" / "1200000"
const parsePriceInput = (value: string): number => {
  const trimmed = (value || "").trim()
  if (/^\d{1,3}([.,\s]\d{3})+$/.test(trimmed)) return Number(trimmed.replace(/[.,\s]/g, ""))
  return Number(trimmed)
}

const screenWidth = Dimensions.get("window").width
const chartConfig = {
  backgroundColor: "#ffffff",
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  propsForLabels: {
    fontSize: 12
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

  const renderStatusBadge = (status: string) => {
    const s = normalizeStatus(status)
    const badgeStyle =
      s === "cancelled" ? styles.cancelledBadge :
      s === "pending" ? styles.pendingBadge :
      s === "upcoming" ? styles.upcomingBadge :
      s === "completed" ? styles.completedBadge :
      styles.activeBadge
    const textStyle =
      s === "cancelled" ? styles.cancelledText :
      s === "pending" ? styles.pendingText :
      s === "upcoming" ? styles.upcomingText :
      s === "completed" ? styles.completedText :
      styles.activeText
    return (
      <View style={[styles.statusBadge, badgeStyle]}>
        <Text style={[styles.statusText, textStyle]}>{getBookingStatusLabel(status) || "Không rõ"}</Text>
      </View>
    )
  }

  const renderEmpty = (icon: string, text: string) => (
    <View style={styles.emptyState}>
      <Ionicons name={icon as any} size={40} color="#c0c0c0" />
      <Text style={styles.emptyStateText}>{text}</Text>
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

  const renderCarCard = (car: Car) => (
    <View key={car.id} style={styles.carCard}>
      {car.image ? (
        <Image
          source={{ uri: car.image }}
          style={styles.carImage}
          resizeMode="cover"
        />
      ) : null}
      <View style={styles.carInfo}>
        <Text style={styles.carName}>{car.name}</Text>
        <Text style={styles.carBrand}>{car.brand}{car.year ? ` · ${car.year}` : ""}</Text>
        <Text style={styles.carPrice}>{formatCurrency(car.pricePerDay)}/ngày</Text>
        <View style={styles.carStats}>
          <Text style={styles.carStat}>Loại xe: {car.type}</Text>
          <Text style={styles.carStat}>Số chỗ: {car.seats}</Text>
          <Text style={styles.carStat}>Nhiên liệu: {car.fuel}</Text>
        </View>
        <View style={styles.carStatus}>
          <Text>Trạng thái: {getCarStatusLabel(car.status)}</Text>
          <Text>Lượt đặt: {car.bookings ?? 0}</Text>
        </View>
      </View>
      <View style={styles.carActions}>
        <TouchableOpacity style={styles.editButton} onPress={() => openEditCarForm(car)}>
          <Ionicons name="pencil" size={16} color="#4169e1" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteCar(car)}
        >
          <Ionicons name="trash" size={16} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFieldError = (field: string) =>
    formErrors[field] ? <Text style={styles.fieldError}>{formErrors[field]}</Text> : null

  const renderCarsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Quản lý xe</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddCarForm}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Thêm xe</Text>
        </TouchableOpacity>
      </View>

      {showAddCarForm && (
        <View style={styles.addCarForm}>
          <Text style={styles.formTitle}>{editingCarId ? "Sửa thông tin xe" : "Thêm xe mới"}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên xe *</Text>
            <TextInput
              style={[styles.input, formErrors.name ? styles.inputError : null]}
              placeholder="VD: BMW X5"
              value={newCar.name}
              onChangeText={(text) => updateField("name", text)}
            />
            {renderFieldError("name")}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hãng xe *</Text>
            <TextInput
              style={[styles.input, formErrors.brand ? styles.inputError : null]}
              placeholder="VD: BMW"
              value={newCar.brand}
              onChangeText={(text) => updateField("brand", text)}
            />
            {renderFieldError("brand")}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Giá thuê/ngày (VND) *</Text>
            <TextInput
              style={[styles.input, formErrors.price ? styles.inputError : null]}
              placeholder="VD: 1200000"
              value={newCar.price}
              onChangeText={(text) => updateField("price", text)}
              keyboardType="numeric"
            />
            {renderFieldError("price")}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Loại xe</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: SUV, Sedan"
              value={newCar.type}
              onChangeText={(text) => updateField("type", text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nhiên liệu</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Xăng, Dầu diesel"
              value={newCar.fuel}
              onChangeText={(text) => updateField("fuel", text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số chỗ ngồi *</Text>
            <TextInput
              style={[styles.input, formErrors.seats ? styles.inputError : null]}
              placeholder="VD: 5"
              value={newCar.seats}
              onChangeText={(text) => updateField("seats", text)}
              keyboardType="numeric"
            />
            {renderFieldError("seats")}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Năm sản xuất</Text>
            <TextInput
              style={[styles.input, formErrors.year ? styles.inputError : null]}
              placeholder={`VD: ${new Date().getFullYear()}`}
              value={newCar.year}
              onChangeText={(text) => updateField("year", text)}
              keyboardType="numeric"
              maxLength={4}
            />
            {renderFieldError("year")}
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
                >
                  <Text style={styles.changeImageText}>Đổi ảnh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickImage}
              >
                <Ionicons name="cloud-upload" size={24} color="#4169e1" />
                <Text style={styles.uploadButtonText}>Tải ảnh lên</Text>
              </TouchableOpacity>
            )}
            {renderFieldError("carImage")}
          </View>

          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={closeCarForm}>
              <Text style={styles.cancelButtonText}>Huỷ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={handleSaveCar}
              disabled={isSubmitting}
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

  const renderBookingsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Quản lý đơn đặt xe</Text>

      <View style={styles.statsGrid}>
        <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.statNumber}>{stats.activeBookings}</Text>
          <Text style={styles.statLabel}>Đơn đang thuê</Text>
        </Animated.View>
        <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.statNumber}>{stats.totalBookings}</Text>
          <Text style={styles.statLabel}>Tổng số đơn</Text>
        </Animated.View>
        <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.statNumber}>{formatCurrency(stats.monthRevenue)}</Text>
          <Text style={styles.statLabel}>Doanh thu tháng này</Text>
        </Animated.View>
      </View>

      <View style={styles.bookingsFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
          {BOOKING_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterTab, bookingFilter === f.id && styles.activeFilterTab]}
              onPress={() => setBookingFilter(f.id)}
            >
              <Text style={[styles.filterTabText, bookingFilter === f.id && styles.activeFilterTabText]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên xe, khách hàng, mã đơn..."
          placeholderTextColor="#666666"
          value={bookingSearch}
          onChangeText={setBookingSearch}
          autoCapitalize="none"
        />
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
                  <Ionicons name="car-outline" size={28} color="#999999" />
                </View>
              )}
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingCarName}>{booking.carName}</Text>
                <View style={styles.customerInfo}>
                  <Image
                    source={{ uri: getCustomerAvatar(booking) }}
                    style={styles.customerAvatar}
                  />
                  <Text style={styles.customerName}>{getCustomerName(booking)}</Text>
                </View>
                <Text style={styles.bookingCode}>Mã đơn: {booking.id}</Text>
              </View>
              {renderStatusBadge(booking.status)}
            </View>

            <View style={styles.bookingDetails}>
              <View style={styles.bookingDetailRow}>
                <View style={styles.bookingDetailItem}>
                  <Ionicons name="calendar-outline" size={16} color="#666666" />
                  <Text style={styles.bookingDetailText}>
                    {booking.createdAt ? `Đặt ${formatDate(booking.createdAt)}` : "Chưa rõ ngày đặt"}
                    {booking.duration ? ` · ${booking.duration} ngày` : ""}
                  </Text>
                </View>
                <View style={styles.bookingDetailItem}>
                  <Ionicons name="cash-outline" size={16} color="#666666" />
                  <Text style={styles.bookingDetailText}>
                    {formatCurrency(booking.price)}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.paymentStatus,
                paymentKey === 'paid' ? styles.paidStatus :
                paymentKey === 'pending' ? styles.pendingStatus :
                styles.refundedStatus
              ]}>
                <Ionicons
                  name={paymentKey === 'paid' ? 'checkmark-circle' :
                        paymentKey === 'pending' ? 'time' : 'refresh-circle'}
                  size={16}
                  color={paymentKey === 'paid' ? '#00a152' :
                         paymentKey === 'pending' ? '#ffa000' : '#ff4444'}
                />
                <Text style={[
                  styles.paymentStatusText,
                  paymentKey === 'paid' ? styles.paidText :
                  paymentKey === 'pending' ? styles.pendingText :
                  styles.refundedText
                ]}>
                  {PAYMENT_STATUS_LABELS[paymentKey] ?? paymentKey}
                  {booking.payment?.method ? ` · ${booking.payment.method}` : ""}
                </Text>
              </View>
            </View>

            <View style={styles.bookingActions}>
              <TouchableOpacity style={styles.bookingActionButton} onPress={() => setSelectedBookingId(booking.id)}>
                <Ionicons name="eye-outline" size={18} color="#4169e1" />
                <Text style={styles.actionButtonText}>Xem chi tiết</Text>
              </TouchableOpacity>
              {(status === "upcoming" || status === "active") && (
                <TouchableOpacity style={styles.bookingActionButton} onPress={() => handleAdvanceBooking(booking)}>
                  <Ionicons name={status === "upcoming" ? "key-outline" : "return-down-back-outline"} size={18} color="#4169e1" />
                  <Text style={styles.actionButtonText}>{status === "upcoming" ? "Giao xe" : "Nhận lại xe"}</Text>
                </TouchableOpacity>
              )}
              {canCancel(booking) && (
                <TouchableOpacity style={[styles.bookingActionButton, styles.cancelBookingButton]} onPress={() => handleCancelBooking(booking)}>
                  <Ionicons name="close-circle-outline" size={18} color="#ff4444" />
                  <Text style={[styles.actionButtonText, styles.cancelBookingText]}>Huỷ đơn</Text>
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
      <Text style={styles.tabTitle}>Quản lý người dùng</Text>

      <View style={styles.statsGrid}>
        <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.statNumber}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Tổng người dùng</Text>
        </Animated.View>
        <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.statNumber}>{stats.activeUsers}</Text>
          <Text style={styles.statLabel}>Đang hoạt động</Text>
        </Animated.View>
        <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.statNumber}>{stats.totalBookings}</Text>
          <Text style={styles.statLabel}>Tổng số đơn</Text>
        </Animated.View>
      </View>

      <View style={styles.userFilters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên, email, số điện thoại..."
          placeholderTextColor="#666666"
          value={userSearch}
          onChangeText={setUserSearch}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.filterButton, (showUserFilters || userFilter !== "all") && styles.filterButtonActive]}
          onPress={() => setShowUserFilters(!showUserFilters)}
        >
          <Ionicons name="filter" size={18} color="#4169e1" />
          <Text style={styles.filterButtonText}>Bộ lọc</Text>
        </TouchableOpacity>
      </View>

      {showUserFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterTabs, { marginTop: 12 }]}>
          {USER_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterTab, userFilter === f.id && styles.activeFilterTab]}
              onPress={() => setUserFilter(f.id)}
            >
              <Text style={[styles.filterTabText, userFilter === f.id && styles.activeFilterTabText]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
              <View style={[styles.userInfo, { flex: 1 }]}>
                <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{user.name}{user.isAdmin ? " · Quản trị viên" : ""}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>
              <View style={[
                styles.statusBadge,
                user.status === 'active' ? styles.activeBadge : styles.inactiveBadge
              ]}>
                <Text style={[
                  styles.statusText,
                  user.status === 'active' ? styles.activeText : styles.inactiveText
                ]}>
                  {USER_STATUS_LABELS[user.status]}
                </Text>
              </View>
            </View>

            <View style={styles.userDetails}>
              <View style={styles.userDetailItem}>
                <Ionicons name="call-outline" size={16} color="#666666" />
                <Text style={styles.userDetailText}>{user.phone || "Chưa có số điện thoại"}</Text>
              </View>
              <View style={styles.userDetailItem}>
                <Ionicons name="calendar-outline" size={16} color="#666666" />
                <Text style={styles.userDetailText}>
                  {user.joinDate ? `Tham gia ${formatDate(user.joinDate)}` : "Chưa rõ ngày tham gia"}
                </Text>
              </View>
              <View style={styles.userDetailItem}>
                <Ionicons name="car-outline" size={16} color="#666666" />
                <Text style={styles.userDetailText}>{bookingCountByUser[user.id] || 0} đơn đặt xe</Text>
              </View>
            </View>

            <View style={styles.userActions}>
              <TouchableOpacity style={styles.userAction} onPress={() => setSelectedUserId(user.id)}>
                <Ionicons name="eye-outline" size={18} color="#4169e1" />
                <Text style={styles.actionText}>Chi tiết</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.userAction} onPress={() => handleToggleUserLock(user)}>
                <Ionicons
                  name={user.status === "active" ? "lock-closed-outline" : "lock-open-outline"}
                  size={18}
                  color={user.status === "active" ? "#ff4444" : "#00a152"}
                />
                <Text style={[styles.actionText, { color: user.status === "active" ? '#ff4444' : '#00a152' }]}>
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
      <Text style={styles.tabTitle}>Báo cáo & Thống kê</Text>

      <View style={[styles.metricsGrid, { marginTop: 16, marginBottom: 16 }]}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{stats.totalCars}</Text>
          <Text style={styles.metricLabel}>Tổng số xe</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{stats.totalBookings}</Text>
          <Text style={styles.metricLabel}>Tổng số đơn</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, styles.metricValueSmall]}>{formatCurrency(stats.totalRevenue)}</Text>
          <Text style={styles.metricLabel}>Doanh thu (đơn đã thanh toán)</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{stats.totalUsers}</Text>
          <Text style={styles.metricLabel}>Người dùng</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Doanh thu 6 tháng gần nhất (triệu đồng)</Text>
        {hasRevenue ? (
          <LineChart
            data={{
              labels: stats.revenueByMonth.map((m) => m.label),
              datasets: [{
                data: stats.revenueByMonth.map((m) => m.value)
              }]
            }}
            width={screenWidth - 72}
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
        <Text style={styles.chartTitle}>Số xe theo loại</Text>
        {stats.carsByType.length > 0 ? (
          <BarChart
            data={{
              labels: stats.carsByType.map((t) => t.label),
              datasets: [{
                data: stats.carsByType.map((t) => t.value)
              }]
            }}
            width={screenWidth - 72}
            height={220}
            yAxisLabel=""
            yAxisSuffix=" xe"
            chartConfig={{ ...chartConfig, decimalPlaces: 0 }}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết đơn đặt xe</Text>
              <TouchableOpacity onPress={() => setSelectedBookingId(null)}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {imageSource ? (
                <Image source={imageSource} style={styles.modalCarImage} resizeMode="contain" />
              ) : null}
              <View style={styles.modalStatusRow}>
                <Text style={styles.bookingCarName}>{booking.carName}</Text>
                {renderStatusBadge(booking.status)}
              </View>

              <Text style={styles.detailSection}>Thông tin đơn</Text>
              {renderDetailRow("Mã đơn", booking.id)}
              {renderDetailRow("Ngày đặt", formatAnyDate(booking.createdAt, "datetime"))}
              {renderDetailRow("Trạng thái", getBookingStatusLabel(booking.status))}
              {booking.cancelledAt ? renderDetailRow("Ngày huỷ", formatDate(booking.cancelledAt, "datetime")) : null}

              <Text style={styles.detailSection}>Khách hàng</Text>
              {renderDetailRow("Họ tên", customer?.name || "Khách hàng không xác định")}
              {renderDetailRow("Email", customer?.email || "")}
              {renderDetailRow("Số điện thoại", customer?.phone || "")}

              <Text style={styles.detailSection}>Thuê xe</Text>
              {renderDetailRow("Xe", booking.carName)}
              {renderDetailRow("Thời gian thuê", getRentalPeriodText(booking))}
              {renderDetailRow("Điểm nhận xe", booking.location)}

              <Text style={styles.detailSection}>Dịch vụ thêm</Text>
              {booking.selectedAddOns.length === 0 ? (
                <Text style={styles.detailEmpty}>Không có</Text>
              ) : (
                booking.selectedAddOns.map((addon, index) => (
                  <View key={`${addon.id ?? index}`}>
                    {renderDetailRow(addon.name || "Dịch vụ", formatCurrency(addon.price || 0))}
                  </View>
                ))
              )}

              <Text style={styles.detailSection}>Thanh toán</Text>
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

              <View style={styles.modalActions}>
                {(status === "upcoming" || status === "active") && (
                  <TouchableOpacity style={[styles.modalActionButton, styles.modalPrimaryButton]} onPress={() => handleAdvanceBooking(booking)}>
                    <Text style={styles.modalPrimaryText}>{status === "upcoming" ? "Giao xe" : "Nhận lại xe"}</Text>
                  </TouchableOpacity>
                )}
                {canCancel(booking) && (
                  <TouchableOpacity style={[styles.modalActionButton, styles.modalDangerButton]} onPress={() => handleCancelBooking(booking)}>
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông tin người dùng</Text>
              <TouchableOpacity onPress={() => setSelectedUserId(null)}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.userInfo, { marginBottom: 12 }]}>
                <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>
              {renderDetailRow("Số điện thoại", user.phone)}
              {renderDetailRow("Ngày tham gia", user.joinDate ? formatDate(user.joinDate) : "")}
              {renderDetailRow("Vai trò", user.isAdmin ? "Quản trị viên" : "Khách hàng")}
              {renderDetailRow("Trạng thái", USER_STATUS_LABELS[user.status])}
              {renderDetailRow("Số đơn đặt xe", String(userBookings.length))}
              {renderDetailRow("Tổng chi tiêu", formatCurrency(spent))}

              <Text style={styles.detailSection}>Đơn đặt xe</Text>
              {userBookings.length === 0 ? (
                <Text style={styles.detailEmpty}>Chưa có đơn nào</Text>
              ) : (
                userBookings.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={styles.userBookingRow}
                    onPress={() => {
                      setSelectedUserId(null)
                      setSelectedBookingId(b.id)
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userBookingName}>{b.carName}</Text>
                      <Text style={styles.userEmail}>
                        {b.createdAt ? formatDate(b.createdAt) : ""} · {formatCurrency(b.price)}
                      </Text>
                    </View>
                    {renderStatusBadge(b.status)}
                  </TouchableOpacity>
                ))
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionButton, user.status === "active" ? styles.modalDangerButton : styles.modalPrimaryButton]}
                  onPress={() => handleToggleUserLock(user)}
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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trang quản trị</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {adminTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons name={tab.icon as any} size={20} color={activeTab === tab.id ? "#ffffff" : "#666666"} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {renderTabContent()}
      </ScrollView>

      {renderBookingDetailModal()}
      {renderUserDetailModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
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
  tabsContainer: {
    backgroundColor: "#f8f9fa",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: "#ffffff",
  },
  activeTab: {
    backgroundColor: "#4169e1",
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
  },
  activeTabText: {
    color: "#ffffff",
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  tabHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4169e1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  addCarForm: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 16,
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
    minHeight: 80,
    textAlignVertical: "top",
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
    backgroundColor: "#4169e1",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#d1e7dd",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  carsList: {
    gap: 12,
  },
  carCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  carImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 12,
  },
  carInfo: {
    gap: 4,
  },
  carName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  carBrand: {
    fontSize: 14,
    color: '#666666',
  },
  carPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4169e1',
  },
  carStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  carStats: {
    flexDirection: "row",
    gap: 16,
  },
  carStat: {
    fontSize: 12,
    color: "#666666",
  },
  carActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    padding: 8,
    backgroundColor: "#f0f8ff",
    borderRadius: 6,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: "#fff5f5",
    borderRadius: 6,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4169e1",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  imagePreviewContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  changeImageButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  changeImageText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#4169e1',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  uploadButtonText: {
    color: '#4169e1',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000000',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
    transform: [{ scale: 1 }], // Enable hardware acceleration
  },
  statCardLarge: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statGrowth: {
    color: "#00bb02",
    fontSize: 12,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    transform: [{ scale: 1 }], // Enable hardware acceleration
  },
  metricCard: {
    width: "45%",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4169e1",
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  userFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
  },
  usersList: {
    marginTop: 16,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  userEmail: {
    fontSize: 14,
    color: '#666666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#e6f4ea',
  },
  inactiveBadge: {
    backgroundColor: '#feecea',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activeText: {
    color: '#00a152',
  },
  inactiveText: {
    color: '#ff4444',
  },
  userDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    gap: 8,
  },
  userDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userDetailText: {
    fontSize: 14,
    color: '#666666',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  userAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#4169e1',
    fontWeight: '600',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    color: '#4169e1',
    fontSize: 14,
    fontWeight: '600',
  },
  bookingsFilter: {
    marginTop: 20,
    gap: 12,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  activeFilterTab: {
    backgroundColor: '#4169e1',
  },
  filterTabText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: '#ffffff',
  },
  bookingsList: {
    marginTop: 16,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  bookingCarImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingCarName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  customerName: {
    fontSize: 14,
    color: '#666666',
  },
  completedBadge: {
    backgroundColor: '#e6f4ea',
  },
  cancelledBadge: {
    backgroundColor: '#feecea',
  },
  completedText: {
    color: '#00a152',
  },
  cancelledText: {
    color: '#ff4444',
  },
  bookingDetails: {
    marginTop: 16,
    gap: 12,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bookingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingDetailText: {
    fontSize: 14,
    color: '#666666',
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  paidStatus: {
    backgroundColor: '#e6f4ea',
  },
  pendingStatus: {
    backgroundColor: '#fff3e0',
  },
  refundedStatus: {
    backgroundColor: '#feecea',
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  paidText: {
    color: '#00a152',
  },
  pendingText: {
    color: '#ffa000',
  },
  refundedText: {
    color: '#ff4444',
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bookingActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4169e1',
    fontWeight: '600',
  },
  cancelBookingButton: {
    backgroundColor: '#fff5f5',
  },
  cancelBookingText: {
    color: '#ff4444',
  },
  pendingBadge: {
    backgroundColor: '#fff3e0',
  },
  upcomingBadge: {
    backgroundColor: '#e8f0fe',
  },
  upcomingText: {
    color: '#4169e1',
  },
  bookingCode: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  imagePlaceholder: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  fieldError: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  filterButtonActive: {
    borderWidth: 1,
    borderColor: '#4169e1',
  },
  metricValueSmall: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalCarImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  modalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailSection: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    textAlign: 'right',
  },
  detailEmpty: {
    fontSize: 14,
    color: '#999999',
  },
  userBookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  userBookingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 12,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalPrimaryButton: {
    backgroundColor: '#4169e1',
  },
  modalPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalDangerButton: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  modalDangerText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
})
