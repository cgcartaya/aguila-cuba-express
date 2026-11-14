import { randomBytes } from "node:crypto";
import { z } from "zod";
import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { normalizeIdentification } from "@/lib/lockers/identity";
import { response, staff } from "@/lib/procedures/server";

const code = z.string().trim().toUpperCase().regex(/^WF-\d{4,14}$/);
const listing = z.object({
  action: z.literal("list"),
  code: z.string().trim().max(30),
  name: z.string().trim().max(120),
  identification: z.string().trim().max(60).transform(normalizeIdentification),
  page: z.number().int().min(0).max(100000),
});
const mutation = z.discriminatedUnion("action", [
  listing,
  z.object({
    action: z.literal("create"),
    customer_name: z.string().trim().min(3).max(120),
    email: z.email().max(254).transform(value => value.toLowerCase()),
    phone: z.string().trim().regex(/^\+?[\d ()-]{7,24}$/),
    destination: z.string().trim().min(8).max(350),
    identification: z.string().trim().min(3).max(60),
    accepted: z.literal(true),
    email_checked: z.literal(true),
  }),
  z.object({ action: z.literal("verify"), code }),
  z.object({ action: z.literal("receive"), code, label_name: z.string().trim().min(3).max(120),
    tracking: z.string().trim().toUpperCase().min(3).max(120), weight_lb: z.number().positive().max(10000),
    dimensions: z.string().trim().regex(/^\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?$/i).max(60) }),
  z.object({ action: z.literal("dispatch"), code, package_id: z.uuid(),
    shipment_reference: z.string().trim().min(3).max(120) }),
]);
const normalizeName = (name: string) => name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

async function findLocker(store: string, value: string) {
  return db.from("virtual_lockers")
    .select("id,code,customer_name,phone,email,destination,verified_at,rules_version,accepted_at")
    .eq("store_id", store).eq("code", value).maybeSingle();
}

export async function GET(request: Request) {
  const user = await staff(request);
  if (!user) return response({ error: "Acceso restringido a WF Cargo." }, 403);
  const input = code.safeParse(new URL(request.url).searchParams.get("code"));
  if (!input.success) return response({ error: "Introduce un código de casillero válido." }, 400);
  const { data: locker, error } = await findLocker(user.store, input.data);
  if (error) return response({ error: "No se pudo consultar el casillero." }, 503);
  if (!locker) return response({ error: "Casillero no encontrado." }, 404);
  const packages = await db.from("virtual_locker_packages")
    .select("id,tracking,weight_lb,dimensions,received_at,shipment_reference")
    .eq("store_id", user.store).eq("locker_id", locker.id).order("received_at", { ascending: false });
  if (packages.error) return response({ error: "No se pudieron consultar los paquetes." }, 503);
  const prealerts = await db.from("virtual_locker_prealerts")
    .select("tracking,merchant,contents,declared_value").eq("store_id", user.store)
    .eq("locker_id", locker.id).order("created_at", { ascending: false });
  if (prealerts.error) return response({ error: "No se pudieron consultar las prealertas." }, 503);
  if (user.supervisor && !locker.verified_at) {
    const identity = await db.from("virtual_lockers").select("identification,identification_state,identification_type")
      .eq("store_id", user.store).eq("id", locker.id).single();
    if (identity.error) return response({ error: "No se pudo consultar la identificación." }, 503);
    return response({ locker, packages: packages.data, prealerts: prealerts.data, ...identity.data });
  }
  return response({ locker, packages: packages.data, prealerts: prealerts.data });
}

