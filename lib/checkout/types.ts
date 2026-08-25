export type CheckoutMethod = "delivery" | "cuba" | "pickup";
export type CheckoutAddressMode = "free" | "zones" | "distance";

export type CheckoutBlocks = {
  customer: boolean;
  recipient: boolean;
  address: boolean;
  delivery: boolean;
  coupon: boolean;
  notes: boolean;
  summary: boolean;
  whatsapp: boolean;
};

export type CheckoutSettings = {
  id?: string;
  store_id: string;
  enabled_delivery: boolean;
  enabled_cuba: boolean;
  enabled_pickup: boolean;
  default_method: CheckoutMethod;
  delivery_address_mode: CheckoutAddressMode;
  cuba_address_mode: CheckoutAddressMode;
  show_delivery_price: boolean;
  fixed_delivery_fee: number;
  delivery_origin_address: string;
  delivery_origin_latitude: number | null;
  delivery_origin_longitude: number | null;
  distance_base_km: number;
  distance_base_fee: number;
  distance_additional_fee_per_km: number;
  max_delivery_distance_km: number | null;
  blocks: CheckoutBlocks;
  created_at?: string;
  updated_at?: string;
};

export const DEFAULT_CHECKOUT_BLOCKS: CheckoutBlocks = {
  customer: true,
  recipient: true,
  address: true,
  delivery: true,
  coupon: true,
  notes: true,
  summary: true,
  whatsapp: true,
};

export function createDefaultCheckoutSettings(storeId: string): CheckoutSettings {
  return {
    store_id: storeId,
    enabled_delivery: false,
    enabled_cuba: true,
    enabled_pickup: false,
    default_method: "cuba",
    delivery_address_mode: "free",
    cuba_address_mode: "zones",
    show_delivery_price: true,
    fixed_delivery_fee: 0,
    delivery_origin_address: "",
    delivery_origin_latitude: null,
    delivery_origin_longitude: null,
    distance_base_km: 1,
    distance_base_fee: 200,
    distance_additional_fee_per_km: 100,
    max_delivery_distance_km: null,
    blocks: { ...DEFAULT_CHECKOUT_BLOCKS },
  };
}
