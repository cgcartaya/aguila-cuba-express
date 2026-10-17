import { NextRequest } from "next/server";
import { db, user, json, errorResponse } from "@/lib/shareapp/server";
export async function GET(request: NextRequest) {
  try {
    const actor = await user(request);
    const { data, error } = await db
      .from("shareapp_members")
      .select("id,store_id,display_name,stores!inner(id,name,slug,is_active)")
      .eq("user_id", actor.id)
      .eq("active", true)
      .eq("stores.is_active", true)
      .eq("stores.module_store_enabled", true);
    if (error) throw error;
    const ids = (data || []).map((row) => row.store_id);
    if (!ids.length) return json({ memberships: [] });
    const { data: configs, error: configError } = await db
      .from("shareapp_settings")
      .select("store_id")
      .in("store_id", ids)
      .eq("enabled", true);
    if (configError) throw configError;
    const enabled = new Set((configs || []).map((row) => row.store_id));
    return json({
      memberships: (data || []).filter((row) => enabled.has(row.store_id)),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
