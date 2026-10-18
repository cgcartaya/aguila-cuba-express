import { NextRequest } from "next/server";
import {
  db,
  owner,
  member,
  json,
  fail,
  errorResponse,
} from "@/lib/shareapp/server";
import { UUID, storefront } from "@/lib/shareapp/core";
export async function GET(request: NextRequest) {
  try {
    const s = request.nextUrl.searchParams,
      storeId = s.get("storeId") || "";
    let memberId: string | null = null;
    if (s.get("scope") === "store") await owner(request, storeId);
    else memberId = (await member(request, storeId)).id;
    const campaignId = s.get("campaignId") || null;
    if (campaignId && !UUID.test(campaignId)) return fail("Campaña inválida.");
    const page = Math.min(
      10000,
      Math.max(0, Math.floor(Number(s.get("page")) || 0)),
    );
    const { data, error } = await db.rpc("shareapp_campaign_report", {
      p_store_id: storeId,
      p_member_id: memberId,
      p_campaign_id: campaignId,
      p_page: page,
    });
    if (error) throw error;
    const { data: store, error: storeError } = await db
      .from("stores")
      .select("id,slug,domain,subdomain,has_landing")
      .eq("id", storeId)
      .maybeSingle();
    if (storeError) throw storeError;
    if (!store) return fail("Tienda no encontrada.", 404);
    return json({
      ...data,
      publications: (data?.publications || []).map((p: { code: string }) => ({
        ...p,
        url: `${storefront(store).origin}/r/${p.code}`,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
