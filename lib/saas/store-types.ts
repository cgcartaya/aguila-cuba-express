export type StorePlan = "basic" | "pro" | "enterprise"

export type StorePaymentStatus = "pending" | "paid" | "overdue" | "cancelled"

export interface Store {
  id: string
  name: string
  slug: string
  domain: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  is_active: boolean
  plan: StorePlan
  monthly_price: number | null

  next_payment_date: string | null
  last_payment_date: string | null
  payment_status: StorePaymentStatus | null
  notes: string | null

  client_name: string | null
  client_phone: string | null
  client_email: string | null
}