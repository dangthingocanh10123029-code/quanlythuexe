// Định dạng tiền Việt: 1200000 -> "1.200.000đ" (không dùng Intl vì Hermes trên Android hỗ trợ locale chưa đầy đủ)
export const formatNumber = (value: number): string => {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export const formatCurrency = (amount: number | string): string => {
  return `${formatNumber(Number(amount) || 0)}đ`
}

const pad = (n: number) => n.toString().padStart(2, "0")
const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"]

// Định dạng ngày kiểu Việt Nam: "short" -> 04/10/2026, "long" -> Thứ hai, 04 tháng 10, 2026, "time" -> 14:30
export const formatDate = (date: Date | string | number, format = "short"): string => {
  const dateObj = date instanceof Date ? date : new Date(date)
  if (isNaN(dateObj.getTime())) return ""

  const day = pad(dateObj.getDate())
  const month = pad(dateObj.getMonth() + 1)
  const year = dateObj.getFullYear()
  const time = `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`

  switch (format) {
    case "long":
      return `${WEEKDAYS[dateObj.getDay()]}, ${day} tháng ${dateObj.getMonth() + 1}, ${year}`
    case "time":
      return time
    case "datetime":
      return `${time} ${day}/${month}/${year}`
    default:
      return `${day}/${month}/${year}`
  }
}

export const calculateDaysBetween = (startDate: Date, endDate: Date): number => {
  const timeDifference = endDate.getTime() - startDate.getTime()
  return Math.ceil(timeDifference / (1000 * 3600 * 24))
}

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9)
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Số điện thoại Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (10 số)
export const validatePhone = (phone: string): boolean => {
  const digits = phone.replace(/[\s.\-]/g, "")
  return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(digits)
}

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength) + "..."
}

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): T => {
  let timeoutId: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }) as T
}

export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}
