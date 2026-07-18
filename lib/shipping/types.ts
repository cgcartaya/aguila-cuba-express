export const SHIPPING_STATUSES = [
  "received_miami",
  "preparing",
  "in_transit",
  "received_cuba",
  "out_for_delivery",
  "delivered",
  "issue",
] as const;

export type ShippingStatus = (typeof SHIPPING_STATUSES)[number];

export type Shipment = {
  id: string;
  order_number: number | null;
  store_id: string;
  location: string;
  country_id: string | null;
  province_id: string | null;
  municipality_id: string | null;
  shipping_location_id: string | null;
  service_type_id: string | null;
  service_type_name: string | null;
  recipient_name: string | null;
  recipient_address: string | null;
  recipient_phone: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  notes: string | null;
  delivered: boolean;
  created_date: string | null;
  delivered_date: string | null;
  delivery_photo_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tracking_code: string | null;
  status: ShippingStatus;
  public_tracking_enabled: boolean;
  assigned_driver_id: string | null;
  assigned_driver_name: string | null;
  weight_lb: number;
  rate_per_lb: number;
  weight_subtotal: number;
  extra_fees_total: number;
  contains_package: boolean;
  contains_money: boolean;
  money_amount: number;
  money_commission_rate: number;
  money_commission: number;
  money_discount: number;
  money_discount_reason: string | null;
  money_total: number;
  discount_amount: number;
  discount_reason: string | null;
  service_price: number;
  amount_paid: number;
  balance_due: number;
  payment_status: "pending" | "partial" | "paid";
  payment_method: string | null;
};

export type ShippingDriver = {
  id: string;
  name: string;
  username: string;
  is_active: boolean;
};

export type ShippingCountry = {
  id: string;
  store_id: string;
  name: string;
  code: string;
  is_active: boolean;
  sort_order: number;
};

export type ShippingProvince = {
  id: string;
  store_id: string;
  country_id: string;
  name: string;
  code: string;
  is_active: boolean;
  sort_order: number;
};

export type ShippingMunicipality = {
  id: string;
  store_id: string;
  province_id: string;
  name: string;
  code: string;
  is_active: boolean;
  sort_order: number;
};

export type ShippingLocation = {
  id: string;
  store_id: string;
  municipality_id: string;
  name: string;
  legacy_code: string;
  is_active: boolean;
  sort_order: number;
};

export type ShippingServiceType = {
  id: string;
  store_id: string;
  name: string;
  code: string;
  legacy_prefix: string;
  billing_mode: "per_lb" | "fixed" | "percentage";
  is_active: boolean;
  sort_order: number;
};

export type ShippingRate = {
  id: string;
  store_id: string;
  location_id: string;
  service_type_id: string;
  rate_per_lb: number;
  minimum_weight_lb: number;
  minimum_charge: number;
  is_active: boolean;
};

export type ShippingExtraFee = {
  id: string;
  store_id: string;
  name: string;
  code: string;
  amount: number;
  calculation_type: "fixed" | "per_lb" | "percentage";
  is_active: boolean;
  sort_order: number;
};

export type ShipmentFeeSelection = {
  fee_id: string;
  fee_name: string;
  calculation_type: "fixed" | "per_lb" | "percentage";
  configured_amount: number;
  calculated_amount: number;
};

export type ShippingSettings = {
  id: string;
  store_id: string;
  default_country_id: string | null;
  default_province_id: string | null;
  currency: string;
  phone_digits_min: number;
  phone_digits_max: number;
  default_rate_per_lb: number;
  money_threshold: number;
  money_rate_below_threshold: number;
  money_rate_at_or_above_threshold: number;
  allow_manual_discount: boolean;
  maximum_manual_discount: number | null;
};

export type ShipmentInput = {
  location: string;
  country_id: string | null;
  province_id: string | null;
  municipality_id: string | null;
  shipping_location_id: string | null;
  service_type_id: string | null;
  service_type_name: string | null;
  recipient_name: string;
  recipient_address: string;
  recipient_phone: string;
  sender_name: string;
  sender_phone: string;
  notes: string;
  status: ShippingStatus;
  assigned_driver_id: string | null;
  assigned_driver_name: string | null;
  public_tracking_enabled: boolean;
  weight_lb: number;
  rate_per_lb: number;
  weight_subtotal: number;
  extra_fees_total: number;
  contains_package: boolean;
  contains_money: boolean;
  money_amount: number;
  money_commission_rate: number;
  money_commission: number;
  money_discount: number;
  money_discount_reason: string;
  money_total: number;
  discount_amount: number;
  discount_reason: string;
  service_price: number;
  amount_paid: number;
  balance_due: number;
  payment_method: string;
  selected_fees: ShipmentFeeSelection[];
};

export function getShippingStatusLabel(status: ShippingStatus | string) {
  const labels: Record<string, string> = {
    received_miami: "Recibido en Miami",
    preparing: "Preparando salida",
    in_transit: "En tránsito hacia Cuba",
    received_cuba: "Recibido en Cuba",
    out_for_delivery: "En reparto",
    delivered: "Entregado",
    issue: "Incidencia",
  };

  return labels[status] || status;
}

export function buildLegacyLocation(
  legacyCode: string,
  legacyPrefix: string
) {
  if (!legacyPrefix) return legacyCode;
  return `${legacyPrefix}${legacyCode}`;
}

export function calculateMoneyCommission(
  amount: number,
  settings: Pick<ShippingSettings, "money_threshold" | "money_rate_below_threshold" | "money_rate_at_or_above_threshold">
) {
  const safeAmount = Math.max(Number(amount || 0), 0);
  const rate = safeAmount >= Number(settings.money_threshold || 1000)
    ? Number(settings.money_rate_at_or_above_threshold || 5)
    : Number(settings.money_rate_below_threshold || 8);
  return { rate, commission: Number(((safeAmount * rate) / 100).toFixed(2)) };
}

export type ShipmentItem = {
  id: string;
  store_id: string;
  shipment_id: string;
  item_type: "PACKAGE" | "MONEY" | "EXTRA_FEE" | "DISCOUNT";
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  metadata: Record<string, unknown>;
  sort_order: number;
};
