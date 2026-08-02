import { supabase } from "@/lib/supabase"
import type { Store } from "@/lib/saas/store-types"

const STORE_PUBLIC_FIELDS = `
  id,
  name,
  slug,
  domain,
  subdomain,
  meta_title,
  meta_description,
  og_image_url,
  logo_url,
  favicon_url,
  primary_color,
  secondary_color,
  is_active,
  has_landing,
  module_store_enabled,
  module_shipping_enabled,
  module_pickups_enabled,
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
  const cleanDomain = domain.replace(/^www\./, "").toLowerCase().trim()

  const { data, error } = await supabase
    .from("stores")
    .select(STORE_PUBLIC_FIELDS)
    .eq("domain", cleanDomain)
    .maybeSingle()

  if (error) {
    console.error("Error loading store by domain:", error)
    return null
  }

  return data as Store | null
}

export async function getStoreBySubdomain(
  subdomain: string
): Promise<Store | null> {
  const cleanSubdomain = subdomain.toLowerCase().trim()

  const { data, error } = await supabase
    .from("stores")
    .select(STORE_PUBLIC_FIELDS)
    .eq("subdomain", cleanSubdomain)
    .maybeSingle()

  if (error) {
    console.error("Error loading store by subdomain:", error)
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

export async function getCurrentStore(): Promise<{
  data: Store | null
  error: unknown
}> {
  if (typeof window === "undefined") {
    return getDefaultStore()
  }

  const host = window.location.hostname
    .replace(/^www\./, "")
    .toLowerCase()

  // 1. Buscar por dominio personalizado
  const byDomain = await getStoreByDomain(host)

  if (byDomain) {
    return {
      data: byDomain,
      error: null,
    }
  }

  // 2. Buscar por subdominio
  if (host.endsWith("perlamarketplace.com")) {
    const subdomain = host.split(".")[0]

    if (subdomain !== "www" && subdomain !== "perlamarketplace") {
      const bySubdomain = await getStoreBySubdomain(subdomain)

      if (bySubdomain) {
        return {
          data: bySubdomain,
          error: null,
        }
      }
    }
  }

  // 3. Tienda por defecto
  return getDefaultStore()
}

export function clearDefaultStoreCache() {
  defaultStoreCache = null
  defaultStorePromise = null
}

export async function createStore(store: {
  name: string
  slug: string
  domain?: string | null
  subdomain?: string | null
  meta_title?: string | null
  meta_description?: string | null
  og_image_url?: string | null
  logo_url?: string | null
  favicon_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  plan: string
  monthly_price?: number | null
  is_active?: boolean
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
    subdomain?: string | null
    meta_title?: string | null
    meta_description?: string | null
    og_image_url?: string | null
    logo_url?: string | null
    favicon_url?: string | null
    primary_color?: string | null
    secondary_color?: string | null
    is_active?: boolean
    has_landing?: boolean
    module_store_enabled?: boolean
    module_shipping_enabled?: boolean
    module_pickups_enabled?: boolean
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


function getSafeExtension(file: File, fallback = "png") {
  const extension = file.name.split(".").pop()?.toLowerCase().trim()
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : fallback
}

function withCacheVersion(publicUrl: string) {
  const separator = publicUrl.includes("?") ? "&" : "?"
  return `${publicUrl}${separator}v=${Date.now()}`
}

async function removeLegacyStoreAssets(
  bucket: "store-logos" | "seo",
  storeId: string,
  keepPath: string,
  prefixes: string[]
) {
  const { data: files, error } = await supabase.storage
    .from(bucket)
    .list(storeId, { limit: 100 })

  if (error || !files?.length) return

  const pathsToRemove = files
    .filter((item) => {
      const fullPath = `${storeId}/${item.name}`
      return (
        fullPath !== keepPath &&
        prefixes.some((prefix) => item.name.startsWith(prefix))
      )
    })
    .map((item) => `${storeId}/${item.name}`)

  if (pathsToRemove.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(pathsToRemove)

    if (removeError) {
      console.warn(`No se pudieron limpiar recursos antiguos en ${bucket}.`, removeError)
    }
  }
}

async function uploadStoreAsset(
  storeId: string,
  file: File,
  assetName: "logo" | "favicon"
) {
  const extension = getSafeExtension(file, assetName === "favicon" ? "ico" : "png")
  const filePath = `${storeId}/${assetName}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from("store-logos")
    .upload(filePath, file, {
      upsert: true,
      cacheControl: "86400",
      contentType: file.type || undefined,
    })

  if (uploadError) {
    return {
      data: null,
      error: uploadError,
    }
  }

  await removeLegacyStoreAssets(
    "store-logos",
    storeId,
    filePath,
    [`${assetName}-`, `${assetName}.`]
  )

  const { data } = supabase.storage
    .from("store-logos")
    .getPublicUrl(filePath)

  return {
    data: withCacheVersion(data.publicUrl),
    error: null,
  }
}

export async function uploadStoreLogo(storeId: string, file: File) {
  return uploadStoreAsset(storeId, file, "logo")
}

export async function uploadStoreFavicon(storeId: string, file: File) {
  return uploadStoreAsset(storeId, file, "favicon")
}

export async function uploadStoreOgImage(storeId: string, file: File) {
  const extension = getSafeExtension(file)
  const filePath = `${storeId}/og-image.${extension}`

  const { error: uploadError } = await supabase.storage
    .from("seo")
    .upload(filePath, file, {
      upsert: true,
      cacheControl: "86400",
      contentType: file.type || undefined,
    })

  if (uploadError) {
    return { data: null, error: uploadError }
  }

  await removeLegacyStoreAssets(
    "seo",
    storeId,
    filePath,
    ["open-graph-", "og-image."]
  )

  const { data } = supabase.storage.from("seo").getPublicUrl(filePath)

  return { data: withCacheVersion(data.publicUrl), error: null }
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
