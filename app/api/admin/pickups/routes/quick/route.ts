import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePickupRouteWrite } from "@/lib/pickups/route-access";
import { prepareRouteImage } from "@/lib/pickups/route-image";
import { itineraryCities, localDate, validateItinerary, validRouteDate } from "@/lib/pickups/itinerary";
import { getCityOptions } from "@/lib/geo/location-catalog";

export const maxDuration = 60;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("store_id") || "";
  const denied = await requirePickupRouteWrite(request, storeId);
  if (denied) return denied;
  const [{ data: templates, error }, { data: settings }] = await Promise.all([
    supabaseAdmin.from("pickup_route_templates").select("*").eq("store_id", storeId).order("created_at", { ascending: false }),
    supabaseAdmin.from("pickup_service_settings").select("country_code,region_code,timezone").eq("store_id", storeId).maybeSingle(),
  ]);
  if (error) return fail("No se pudo cargar el editor de rutas.", 500);
  return NextResponse.json({ templates, cities: getCityOptions(settings?.country_code || "US", settings?.region_code || "SC"), today: localDate(settings?.timezone || "America/New_York"), image_import_enabled: Boolean(process.env.OPENAI_API_KEY) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("store_id") || "";
  const denied = await requirePickupRouteWrite(request, storeId);
  if (denied) return denied;
  if (Number(request.headers.get("content-length")) > 4 * 1024 * 1024) return fail("La imagen es demasiado grande.", 413);
  let uploadedPath: string | null = null;
  try {
    const form = await request.formData();
    const plan = JSON.parse(String(form.get("plan") || "{}"));
    const name = String(plan.name || "").trim().slice(0, 120);
    if (!name) return fail("Escribe un nombre para la ruta.");
    const itinerary = validateItinerary(plan.itinerary);
    const zoneId = plan.zone_id || null;
    if (zoneId) {
      const { data: zone } = await supabaseAdmin.from("pickup_zones").select("id").eq("store_id", storeId).eq("id", zoneId).eq("is_active", true).maybeSingle();
      if (!zone) return fail("La zona no pertenece a esta tienda o no está activa.");
    }
    if (plan.action === "template") {
      const { count } = await supabaseAdmin.from("pickup_route_templates").select("id", { count: "exact", head: true }).eq("store_id", storeId);
      if ((count || 0) >= 50) return fail("Ya tienes 50 plantillas. Elimina una para guardar otra.");
      const { data, error } = await supabaseAdmin.from("pickup_route_templates").insert({ store_id: storeId, name, zone_id: zoneId, itinerary }).select().single();
      if (error) return fail("No se pudo guardar la plantilla.", 500);
      return NextResponse.json({ template: data });
    }
    if (!validRouteDate(plan.route_date)) return fail("Selecciona una fecha válida con el año correcto.");
    const { data: settings } = await supabaseAdmin.from("pickup_service_settings").select("timezone").eq("store_id", storeId).maybeSingle();
    if (plan.publish && (plan.reviewed !== true || plan.route_date < localDate(settings?.timezone || "America/New_York"))) {
      return fail("Revisa la ruta y selecciona una fecha actual o futura antes de publicar.");
    }
    if (plan.route_id) {
      const { data: existing } = await supabaseAdmin.from("pickup_routes").select("status").eq("id", plan.route_id).eq("store_id", storeId).maybeSingle();
      if (!existing || !["draft", "published"].includes(existing.status)) return fail("Esta ruta no se puede editar desde el editor rápido.");
    }
    // Only accept our store-owned poster URLs; never fetch arbitrary client URLs.
    const posterPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pickup-route-posters/${storeId}/`;
    let posterUrl: string | null = typeof plan.poster_image_url === "string" && plan.poster_image_url.startsWith(posterPrefix) ? plan.poster_image_url : null;
    if (form.get("image") instanceof File) {
      const image = await prepareRouteImage(form.get("image"));
      uploadedPath = `${storeId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabaseAdmin.storage.from("pickup-route-posters").upload(uploadedPath, image, { contentType: "image/jpeg", upsert: false });
      if (error) throw new Error("No se pudo guardar el cartel. Intenta otra vez.");
      posterUrl = supabaseAdmin.storage.from("pickup-route-posters").getPublicUrl(uploadedPath).data.publicUrl;
    }
    const cities = itineraryCities(itinerary);
    const values = {
      name, route_date: plan.route_date, zone_id: zoneId,
      public_summary: String(plan.public_summary || "").trim().slice(0, 1000) || null,
      public_itinerary: itinerary, poster_image_url: posterUrl,
      start_city: cities[0], end_city: cities[cities.length - 1],
      status: plan.publish ? "published" : "draft", is_public: Boolean(plan.publish),
      ...(plan.publish ? { published_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    };
    const query = plan.route_id
      ? supabaseAdmin.from("pickup_routes").update(values).eq("id", plan.route_id).eq("store_id", storeId)
      : supabaseAdmin.from("pickup_routes").insert({ ...values, store_id: storeId });
    const { data, error } = await query.select("id").single();
    if (error) throw new Error("No se pudo guardar la ruta.");
    return NextResponse.json({ route: data });
  } catch (error) {
    if (uploadedPath) await supabaseAdmin.storage.from("pickup-route-posters").remove([uploadedPath]);
    return fail(error instanceof Error ? error.message : "No se pudo procesar la ruta.");
  }
}

export async function DELETE(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("store_id") || "";
  const denied = await requirePickupRouteWrite(request, storeId);
  if (denied) return denied;
  const id = request.nextUrl.searchParams.get("template_id") || "";
  if (!id) return fail("Falta la plantilla.");
  const { error } = await supabaseAdmin.from("pickup_route_templates").delete().eq("store_id", storeId).eq("id", id);
  return error ? fail("No se pudo eliminar la plantilla.", 500) : NextResponse.json({ ok: true });
}
