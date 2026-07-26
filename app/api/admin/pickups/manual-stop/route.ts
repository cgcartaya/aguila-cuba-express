import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const WRITE_ROLES = new Set(["OWNER", "ADMIN", "OPERATIONS", "DISPATCHER"]);
const clean = (value: unknown, max = 160) => String(value ?? "").trim().slice(0, max);
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

async function authorize(request: NextRequest, storeId: string) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { denied: fail("No se recibió la sesión.", 401), userId: null };

  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return { denied: fail("Sesión inválida.", 401), userId: null };

  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) return { denied: fail("Usuario inactivo.", 403), userId: null };
  if (profile.role === "super_admin") return { denied: null, userId: data.user.id };

  const { data: membership } = await supabaseAdmin
    .from("store_users")
    .select("role,active")
    .eq("store_id", storeId)
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();

  if (!membership) return { denied: fail("No tienes acceso a esta tienda.", 403), userId: null };
  if (!WRITE_ROLES.has(String(membership.role).toUpperCase())) return { denied: fail("Tu rol no permite modificar paradas.", 403), userId: null };
  return { denied: null, userId: data.user.id };
}

function readPickupFields(body: Record<string, unknown>) {
  const pickupKind = clean(body.pickup_kind, 40) || null;
  const pickupDetail = clean(body.pickup_detail, 240) || null;
  const pickupOptions: Record<string, { packageType: string | null; packageCount: number }> = {
    one_box: { packageType: "box", packageCount: 1 },
    two_boxes: { packageType: "box", packageCount: 2 },
    three_plus_boxes: { packageType: "box_3_plus", packageCount: 3 },
    documents: { packageType: "documents", packageCount: 1 },
    luggage: { packageType: "luggage", packageCount: 1 },
    other: { packageType: "other", packageCount: 1 },
  };
  return { pickupKind, pickupDetail, pickupOption: pickupKind ? pickupOptions[pickupKind] : null };
}

async function upsertCustomer(input: {
  storeId: string; customerName: string; phone: string; email: string | null; addressLine1: string;
  addressLine2: string | null; city: string; region: string; postalCode: string;
}) {
  const phoneNormalized = input.phone.replace(/\D/g, "");
  return supabaseAdmin.from("pickup_customers").upsert({
    store_id: input.storeId,
    name: input.customerName,
    phone: input.phone,
    phone_normalized: phoneNormalized,
    email: input.email,
    address_line_1: input.addressLine1,
    address_line_2: input.addressLine2,
    city: input.city,
    region: input.region,
    postal_code: input.postalCode,
    last_pickup_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "store_id,phone_normalized" }).select("id").single();
}

