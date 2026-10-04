export type AppRoutes = 
  | "/login"
  | "/register" 
  | "/otp"
  | "/(tabs)"
  | "/(tabs)/home"
  | `/(tabs)/home?${string}`
  | `/(tabs)/home#${string}`
  | "/(tabs)/search"
  | "/(tabs)/bookings"
  | "/(tabs)/profile"
  | "/profile/personal-info"
  | "/profile/license"
  | "/profile/payment"
  | "/profile/history"
  | "/profile/settings"
  | "/profile/support"
  | "/car-details"
  | "/checkout"
  | "/privacy-policy"
  | `privacy-policy?${string}`
  | `privacy-policy#${string}`
  | "/terms-of-service"
  | `terms-of-service?${string}`
  | `terms-of-service#${string}`;

export type AppRoutesWithParams = AppRoutes | `${AppRoutes}?${string}` | `${AppRoutes}#${string}`;