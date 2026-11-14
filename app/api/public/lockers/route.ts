import { z } from "zod";
import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { publicStore, response } from "@/lib/procedures/server";
import { identificationPattern, normalizeIdentification, validIdentification } from "@/lib/lockers/identity";

const registration = z.object({
  customer_name: z.string().trim().min(3).max(120),
  phone: z.string().trim().regex(/^\+?[\d ()-]{7,24}$/),
  destination: z.string().trim().min(8).max(350),
  identification: z.string().trim().min(3).max(60).transform(normalizeIdentification),
  identification_state: z.string().regex(/^[A-Z]{2}$/),
  identification_type: z.enum(["license", "state_id"]),
  accepted: z.literal(true),
});

async function customer(request: Request) {
  const store = await publicStore(request);
  if (!store) return { error: response({ error: "Casillero no disponible." }, 404) };
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return { error: response({ error: "Inicia sesión para continuar." }, 401) };
  const { data } = await db.auth.getUser(token);
  const user = data.user;
  if (!user?.email || !user.email_confirmed_at || user.is_anonymous) {
    return { error: response({ error: "Confirma tu correo e inicia sesión." }, 401) };
  }
  return { store: store.id, user: user.id, email: user.email.toLowerCase() };
}

const lockerFields = "id,code,customer_name,verified_at";

export async function GET(request: Request) {
  const auth = await customer(request);
  if (auth.error) return auth.error;
  const { data: locker, error } = await db.from("virtual_lockers").select(lockerFields)
    .eq("store_id", auth.store).eq("customer_user_id", auth.user).maybeSingle();
  if (error) return response({ error: "No se pudo cargar tu casillero." }, 503);
  if (!locker) return response({ locker: null, packages: [] });
  const packages = await db.from("virtual_locker_packages")
    .select("id,tracking,weight_lb,dimensions,received_at,shipment_reference")
    .eq("store_id", auth.store).eq("locker_id", locker.id).order("received_at", { ascending: false });
  if (packages.error) return response({ error: "No se pudieron cargar tus paquetes." }, 503);
  return response({ locker: { code: locker.code, customer_name: locker.customer_name, verified_at: locker.verified_at }, packages: packages.data });
}

export async function PATCH(request: Request) {
  const auth = await customer(request);
  if (auth.error) return auth.error;
  // Existing customers retain the original code when they prove control of the registered email.
  const { data, error } = await db.from("virtual_lockers").update({ customer_user_id: auth.user })
    .eq("store_id", auth.store).eq("email_normalized", auth.email).is("customer_user_id", null).select("id").maybeSingle();
  if (error && error.code !== "23505") return response({ error: "No se pudo recuperar tu casillero." }, 503);
  return response({ linked: Boolean(data) || error?.code === "23505" });
}

export async function POST(request: Request) {
  const auth = await customer(request);
  if (auth.error) return auth.error;
  const input = registration.safeParse(await request.json().catch(() => null));
  if (!input.success) return response({ error: "Revisa tus datos y acepta las reglas del casillero." }, 400);
  const { identification_state, identification_type, identification } = input.data;
  if (!identificationPattern(identification_state, identification_type)) {
    return response({ error: "El formato de ese documento aún no está disponible. Contacta a WF Cargo para abrir tu casillero." }, 400);
  }
  if (!validIdentification(identification_state, identification_type, identification)) {
    return response({ error: "El número no coincide con el formato del estado y documento que seleccionaste." }, 400);
  }
  const { accepted, ...details } = input.data;
  if (!accepted) return response({ error: "Acepta las reglas del casillero." }, 400);
  const { error } = await db.from("virtual_lockers").insert({
    ...details, email: auth.email, customer_user_id: auth.user,
    store_id: auth.store, code: "WF", rules_version: "WF-2026-11",
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
