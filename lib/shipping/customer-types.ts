export type ShippingCustomerType =
  | "new"
  | "regular"
  | "vip"
  | "debt";

export type ShippingCustomer = {
  id: string;
  store_id: string;
  customer_number: number;
  name: string;
  phone: string;
  normalized_phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  customer_type: ShippingCustomerType;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  operations_count?: number;
  recipients_count?: number;
  total_billed?: number;
  total_paid?: number;
  total_balance?: number;
  total_weight_lb?: number;
  total_money_sent?: number;
  last_operation_at?: string | null;
};

export type ShippingRecipient = {
  id: string;
  store_id: string;
  customer_id: string;
  name: string;
  phone: string;
  normalized_phone: string;
  address: string;
  identity_card: string | null;

  country_id: string | null;
  province_id: string | null;
  municipality_id: string | null;
  shipping_location_id: string | null;
  legacy_location: string | null;

  relationship: string | null;
  notes: string | null;
  is_favorite: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerWithRecipients = {
  customer: ShippingCustomer;
  recipients: ShippingRecipient[];
};

export type SaveShippingCustomerInput = {
  id?: string;
  store_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
};

export type SaveShippingRecipientInput = {
  id?: string;
  store_id: string;
  customer_id: string;
  name: string;
  phone: string;
  address: string;
  identity_card?: string;
  country_id?: string | null;
  province_id?: string | null;
  municipality_id?: string | null;
  shipping_location_id?: string | null;
  legacy_location?: string;
  relationship?: string;
  notes?: string;
  is_favorite?: boolean;
};
