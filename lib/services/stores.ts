import { supabase } from "@/lib/supabase"
import type { Store } from "@/lib/saas/store-types"

const STORE_PUBLIC_FIELDS = `
  id,
  name,
  slug,
  domain,
  logo_url,
  primary_color,
  secondary_color,
  is_active,
  plan,
  monthly_price,
  payment_status,
  last_payment_date,
  next_payment_date,
  client_name,
  client_phone,
  client_email,
  notes,
  created_at
`

let defaultStoreCache: Store | null = null
let defaultStorePromise: Promise<{ data: Store | null; error: unknown }> | null = null

export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select(STORE_PUBLIC_FIELDS)
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
    .select(STORE_PUBLIC_FIELDS)
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
    .select(STORE_PUBLIC_FIELDS)
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
    .select(STORE_PUBLIC_FIELDS)
    .eq("domain", domain)
    .maybeSingle()

  if (error) {
    console.error("Error loading store by domain:", error)
    return null
  }

  return data as Store | null
}

export async function getDefaultStore(): Promise<{ data: Store | null; error: unknown }> {
  if (defaultStoreCache) {
    return { data: defaultStoreCache, error: null }
  }

  if (!defaultStorePromise) {
    defaultStorePromise = Promise.resolve(
      supabase
      .from("stores")
      .select(STORE_PUBLIC_FIELDS)
      .eq("slug", "aguila")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          defaultStoreCache = data as Store
        }

        defaultStorePromise = null

        return {
          data: (data as Store | null) || null,
          error,
        }
      })
    )
  }

  return await defaultStorePromise
}

export function clearDefaultStoreCache() {
  defaultStoreCache = null
  defaultStorePromise = null
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
  const result = await supabase
    .from("stores")
    .insert({
      ...store,
      is_active: true,
    })
    .select()
    .single()

  clearDefaultStoreCache()
  return result
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
  const result = await supabase
    .from("stores")
    .update(store)
    .eq("id", id)
    .select()
    .single()

  clearDefaultStoreCache()
  return result
}

export async function uploadStoreLogo(storeId: string, file: File) {
  const fileExt = file.name.split(".").pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = `${storeId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from("store-logos")
    .upload(filePath, file, {
      upsert: true,
      cacheControl: "31536000",
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
  const result = await supabase
    .from("stores")
    .update(paymentData)
    .eq("id", id)

  clearDefaultStoreCache()
  return result
}
