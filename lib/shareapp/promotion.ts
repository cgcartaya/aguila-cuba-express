import { CODE } from "./core";
import { AccessError, db, settings } from "./server";
export type PromotionItem = {
  name: string;
  price: number;
  description?: string | null;
  image_url: string | null;
  product_images?: { image_url: string; is_main: boolean; position?: number }[];
};
export function itemImage(item: PromotionItem | null) {
  const images = item?.product_images
    ?.slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  return (
    images?.find((i) => i.is_main)?.image_url?.trim() ||
    images?.find((i) => i.image_url?.trim())?.image_url?.trim() ||
    item?.image_url?.trim() ||
    null
  );
}
// Every public media/preview request must satisfy the same gates as a visit.
export async function promotion(code: string) {
  if (!CODE.test(code)) throw new AccessError("Enlace inválido.", 404);
  const { data: link, error } = await db
    .from("shareapp_links")
    .select("id,store_id,member_id,kind,item_id")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!link) throw new AccessError("Este enlace ya no está disponible.", 404);
  const [
    { data: store, error: storeError },
    { data: member, error: memberError },
    config,
  ] = await Promise.all([
    db
      .from("stores")
      .select(
        "id,name,slug,domain,subdomain,has_landing,is_active,module_store_enabled,platform_fee_enabled,platform_fee_percent",
      )
      .eq("id", link.store_id)
      .eq("is_active", true)
      .maybeSingle(),
    db
      .from("shareapp_members")
      .select("id")
      .eq("id", link.member_id)
      .eq("store_id", link.store_id)
      .eq("active", true)
      .not("user_id", "is", null)
      .maybeSingle(),
    settings(link.store_id),
  ]);
  if (storeError) throw storeError;
  if (memberError) throw memberError;
  if (!store || !store.module_store_enabled || !member || !config.enabled)
    throw new AccessError("Esta promoción está desactivada.", 410);
  let kind = link.kind;
  let item: PromotionItem | null = null;
  if (kind !== "store") {
    const { data, error } = await db
      .from(kind === "combo" ? "combos" : "products")
      .select(
        kind === "combo"
          ? "name,description,price,image_url"
          : "name,description,price,image_url,product_images(image_url,is_main,position)",
      )
      .eq("id", link.item_id)
      .eq("store_id", store.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    item = data as PromotionItem | null;
    if (!item) kind = "store";
  }
  return { link, store, config, kind, item };
}
