import { UUID } from "./core";
import { db, AccessError } from "./server";
export const CAMPAIGN_FIELDS =
  "id,store_id,title,body,poster_path,kind,item_id,active,created_at";
export const CAMPAIGN_BUCKET = "shareapp-campaigns";
export function posterUrl(path: string) {
  return db.storage.from(CAMPAIGN_BUCKET).getPublicUrl(path).data.publicUrl;
}
export async function activeCampaign(id: string, storeId: string) {
  if (!UUID.test(id)) throw new AccessError("Campaña inválida.", 400);
  const { data, error } = await db
    .from("shareapp_campaigns")
    .select(CAMPAIGN_FIELDS)
    .eq("id", id)
    .eq("store_id", storeId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new AccessError("La campaña está pausada o no está disponible.", 404);
  return data;
}
export async function validateCampaignTarget(
  kind: string,
  itemId: unknown,
  storeId: string,
) {
  if (!["store", "product", "combo"].includes(kind))
    throw new AccessError("Destino inválido.", 400);
  if (kind === "store") return null;
  if (typeof itemId !== "string" || !UUID.test(itemId))
    throw new AccessError("Selecciona un producto o combo válido.", 400);
  const { data, error } = await db
    .from(kind === "combo" ? "combos" : "products")
    .select("id")
    .eq("id", itemId)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new AccessError("El destino no está disponible en esta tienda.", 404);
  return itemId;
}
