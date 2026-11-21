import { Country, State } from "country-state-city";
import { z } from "zod";
import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { response } from "@/lib/procedures/server";
import { lockerRegistration, resolveLockerStore } from "@/lib/lockers/server";
import { identificationPattern, normalizeIdentification, validIdentification } from "@/lib/lockers/identity";

const prealert = z.object({
  action: z.literal("prealert"),
  tracking: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9 -]{2,119}$/).nullish(),
  merchant: z.string().trim().min(2).max(120),
  tracking_url: z.url({ protocol: /^https?$/ }).max(2048).nullish(),
  items: z.array(z.object({ name: z.string().trim().min(1).max(120), quantity: z.number().int().min(1).max(9999) })).min(1).max(50),
  declared_value: z.number().min(0).max(999999),
});

const country = z.string().regex(/^[A-Z]{2}$/)
  .refine(code => Boolean(Country.getCountryByCode(code)));

const profile = z.object({
  customer_name: z.string().trim().min(3).max(120),
  phone: z.string().trim().regex(/^\+?[\d ()-]{7,24}$/),
  destination: z.string().trim().min(8).max(350),
  destination_country: country,
  identification: z.string().trim().min(3).max(60).regex(/^[\p{L}\p{N}][\p{L}\p{N} .\/-]*$/u),
  identification_country: country,
  identification_state: z.string().optional(),
  identification_type: z.enum(["license", "state_id", "national_id", "passport", "other"]),
}).superRefine((details, ctx) => {
  const { identification_country, identification_state, identification_type, identification } = details;
  if (identification_country === "US" && (identification_type === "license" || identification_type === "state_id")) {
    if (!identification_state || !State.getStateByCodeAndCountry(identification_state, "US")
      || (identificationPattern(identification_state, identification_type)
        && !validIdentification(identification_state, identification_type, identification))) {
      ctx.addIssue({ code: "custom", path: ["identification"], message: "Revisa el estado emisor y el número de tu documento." });
    }
  }
}).transform(details => ({
  ...details,
  identification_state: details.identification_country === "US"
    && (details.identification_type === "license" || details.identification_type === "state_id")
    ? details.identification_state ?? null : null,
  identification: details.identification_country === "US"
    && (details.identification_type === "license" || details.identification_type === "state_id")
    ? normalizeIdentification(details.identification) : details.identification,
}));

const profileFields = "customer_name,phone,destination,destination_country,identification,identification_country,identification_state,identification_type";

async function customer(request: Request) {
  const store = await resolveLockerStore(new URL(request.url).host);
  if (!store) return { error: response({ error: "Casillero no disponible." }, 404) };
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return { error: response({ error: "Inicia sesión para continuar." }, 401) };
  const { data } = await db.auth.getUser(token);
  const user = data.user;
  if (!user?.email || !user.email_confirmed_at || user.is_anonymous) {
    return { error: response({ error: "Confirma tu correo e inicia sesión." }, 401) };
  }
  return { store: store.id, slug: store.slug, user: user.id, email: user.email.toLowerCase() };
}

const lockerFields = `id,code,verified_at,${profileFields}` as const;

export async function GET(request: Request) {
  const auth = await customer(request);
  if (auth.error) return auth.error;
  const { data: locker, error } = await db.from("virtual_lockers").select(lockerFields)
    .eq("store_id", auth.store).eq("customer_user_id", auth.user).maybeSingle();
  if (error) return response({ error: "No se pudo cargar tu casillero." }, 503);
  if (!locker) return response({ locker: null, packages: [] });
  const packages = await db.from("virtual_locker_packages")
    .select("id,prealert_id,branch,tracking,weight_lb,dimensions,received_at,shipment_reference")
    .eq("store_id", auth.store).eq("locker_id", locker.id).order("received_at", { ascending: false });
  if (packages.error) return response({ error: "No se pudieron cargar tus paquetes." }, 503);
  const alerts = await db.from("virtual_locker_prealerts")
    .select("id,tracking,tracking_url,merchant,contents,items,declared_value,completed_at,created_at,dispatched_at,delivered_at,external_tracking,external_url,invoice_url,events")
    .eq("store_id", auth.store).eq("locker_id", locker.id).order("created_at", { ascending: false });
  if (alerts.error) return response({ error: "No se pudieron cargar tus prealertas." }, 503);
  const references = [...new Set(packages.data.flatMap(pkg => pkg.shipment_reference ? [pkg.shipment_reference] : []))];
  const guides = references.length ? await db.from("shipments")
    .select("tracking_code,status,service_price,public_tracking_enabled").eq("store_id", auth.store)
    .is("deleted_at", null).in("tracking_code", references) : { data: [], error: null };
  if (guides.error) return response({ error: "No se pudieron cargar las guías." }, 503);
  const byReference = new Map(guides.data.map(guide => [guide.tracking_code, guide]));
  return response({
    locker: { ...locker, email: auth.email },
    packages: packages.data.map(pkg => ({
      ...pkg, guide: byReference.get(pkg.shipment_reference) ?? null,
    })),
    prealerts: alerts.data.map(alert => ({ ...alert, events: alert.events.map(({ at, action }: { at: string; action: string }) => ({ at, action })) })),
  });
}