export async function POST(request: Request) {
  const user = await staff(request);
  if (!user) return response({ error: "Acceso restringido a WF Cargo." }, 403);
  const input = mutation.safeParse(await request.json().catch(() => null));
  if (!input.success) return response({ error: "Revisa los datos ingresados." }, 400);
  const action = input.data;
  if (action.action === "create") {
    if (!user.supervisor) return response({ error: "El alta manual requiere un administrador de WF Cargo." }, 403);
    const { customer_name, email, phone, destination, identification } = action;
    const existing = await db.from("virtual_lockers").select("id")
      .eq("store_id", user.store).eq("email_normalized", email).maybeSingle();
    if (existing.error) return response({ error: "No se pudo comprobar el correo." }, 503);
    if (existing.data) return response({ error: "Ya existe un casillero para ese correo." }, 409);
    const password = randomBytes(15).toString("base64url") + "!a1";
    const account = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (account.error || !account.data.user) {
      const duplicate = ["email_exists", "user_already_exists"].includes(account.error?.code ?? "");
      return response({ error: duplicate ? "Ese correo ya tiene una cuenta. El cliente debe usar su acceso existente." : "No se pudo crear la cuenta." }, duplicate ? 409 : 503);
    }
    const created = await db.from("virtual_lockers").insert({
      customer_name, email, phone, destination, identification,
      store_id: user.store, customer_user_id: account.data.user.id, code: "WF", rules_version: "WF-2026-11",
    }).select("code").single();
    if (created.error || !created.data) {
      const cleanup = await db.auth.admin.deleteUser(account.data.user.id);
      return response({ error: cleanup.error
        ? "No se pudo completar el alta. Contacta al soporte para revisar la cuenta antes de reintentar."
        : "No se pudo guardar el casillero. Puedes reintentar." }, 503);
    }
    return response({ code: created.data.code, email, password }, 201);
  }
  if (action.action === "list") {
    if (action.identification && !user.supervisor) {
      return response({ error: "La búsqueda por identificación requiere un administrador." }, 403);
    }
    const escape = (value: string) => value.replace(/[\\%_*]/g, match => `\\${match}`);
    const limit = 25;
    let query = db.from("virtual_lockers")
      .select("code,customer_name,verified_at,identification_normalized", { count: "exact" })
      .eq("store_id", user.store).order("number", { ascending: false })
      .range(action.page * limit, (action.page + 1) * limit - 1);
    if (action.code) {
      if (!/^[A-Z0-9-]+$/i.test(action.code)) return response({ error: "Revisa el código de casillero." }, 400);
      query = query.ilike("code", `%${action.code}%`);
    }
    if (action.name) query = query.ilike("customer_name", `%${escape(action.name)}%`);
    if (action.identification) {
      if (!/^[A-Z0-9]+$/.test(action.identification)) return response({ error: "Revisa el número de identificación." }, 400);
      query = /^\d{4}$/.test(action.identification)
        ? query.like("identification_normalized", `%${action.identification}`)
        : query.eq("identification_normalized", action.identification);
    }
    const { data, count, error } = await query;
    if (error) return response({ error: "No se pudieron consultar los casilleros." }, 503);
    return response({
      lockers: data.map(({ identification_normalized, ...row }) => ({
        ...row, identification_last4: user.supervisor ? identification_normalized.slice(-4) : null,
      })),
      canSearchIdentification: user.supervisor, count, limit,
    });
  }
  const { data: locker, error } = await findLocker(user.store, action.code);
  if (error) return response({ error: "No se pudo consultar el casillero." }, 503);
  if (!locker) return response({ error: "Casillero no encontrado." }, 404);
  if (action.action === "verify") {
    if (!user.supervisor) return response({ error: "La verificación requiere un administrador de WF Cargo." }, 403);
    const result = await db.from("virtual_lockers").update({ verified_by: user.id, verified_at: new Date().toISOString() })
      .eq("store_id", user.store).eq("id", locker.id).is("verified_at", null);
    return result.error ? response({ error: "No se pudo verificar el titular." }, 503) : response({ ok: true });
  }
  if (action.action === "receive") {
    if (normalizeName(action.label_name) !== normalizeName(locker.customer_name)) {
      return response({ error: "El nombre de la etiqueta no coincide. Retén el paquete y solicita el comprobante de compra." }, 409);
    }
    const result = await db.from("virtual_locker_packages").insert({
      store_id: user.store, locker_id: locker.id, tracking: action.tracking, weight_lb: action.weight_lb,
      dimensions: action.dimensions, received_by: user.id,
    });
    if (result.error?.code === "23505") return response({ error: "Ese rastreo ya fue registrado." }, 409);
    return result.error ? response({ error: "No se pudo registrar el paquete." }, 503) : response({ ok: true }, 201);
  }
  if (!locker.verified_at) return response({ error: "Verifica al titular antes de despachar." }, 409);
  const shipment = await db.from("shipments").select("tracking_code,payment_status")
    .eq("store_id", user.store).eq("tracking_code", action.shipment_reference)
    .is("deleted_at", null).maybeSingle();
  if (shipment.error) return response({ error: "No se pudo verificar la guía." }, 503);
  if (shipment.data?.payment_status !== "paid") {
    return response({ error: "Introduce el código de rastreo de una guía pagada de WF Cargo." }, 409);
  }
  const result = await db.from("virtual_locker_packages")
    .update({ shipment_reference: action.shipment_reference, dispatched_at: new Date().toISOString() })
    .eq("store_id", user.store).eq("locker_id", locker.id).eq("id", action.package_id)
    .is("dispatched_at", null).select("id").maybeSingle();
  if (result.error) return response({ error: "No se pudo registrar el despacho." }, 503);
  return result.data ? response({ ok: true }) : response({ error: "Paquete no disponible para despacho." }, 409);
}
