import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function normalizeHost(value: string) {
  return value.replace(/^www\./, "").split(":")[0].toLowerCase().trim();
}

function normalizePhone(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCode(value: string) {
  return String(value || "").trim().toUpperCase();
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const phone = normalizePhone(body.phone);
  const customerCode = normalizeCode(body.customerCode);
  const requestedSlug = typeof body.slug === "string" ? body.slug.trim() : "";

  if (!phone || !customerCode) {
    return NextResponse.json({ error: "Ingresa tu teléfono y tu código de cliente." }, { status: 400 });
  }

  // Resolver la tienda igual que el portal comercial (slug, subdominio o
  // dominio propio), para que este endpoint funcione en cualquier tienda.
  const anon = createClient(url, key, { auth: { persistSession: false } });
  const host = normalizeHost(request.headers.get("x-forwarded-host") || request.headers.get("host") || "");
  const subdomain = host.endsWith(".perlamarketplace.com") ? host.replace(".perlamarketplace.com", "") : null;

  let storeQuery = anon.from("stores").select("id,name").eq("is_active", true);
  if (requestedSlug) storeQuery = storeQuery.eq("slug", requestedSlug);
  else if (subdomain) storeQuery = storeQuery.eq("subdomain", subdomain);
  else storeQuery = storeQuery.or(`domain.eq.${host},slug.eq.aguila`);

  const { data: store, error: storeError } = await storeQuery.limit(1).maybeSingle();
  if (storeError || !store) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  // Bypass de RLS a propósito: igual que el rastreo público, "conocer tu
  // teléfono + tu código de cliente" es la credencial. Se valida contra AMBOS
  // campos, no solo el teléfono, para no permitir enumerar por teléfono solo.
  const { data: customer, error: customerError } = await supabaseAdmin
    .from("shipping_customers")
    .select("id, name, customer_code, phone, is_active")
    .eq("store_id", store.id)
    .eq("normalized_phone", phone)
    .eq("customer_code", customerCode)
    .eq("is_active", true)
    .maybeSingle();

  if (customerError) {
    return NextResponse.json({ error: "No se pudo verificar el cliente." }, { status: 500 });
  }

  if (!customer) {
    return NextResponse.json(
      { error: "No encontramos un cliente activo con ese teléfono y código." },
      { status: 404 }
    );
  }

  const { data: shipments, error: shipmentsError } = await supabaseAdmin
    .from("shipments")
    .select(
      "id, tracking_code, status, created_at, delivered_date, location, recipient_name, service_price, amount_paid, balance_due, payment_status"
    )
    .eq("store_id", store.id)
    .eq("customer_id", customer.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (shipmentsError) {
    return NextResponse.json({ error: "No se pudo cargar el historial de envíos." }, { status: 500 });
  }

  return NextResponse.json(
    {
      customer: { name: customer.name, customerCode: customer.customer_code },
      shipments: shipments || [],
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