export async function PATCH(request: Request) {
  const auth = await customer(request);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (body?.action === "profile") {
    const input = profile.safeParse(body);
    if (!input.success) return response({ error: "Revisa el documento y los datos de entrega." }, 400);
    const { data, error } = await db.from("virtual_lockers").update(input.data)
      .eq("store_id", auth.store).eq("customer_user_id", auth.user).select(lockerFields).maybeSingle();
    if (error) return response({ error: "No se pudo guardar tu perfil." }, 503);
    if (!data) return response({ error: "Casillero no encontrado." }, 404);
    return response({ locker: { ...data, email: auth.email } });
  }
  // Existing customers retain the original code when they prove control of the registered email.
  const { data, error } = await db.from("virtual_lockers").update({ customer_user_id: auth.user })
    .eq("store_id", auth.store).eq("email_normalized", auth.email).is("customer_user_id", null).select("id").maybeSingle();
  if (error && error.code !== "23505") return response({ error: "No se pudo recuperar tu casillero." }, 503);
  return response({ linked: Boolean(data) || error?.code === "23505" });
}

export async function POST(request: Request) {
  const auth = await customer(request);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (body?.action === "prealert") {
    const input = prealert.safeParse(body);
    if (!input.success) return response({ error: "Revisa el rastreo, la tienda, el contenido y el valor." }, 400);
    const { data: locker, error: lookupError } = await db.from("virtual_lockers").select("id")
      .eq("store_id", auth.store).eq("customer_user_id", auth.user).maybeSingle();
    if (lookupError) return response({ error: "No se pudo consultar el casillero." }, 503);
    if (!locker) return response({ error: "Abre tu casillero para prealertar una compra." }, 403);
    const { tracking, tracking_url, merchant, items, declared_value } = input.data;
    const { error } = await db.from("virtual_locker_prealerts").insert({
      tracking, tracking_url, merchant, items, contents: items.map(item => `${item.quantity} × ${item.name}`).join(", "), declared_value, store_id: auth.store, locker_id: locker.id,
    });
    if (error?.code === "23505") return response({ error: "Ese rastreo ya tiene una prealerta." }, 409);
    return error ? response({ error: "No se pudo guardar la prealerta." }, 503) : response({ ok: true }, 201);
  }
  const input = profile.safeParse(body);
  if (!input.success || body?.accepted !== true) {
    return response({ error: "Revisa tus datos y acepta las reglas del casillero." }, 400);
  }
  const { error } = await db.from("virtual_lockers").insert({
    ...input.data, email: auth.email, customer_user_id: auth.user,
    store_id: auth.store, ...lockerRegistration(auth.slug),
  });
  if (error?.code === "23505") {
    const existing = await db.from("virtual_lockers").select("id")
      .eq("store_id", auth.store).eq("customer_user_id", auth.user).maybeSingle();
    if (existing.data) return response({ ok: true });
    return response({ error: "Ya existe un casillero para este correo. Actualiza la página o contacta a WF Cargo." }, 409);
  }
  if (error) return response({ error: "No se pudo registrar el casillero." }, 503);
  return response({ ok: true }, 201);
}
