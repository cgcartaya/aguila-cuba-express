import { supabase } from "@/lib/supabase"
import type { Store } from "@/lib/saas/store-types"

export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    console.error("Error loading stores:", error)
    return []
  }

  return data as Store[]
}

export async function getStoreById(id: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("Error loading store by id:", error)
    return null
  }

  return data as Store | null
}

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    console.error("Error loading store by slug:", error)
    return null
  }

  return data as Store | null
}

export async function getStoreByDomain(domain: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("domain", domain)
    .maybeSingle()

  if (error) {
    console.error("Error loading store by domain:", error)
    return null
  }

  return data as Store | null
}

export async function getDefaultStore() {
  return supabase
    .from("stores")
    .select("*")
    .eq("slug", "aguila")
    .maybeSingle()
}

export async function createStore(store: {
  name: string
  slug: string
  domain?: string | null
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  plan: string
  monthly_price?: number | null
}) {
  return supabase
    .from("stores")
    .insert({
      ...store,
      is_active: true,
    })
    .select()
    .single()
}

export async function updateStore(
  id: string,
  store: {
    name?: string
    slug?: string
    domain?: string | null
    logo_url?: string | null
    primary_color?: string | null
    secondary_color?: string | null
    is_active?: boolean
    plan?: string
    monthly_price?: number | null
    next_payment_date?: string | null
    last_payment_date?: string | null
    payment_status?: string | null
    notes?: string | null
    client_name?: string | null
    client_phone?: string | null
    client_email?: string | null
  }
) {
  return supabase
    .from("stores")
    .update(store)
    .eq("id", id)
    .select()
    .single()
}

export async function uploadStoreLogo(storeId: string, file: File) {
  const fileExt = file.name.split(".").pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = `${storeId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from("store-logos")
    .upload(filePath, file, {
      upsert: true,
    })

  if (uploadError) {
    return {
      data: null,
      error: uploadError,
    }
  }

  const { data } = supabase.storage
    .from("store-logos")
    .getPublicUrl(filePath)

  return {
    data: data.publicUrl,
    error: null,
  }
}
export async function markStoreAsPaid(
  id: string,
  paymentData: {
    payment_status: string
    last_payment_date: string
    next_payment_date: string
    is_active: boolean
  }
) {
  return supabase
    .from("stores")
    .update(paymentData)
    .eq("id", id)
}