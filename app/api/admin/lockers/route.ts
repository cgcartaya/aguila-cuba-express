import { z } from "zod";
import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { response, staff } from "@/lib/procedures/server";

const code = z.string().trim().toUpperCase().regex(/^WF-\d{4,14}$/);
const mutation = z.discriminatedUnion("action", [
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
  if (user.supervisor && !locker.verified_at) {
    const identity = await db.from("virtual_lockers").select("identification")
      .eq("store_id", user.store).eq("id", locker.id).single();
    if (identity.error) return response({ error: "No se pudo consultar la identificación." }, 503);
    return response({ locker, packages: packages.data, identification: identity.data.identification });
  }
  return response({ locker, packages: packages.data });
}

export async function POST(request: Request) {
  const user = await staff(request);
  if (!user) return response({ error: "Acceso restringido a WF Cargo." }, 403);
  const input = mutation.safeParse(await request.json().catch(() => null));
  if (!input.success) return response({ error: "Revisa los datos ingresados." }, 400);
  const action = input.data;
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
