import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreBySlug } from "@/lib/services/stores";

export async function GET(request: NextRequest) {
  const slug = (new URL(request.url).searchParams.get("slug") || "").trim().toLowerCase();
  const store = slug ? await getStoreBySlug(slug) : null;
  if (!store || !store.module_menu_enabled) return NextResponse.json({ zones: [] });

  const { data, error } = await supabaseAdmin
    .from("menu_delivery_zones")
    .select("id,name,fee,minimum_order,estimated_minutes_min,estimated_minutes_max")
    .eq("store_id", store.id).eq("is_active", true).order("sort_order");

  if (error) return NextResponse.json({ zones: [] });
  return NextResponse.json({ zones: data || [] });
}
