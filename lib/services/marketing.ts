import { supabase } from "@/lib/supabase";
import { optimizeImageFile } from "@/lib/images/optimizeImage";
import type {
  MarketingPromotion,
  MarketingPromotionInput,
} from "@/types/marketing";

const PROMOTIONS_BUCKET = "marketing";

export function getAdminPromotions(storeId: string) {
  return supabase
    .from("marketing_promotions")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<MarketingPromotion[]>();
}

export function createPromotion(input: MarketingPromotionInput) {
  return supabase
    .from("marketing_promotions")
    .insert(input)
    .select("*")
    .single<MarketingPromotion>();
}

export function updatePromotion(
  storeId: string,
  promotionId: string,
  updates: Partial<MarketingPromotionInput>
) {
  return supabase
    .from("marketing_promotions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .eq("id", promotionId)
    .select("*")
    .single<MarketingPromotion>();
}

export function deletePromotion(storeId: string, promotionId: string) {
  return supabase
    .from("marketing_promotions")
    .delete()
    .eq("store_id", storeId)
    .eq("id", promotionId);
}

export async function uploadPromotionImage(storeId: string, file: File) {
  const optimized = await optimizeImageFile(file, "banner");
  const extension = optimized.name.split(".").pop() || "webp";
  const path = `${storeId}/promotions/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(PROMOTIONS_BUCKET)
    .upload(path, optimized, {
      cacheControl: "31536000",
      contentType: optimized.type,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(PROMOTIONS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function getPublicPromotionsByStoreSlug(storeSlug: string) {
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", storeSlug)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>();

  if (storeError) {
    return { data: null, error: storeError };
  }

  if (!store) {
    return {
      data: [] as MarketingPromotion[],
      error: null,
    };
  }

  const now = new Date().toISOString();

  return supabase
    .from("marketing_promotions")
    .select("*")
    .eq("store_id", store.id)
    .eq("is_visible", true)
    .eq("show_on_home", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<MarketingPromotion[]>();
}
