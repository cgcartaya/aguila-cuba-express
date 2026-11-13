import { z } from "zod";
import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { publicStore, response } from "@/lib/procedures/server";

const registration = z.object({
  customer_name: z.string().trim().min(3).max(120),
  email: z.email().max(254).transform(value => value.toLowerCase()),
  phone: z.string().trim().regex(/^\+?[\d ()-]{7,24}$/),
  destination: z.string().trim().min(8).max(350),
  identification: z.string().trim().min(3).max(60),
  accepted: z.literal(true),
});

export async function POST(request: Request) {
  const store = await publicStore(request);
  if (!store) return response({ error: "Casillero no disponible." }, 404);
  const input = registration.safeParse(await request.json().catch(() => null));
  if (!input.success) return response({ error: "Revisa tus datos y acepta las reglas del casillero." }, 400);
  const { customer_name, email, phone, destination, identification } = input.data;
  const { data, error } = await db.from("virtual_lockers").insert({
    customer_name, email, phone, destination, identification,
    store_id: store.id, code: "WF", rules_version: "WF-2026-11",
  }).select("code").single();
  if (error?.code === "23505") return response({ error: "Ya existe un registro con ese correo. Contacta a WF Cargo para recuperar tu código." }, 409);
  if (error || !data) return response({ error: "No se pudo registrar el casillero." }, 503);
  return response({ code: data.code }, 201);
}
