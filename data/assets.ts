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


// Ảnh xe có sẵn, tra theo `car.imageKey` (xem getCarImage trong hooks/useCars)
export const CAR_IMAGES: Record<string, ImageSourcePropType> = {
  audi_a4: require("../assets/cars/audi_a4.png"),
  audi_q7: require("../assets/cars/audi_q7.png"),
  audi_rs5: require("../assets/cars/audi_rs5.png"),
  bmw_3_series: require("../assets/cars/bmw_3_series.png"),
  bmw_m4: require("../assets/cars/bmw_m4.png"),
  bmw_x5: require("../assets/cars/bmw_x5.png"),
  ford_explorer: require("../assets/cars/ford_explorer.png"),
  ford_focus: require("../assets/cars/ford_focus.png"),
  ford_mustang: require("../assets/cars/ford_mustang.png"),
  honda_civic: require("../assets/cars/honda_civic.png"),
  honda_crv: require("../assets/cars/honda_crv.png"),
  honda_nsx: require("../assets/cars/honda_nsx.png"),
  hyundai_genesis: require("../assets/cars/hyundai_genesis.png"),
  hyundai_palisade: require("../assets/cars/hyundai_palisade.png"),
  hyundai_veloster_n: require("../assets/cars/hyundai_veloster_n.png"),
  mercedes_benz: require("../assets/cars/mercedes_benz.gif"),
  mercedes_benz_a_class: require("../assets/cars/mercedes_benz_a_class.png"),
  mercedes_benz_c_class: require("../assets/cars/mercedes_benz_c_class.png"),
  nissan_altima: require("../assets/cars/nissan_altima.png"),
  nissan_gtr: require("../assets/cars/nissan_gtr.png"),
  nissan_patrol: require("../assets/cars/nissan_patrol.png"),
  toyota_camry: require("../assets/cars/toyota_camry.png"),
  toyota_land_cruiser: require("../assets/cars/toyota_land_cruiser.png"),
  toyota_supra: require("../assets/cars/toyota_supra.png"),
}
