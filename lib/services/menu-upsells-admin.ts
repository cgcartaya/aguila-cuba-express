import { supabase } from "@/lib/supabase";

export type MenuUpsellRule = {
  id: string;
  store_id: string;
  source_item_id: string | null;
  recommended_item_id: string;
  headline: string | null;
  sort_order: number;
  is_active: boolean;
};

export type MenuUpsellAdminItem = {
  id: string;
  name: string;
  price: number;
};

export async function getMenuUpsellAdminData(storeId: string) {
  const [rulesResult, itemsResult] = await Promise.all([
    supabase
      .from("menu_upsell_rules")
      .select(
        "id, store_id, source_item_id, recommended_item_id, headline, sort_order, is_active"
      )
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true }),

    supabase
      .from("menu_items")
      .select("id, name, price")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  return {
    rules: (rulesResult.data || []) as MenuUpsellRule[],
    items: (itemsResult.data || []) as MenuUpsellAdminItem[],
    error: rulesResult.error || itemsResult.error,
  };
}

export async function saveMenuUpsellRule(
  storeId: string,
  input: {
    id?: string;
    source_item_id: string | null;
    recommended_item_id: string;
    headline?: string;
    sort_order: number;
    is_active: boolean;
  }
) {
  const payload = {
    store_id: storeId,
    source_item_id: input.source_item_id || null,
    recommended_item_id: input.recommended_item_id,
    headline: input.headline?.trim() || null,
    sort_order: input.sort_order,
    is_active: input.is_active,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    return supabase
      .from("menu_upsell_rules")
      .update(payload)
      .eq("id", input.id)
      .select()
      .single();
  }

  return supabase.from("menu_upsell_rules").insert(payload).select().single();
}

export async function deleteMenuUpsellRule(id: string) {
  return supabase.from("menu_upsell_rules").delete().eq("id", id);
}
