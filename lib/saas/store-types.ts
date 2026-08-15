export type StorePlan = "basic" | "pro" | "enterprise"

export type StorePaymentStatus = "pending" | "paid" | "overdue" | "cancelled"

export interface Store {
  id: string
  name: string
  slug: string
  domain: string | null
  subdomain: string | null

  meta_title: string | null
  meta_description: string | null
  og_image_url: string | null

  logo_url: string | null
  favicon_url: string | null
  primary_color: string | null
  secondary_color: string | null
  is_active: boolean
  has_landing: boolean
  module_store_enabled: boolean
  module_shipping_enabled: boolean
  module_pickups_enabled: boolean
  module_menu_enabled: boolean
  module_reservas_enabled: boolean
  plan: StorePlan
  monthly_price: number | null

  platform_fee_enabled: boolean
  platform_fee_percent: number | null

  next_payment_date: string | null
  last_payment_date: string | null
  payment_status: StorePaymentStatus | null
  notes: string | null

  client_name: string | null
  client_phone: string | null
  client_email: string | null
}
