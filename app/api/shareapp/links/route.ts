import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { db, member, json, fail, errorResponse } from "@/lib/shareapp/server";
import { UUID, storefront } from "@/lib/shareapp/core";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const promoter = await member(request, String(body.storeId || ""));
    const kind = String(body.kind || "");
    if (!["store", "product", "combo"].includes(kind))
      return fail("Tipo de publicación inválido.");
    const itemId = kind === "store" ? null : String(body.itemId || "");
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
        code: randomBytes(24).toString("hex"),
        kind,
        item_id: itemId,
        network,
        title: String(body.title || "Publicación")
          .trim()
          .slice(0, 160),
      })
      .select("id,code")
      .single();
    if (error) throw error;
    return json({
      id: data.id,
      url: `${storefront(promoter.store).origin}/r/${data.code}`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
