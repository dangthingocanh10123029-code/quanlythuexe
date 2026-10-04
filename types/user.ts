export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  displayName: string | null;
}

export interface UserProfile extends User {
  licenseInfo?: DriverLicense
  paymentMethods?: PaymentMethod[]
  preferences?: UserPreferences
}

export interface DriverLicense {
  licenseNumber: string
  expiryDate: string
  issuingAuthority: string
  licenseClass: string
  frontImage: string
  backImage: string
  verified: boolean
  verifiedAt?: Date
}

export interface PaymentMethod {
  id: string
  type: "card" | "momo" | "zalopay"
  name: string
  isDefault: boolean
  details: {
    cardNumber?: string
    expiryDate?: string
    cardholderName?: string
    email?: string
    phone?: string
  }
}

export interface UserPreferences {
  pushNotifications: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  locationServices: boolean
  biometricAuth: boolean
  darkMode: boolean
  autoBackup: boolean
  marketingEmails: boolean
  language: string
  currency: string
}