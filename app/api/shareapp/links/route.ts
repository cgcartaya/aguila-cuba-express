import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { db, member, json, fail, errorResponse } from "@/lib/shareapp/server";
import { activeCampaign } from "@/lib/shareapp/campaigns";
import { UUID, storefront } from "@/lib/shareapp/core";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const promoter = await member(request, String(body.storeId || ""));
    const campaignId = body.campaignId ? String(body.campaignId) : null;
    const campaign = campaignId
      ? await activeCampaign(campaignId, promoter.store_id)
      : null;
    const kind = campaign?.kind || String(body.kind || "");
    if (!["store", "product", "combo"].includes(kind))
      return fail("Tipo de publicación inválido.");
    const itemId =
      kind === "store"
        ? null
        : String(campaign ? campaign.item_id || "" : body.itemId || "");
    if (itemId) {
      if (!UUID.test(itemId)) return fail("Producto inválido.");
      const { data, error } = await db
        .from(kind === "combo" ? "combos" : "products")
        .select("id")
        .eq("id", itemId)
        .eq("store_id", promoter.store_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      if (!data) return fail("El producto ya no está disponible.", 404);
    } else if (kind !== "store") return fail("Selecciona un producto.");
    const network = String(body.network || "other");
    if (
      !["whatsapp", "facebook", "instagram", "telegram", "other"].includes(
        network,
      )
    )
      return fail("Red inválida.");
    const { data, error } = await db
      .from("shareapp_links")
      .insert({
        store_id: promoter.store_id,
        member_id: promoter.id,
        campaign_id: campaignId,
        code: randomBytes(24).toString("hex"),
        kind,
        item_id: itemId,
        network,
        body: String(body.body || "").slice(0, 5000),
        title: String(body.title || "Publicación")
          .trim()
          .slice(0, 160),
      })
      .select(
        "id,code,kind,item_id,campaign_id,network,title,body,active,created_at,updated_at",
      )
      .single();
    if (error) throw error;
    return json({
      ...data,
      url: `${storefront(promoter.store).origin}/r/${data.code}`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get("storeId") || "";
    const promoter = await member(request, storeId);
    const page = Math.max(
      0,
      Math.min(
        10000,
        Math.floor(Number(request.nextUrl.searchParams.get("page")) || 0),
      ),
    );
    const { data, error } = await db
      .from("shareapp_links")
      .select(
        "id,kind,item_id,campaign_id,network,title,body,active,created_at,updated_at,code",
      )
      .eq("store_id", storeId)
      .eq("member_id", promoter.id)
      .order("created_at", { ascending: false })
      .order("id")
      .range(page * 20, page * 20 + 19);
    if (error) throw error;
    return json({
      publications: (data || []).map((row) => ({
        ...row,
        url: `${storefront(promoter.store).origin}/r/${row.code}`,
      })),
      page,
      hasMore: data?.length === 20,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const promoter = await member(request, String(body.storeId || ""));
    if (!UUID.test(String(body.id || ""))) return fail("Publicación inválida.");
    const updates: {
      updated_at: string;
      title?: string;
      body?: string;
      active?: boolean;
    } = { updated_at: new Date().toISOString() };
    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title || title.length > 160)
        return fail("El título debe tener entre 1 y 160 caracteres.");
      updates.title = title;
    }
    if (typeof body.body === "string") {
      if (body.body.length > 5000)
        return fail("El texto admite hasta 5000 caracteres.");
      updates.body = body.body;
    }
    if (typeof body.active === "boolean") updates.active = body.active;
    if (Object.keys(updates).length === 1)
      return fail("No hay cambios que guardar.");
    const { data, error } = await db
      .from("shareapp_links")
      .update(updates)
      .eq("id", body.id)
      .eq("store_id", promoter.store_id)
      .eq("member_id", promoter.id)
      .select(
        "id,code,kind,item_id,campaign_id,network,title,body,active,created_at,updated_at",
      )
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail("Publicación no encontrada.", 404);
    return json({
      ...data,
      url: `${storefront(promoter.store).origin}/r/${data.code}`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