async function refreshCustomerCount(customerId: string | null) {
  if (!customerId) return;
  const { count } = await supabaseAdmin.from("pickup_requests").select("id", { count: "exact", head: true }).eq("customer_id", customerId);
  await supabaseAdmin.from("pickup_customers").update({ pickups_count: count || 0, updated_at: new Date().toISOString() }).eq("id", customerId);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = clean(body.store_id, 64);
  const routeId = clean(body.route_id, 64) || null;
  const customerName = clean(body.customer_name, 140);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 160) || null;
  const addressLine1 = clean(body.address_line_1, 220);
  const addressLine2 = clean(body.address_line_2, 120) || null;
  const city = clean(body.city, 100);
  const region = clean(body.region, 40) || "SC";
  const postalCode = clean(body.postal_code, 20);
  const notes = clean(body.notes, 1000) || null;
  const preferredDate = clean(body.preferred_date, 10) || null;
  const { pickupKind, pickupDetail, pickupOption } = readPickupFields(body);

  if (!storeId || !customerName || !phone || !addressLine1 || !city || !postalCode) return fail("Completa nombre, teléfono, dirección, ciudad y ZIP Code.");
  const access = await authorize(request, storeId);
  if (access.denied) return access.denied;

  if (routeId) {
    const { data: route, error } = await supabaseAdmin.from("pickup_routes").select("id,status").eq("id", routeId).eq("store_id", storeId).maybeSingle();
    if (error) return fail(error.message, 500);
    if (!route) return fail("La ruta no existe o no pertenece a esta tienda.", 404);
    if (["completed", "cancelled"].includes(route.status)) return fail("No puedes agregar paradas a una ruta cerrada.");
  }

  const { data: customer, error: customerError } = await upsertCustomer({ storeId, customerName, phone, email, addressLine1, addressLine2, city, region, postalCode });
  if (customerError || !customer) return fail(customerError?.message || "No se pudo guardar el cliente.", 500);

  const confirmedDate = preferredDate || null;
  const { data: pickup, error: pickupError } = await supabaseAdmin.from("pickup_requests").insert({
    store_id: storeId, customer_name: customerName, phone, email, address_line_1: addressLine1, address_line_2: addressLine2,
    formatted_address: `${addressLine1}${addressLine2 ? `, ${addressLine2}` : ""}, ${city}, ${region} ${postalCode}`,
    city, region, postal_code: postalCode, country_code: "US", address_verified: false, validation_provider: "manual",
    package_count: pickupOption?.packageCount || 1, package_type: pickupOption?.packageType || null, notes,
    internal_notes: ["Parada creada manualmente desde una conversación de WhatsApp o llamada.", pickupKind === "other" && pickupDetail ? `Recogida indicada: ${pickupDetail}` : null].filter(Boolean).join(" "),
    status: routeId ? "assigned" : "confirmed", confirmed_date: confirmedDate, request_source: "manual", created_by: access.userId, customer_id: customer.id,
  }).select("*").single();
  if (pickupError || !pickup) return fail(pickupError?.message || "No se pudo crear la parada manual.", 500);

  if (confirmedDate) {
    const { error } = await supabaseAdmin.from("pickup_request_dates").insert({ pickup_request_id: pickup.id, preferred_date: confirmedDate, priority: 1 });
    if (error) { await supabaseAdmin.from("pickup_requests").delete().eq("id", pickup.id); return fail(error.message, 500); }
  }

  let stop = null;
  if (routeId) {
    const { data: currentStops, error: orderError } = await supabaseAdmin.from("pickup_route_stops").select("stop_order").eq("route_id", routeId).order("stop_order", { ascending: false }).limit(1);
    if (orderError) { await supabaseAdmin.from("pickup_requests").delete().eq("id", pickup.id); return fail(orderError.message, 500); }
    const { data: insertedStop, error: stopError } = await supabaseAdmin.from("pickup_route_stops").insert({ route_id: routeId, pickup_request_id: pickup.id, stop_order: Number(currentStops?.[0]?.stop_order || 0) + 1, status: "pending" }).select("id,route_id,pickup_request_id,stop_order,status").single();
    if (stopError || !insertedStop) { await supabaseAdmin.from("pickup_requests").delete().eq("id", pickup.id); return fail(stopError?.message || "No se pudo agregar la parada a la ruta.", 500); }
    stop = insertedStop;
  }

  await refreshCustomerCount(customer.id);
  return NextResponse.json({ ok: true, request: { ...pickup, preferred_dates: confirmedDate ? [confirmedDate] : [] }, stop }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = clean(body.store_id, 64);
  const requestId = clean(body.request_id, 64);
  const customerName = clean(body.customer_name, 140);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 160) || null;
  const addressLine1 = clean(body.address_line_1, 220);
  const addressLine2 = clean(body.address_line_2, 120) || null;
  const city = clean(body.city, 100);
  const region = clean(body.region, 40) || "SC";
  const postalCode = clean(body.postal_code, 20);
  const notes = clean(body.notes, 1000) || null;
  const { pickupKind, pickupDetail, pickupOption } = readPickupFields(body);

  if (!storeId || !requestId || !customerName || !phone || !addressLine1 || !city || !postalCode) return fail("Completa nombre, teléfono, dirección, ciudad y ZIP Code.");
  const access = await authorize(request, storeId);
  if (access.denied) return access.denied;

  const { data: existing, error: existingError } = await supabaseAdmin.from("pickup_requests").select("id,customer_id,request_source,status").eq("id", requestId).eq("store_id", storeId).maybeSingle();
  if (existingError) return fail(existingError.message, 500);
  if (!existing) return fail("La parada no existe.", 404);
  if (existing.request_source !== "manual") return fail("Solo las paradas manuales pueden editarse desde aquí.", 403);
  if (["picked_up", "cancelled"].includes(existing.status)) return fail("No puedes editar una parada ya recogida o cancelada.");

  const { data: customer, error: customerError } = await upsertCustomer({ storeId, customerName, phone, email, addressLine1, addressLine2, city, region, postalCode });
  if (customerError || !customer) return fail(customerError?.message || "No se pudo actualizar el cliente.", 500);

  const { data: pickup, error: updateError } = await supabaseAdmin.from("pickup_requests").update({
    customer_name: customerName, phone, email, address_line_1: addressLine1, address_line_2: addressLine2,
    formatted_address: `${addressLine1}${addressLine2 ? `, ${addressLine2}` : ""}, ${city}, ${region} ${postalCode}`,
    city, region, postal_code: postalCode, package_count: pickupOption?.packageCount || 1, package_type: pickupOption?.packageType || null,
    notes, internal_notes: ["Parada creada manualmente desde una conversación de WhatsApp o llamada.", pickupKind === "other" && pickupDetail ? `Recogida indicada: ${pickupDetail}` : null].filter(Boolean).join(" "),
    customer_id: customer.id, updated_at: new Date().toISOString(),
  }).eq("id", requestId).eq("store_id", storeId).select("*").single();
  if (updateError || !pickup) return fail(updateError?.message || "No se pudo editar la parada.", 500);

  await refreshCustomerCount(existing.customer_id);
  await refreshCustomerCount(customer.id);
  return NextResponse.json({ ok: true, request: pickup });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = clean(body.store_id, 64);
  const requestId = clean(body.request_id, 64);
  const routeId = clean(body.route_id, 64) || null;
  if (!storeId || !requestId) return fail("Faltan datos para eliminar la parada.");

  const access = await authorize(request, storeId);
  if (access.denied) return access.denied;

  const { data: existing, error } = await supabaseAdmin.from("pickup_requests").select("id,customer_id,request_source,status").eq("id", requestId).eq("store_id", storeId).maybeSingle();
  if (error) return fail(error.message, 500);
  if (!existing) return fail("La parada no existe.", 404);
  if (existing.request_source !== "manual") return fail("Las solicitudes de la landing no se eliminan desde este botón; solo se quitan de la ruta.", 403);
  if (existing.status === "picked_up") return fail("No puedes eliminar una parada que ya fue recogida.");

  if (routeId) await supabaseAdmin.from("pickup_route_stops").delete().eq("route_id", routeId).eq("pickup_request_id", requestId);
  else await supabaseAdmin.from("pickup_route_stops").delete().eq("pickup_request_id", requestId);
  await supabaseAdmin.from("pickup_request_dates").delete().eq("pickup_request_id", requestId);
  const { error: deleteError } = await supabaseAdmin.from("pickup_requests").delete().eq("id", requestId).eq("store_id", storeId);
  if (deleteError) return fail(deleteError.message, 500);

  await refreshCustomerCount(existing.customer_id);
  return NextResponse.json({ ok: true });
}
