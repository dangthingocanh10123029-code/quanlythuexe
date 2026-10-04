import type { ImageSourcePropType } from "react-native"

// Registry tĩnh giúp Metro bundler nhận đủ asset, đồng thời tránh lặp `require`
// và đảm bảo logo/hình khuyến mãi được map nhất quán trên mọi màn.
export const BRAND_ASSETS = {
  BMW: require("../assets/brandlogos/bmw.png"),
  Mercedes: require("../assets/brandlogos/mercedes.png"),
  Audi: require("../assets/brandlogos/audi.png"),
  Toyota: require("../assets/brandlogos/toyota.png"),
  Honda: require("../assets/brandlogos/honda.png"),
  Nissan: require("../assets/brandlogos/nissan.png"),
  Ford: require("../assets/brandlogos/ford.png"),
  Hyundai: require("../assets/brandlogos/hyundai.png"),
} satisfies Record<string, ImageSourcePropType>

export type SupportedBrand = keyof typeof BRAND_ASSETS

export const getBrandAsset = (brand: string): ImageSourcePropType | null =>
  BRAND_ASSETS[brand as SupportedBrand] ?? null

export const PROMO_ASSETS = {
  onboardingCars: require("../assets/adv cars.gif"),
  welcome360: require("../assets/modal_360.gif"),
  firstRide: require("../assets/coup1.png"),
  weekend: require("../assets/coup2.png"),
} satisfies Record<string, ImageSourcePropType>

export const PAYMENT_ASSETS = {
  cardChip: require("../assets/card-chip.png"),
  cardNetwork: require("../assets/creditcard-logo.png"),
  qrCode: require("../assets/qr-code.jpg"),
} satisfies Record<string, ImageSourcePropType>

