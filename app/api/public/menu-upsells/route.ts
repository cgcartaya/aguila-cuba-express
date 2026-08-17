import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreBySlug } from "@/lib/services/stores";
import { getMenuAvailabilityMap } from "@/lib/services/menu-availability-public";

export const maxDuration = 15;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const slug = (url.searchParams.get("slug") || "").trim().toLowerCase();
    const cartIds = (url.searchParams.get("items") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 50);

    if (!slug) {
      return NextResponse.json({ suggestions: [] });
    }

    const store = await getStoreBySlug(slug);
    if (!store || !store.module_menu_enabled) {
      return NextResponse.json({ suggestions: [] });
    }

    const { data: rules } = await supabaseAdmin
      .from("menu_upsell_rules")
      .select(
        "id, source_item_id, recommended_item_id, headline, sort_order"
      )
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const applicable = (rules || []).filter(
      (rule) =>
        rule.source_item_id === null ||
        cartIds.includes(rule.source_item_id)
    );

    const recommendedIds = [
      ...new Set(
        applicable
          .map((rule) => rule.recommended_item_id)
          .filter((id) => !cartIds.includes(id))
      ),
    ].slice(0, 12);

    if (!recommendedIds.length) {
      return NextResponse.json({ suggestions: [] });
    }

    const [{ data: items }, availability] = await Promise.all([
      supabaseAdmin
        .from("menu_items")
        .select(`
          id,
          name,
          price,
          image_url,
          is_active,
          manual_unavailable,
          menu_item_option_groups (
            id,
            is_required
          )
        `)
        .eq("store_id", store.id)
        .eq("is_active", true)
        .in("id", recommendedIds),

      getMenuAvailabilityMap(store.id),
    ]);

    const byId = new Map((items || []).map((item: any) => [item.id, item]));

    const suggestions = applicable
      .map((rule) => {
        const item: any = byId.get(rule.recommended_item_id);
        if (!item) return null;
        if (item.manual_unavailable) return null;

        const remaining = availability[item.id];
        if (remaining === 0) return null;

        return {
          id: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          image_url: item.image_url || null,
          headline: rule.headline || "¿Quieres agregar algo más?",
          has_required_options: (item.menu_item_option_groups || []).some(
            (group: any) => group.is_required
          ),
        };
      })
      .filter(Boolean)
      .filter(
        (suggestion: any, index, array: any[]) =>
          array.findIndex((candidate) => candidate.id === suggestion.id) ===
          index
      )
      .slice(0, 4);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("GET /api/public/menu-upsells error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
