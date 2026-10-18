import { NextRequest } from "next/server";
import {
  db,
  owner,
  member,
  json,
  fail,
  errorResponse,
} from "@/lib/shareapp/server";
import { UUID } from "@/lib/shareapp/core";
import {
  CAMPAIGN_FIELDS,
  CAMPAIGN_BUCKET,
  posterUrl,
  validateCampaignTarget,
} from "@/lib/shareapp/campaigns";
export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get("storeId") || "";
    const admin = request.nextUrl.searchParams.get("scope") === "store";
    if (admin) await owner(request, storeId);
    else await member(request, storeId);
    const target = request.nextUrl.searchParams.get("target");
    if (target) {
      if (!admin)
        return fail("Solo el dueño puede elegir destinos de campaña.", 403);
      if (!["product", "combo"].includes(target))
        return fail("Destino inválido.");
      let query = db
        .from(target === "combo" ? "combos" : "products")
        .select("id,name")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .is("deleted_at", null);
      const q = (request.nextUrl.searchParams.get("q") || "")
        .trim()
        .slice(0, 100);
      if (q) query = query.ilike("name", `%${q}%`);
      const { data, error } = await query.order("name").limit(50);
      if (error) throw error;
      return json({ items: data || [] });
    }
    const page = Math.min(
      10000,
      Math.max(
        0,
        Math.floor(Number(request.nextUrl.searchParams.get("page")) || 0),
      ),
    );
    let q = db
      .from("shareapp_campaigns")
      .select(CAMPAIGN_FIELDS)
      .eq("store_id", storeId);
    if (!admin) q = q.eq("active", true);
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .order("id")
      .range(page * 20, page * 20 + 19);
    if (error) throw error;
    return json({
      campaigns: (data || []).map((c) => ({
        ...c,
        image_url: posterUrl(c.poster_path),
      })),
      hasMore: data?.length === 20,
      page,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const storeId = String(body.storeId || "");
    await owner(request, storeId);
    const title = String(body.title || "").trim(),
      text = String(body.body || ""),
      path = String(body.posterPath || "");
    if (!title || title.length > 160 || text.length > 5000)
      return fail(
        "Revisa el título (160 caracteres) y el texto (5000 caracteres).",
      );
    const [folder, file, extra] = path.split("/");
    if (
      folder !== storeId ||
      extra ||
      !file?.endsWith(".jpg") ||
      !UUID.test(file.slice(0, -4))
    )
      return fail("Sube un póster de esta tienda.");
    const { data: objects, error: storageError } = await db.storage
      .from(CAMPAIGN_BUCKET)
      .list(storeId, { search: file, limit: 1 });
    if (storageError) throw storageError;
    if (!objects?.some((o) => o.name === file))
      return fail("El póster no está disponible. Vuelve a subirlo.");
    const kind = String(body.kind || "store"),
      itemId = await validateCampaignTarget(kind, body.itemId, storeId);
    const { data, error } = await db
      .from("shareapp_campaigns")
      .insert({
        store_id: storeId,
        title,
        body: text,
        poster_path: path,
        kind,
        item_id: itemId,
      })
      .select(CAMPAIGN_FIELDS)
      .single();
    if (error) throw error;
    return json({ ...data, image_url: posterUrl(data.poster_path) });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const storeId = String(body.storeId || "");
    await owner(request, storeId);
    if (!UUID.test(String(body.id || "")) || typeof body.active !== "boolean")
      return fail("Campaña inválida.");
    const { data, error } = await db
      .from("shareapp_campaigns")
      .update({ active: body.active })
      .eq("id", body.id)
      .eq("store_id", storeId)
      .select(CAMPAIGN_FIELDS)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail("Campaña no encontrada.", 404);
    return json({ ...data, image_url: posterUrl(data.poster_path) });
  } catch (e) {
    return errorResponse(e);
  }
}
