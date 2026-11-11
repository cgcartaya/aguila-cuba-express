import { z } from "zod";
import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { answers, key } from "@/lib/procedures/catalog";
import { catalog, publicStore, response } from "@/lib/procedures/server";

const submission = z.object({
  service: key, variant: key, version: z.number().int().positive(),
  name: z.string().trim().min(1).max(120).regex(/^[\p{L}\p{M} .'’-]+$/u),
  phone: z.string().regex(/^\+[1-9][0-9]{7,14}$/),
  email: z.string().trim().email().max(254),
  whatsapp: z.boolean(), checklist: z.record(key, answers),
}).strict();

export async function GET(request: Request) {
  const store = await publicStore(request);
  if (!store) return response({ error: "Catálogo no disponible." }, 404);
  try {
    return response(await catalog(store.id, true));
  } catch {
    return response({ error: "Catálogo no disponible." }, 503);
  }
}

export async function POST(request: Request) {
  const store = await publicStore(request);
  if (!store) return response({ error: "Servicio no disponible." }, 404);
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return response({ error: "Formato de solicitud inválido." }, 415);
  }
  const parsed = submission.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: "Revisa los datos de contacto y los requisitos." }, 400);
  const input = parsed.data;
  try {
    const entry = (await catalog(store.id, true)).find(row => row.service === input.service);
    const variant = entry?.configuration.variants.find(item => item.id === input.variant);
    if (!entry || entry.version !== input.version || !variant) {
      return response({ error: "El catálogo cambió. Vuelve a cargar el formulario." }, 409);
    }
    if (Object.keys(input.checklist).length !== variant.requirements.length ||
        variant.requirements.some(item => !input.checklist[item.id] ||
          (!item.optional && input.checklist[item.id] === "na"))) {
      return response({ error: "Marca cada requisito aplicable." }, 400);
    }
    const { data, error } = await db.from("procedure_requests").insert({
      store_id: store.id, service: entry.service, version: entry.version, variant: variant.id,
      customer_name: input.name, phone: input.phone, email: input.email, whatsapp_opt_in: input.whatsapp,
      checklist: variant.requirements.map(item => ({
        ...item, answer: input.checklist[item.id], verification: "pending",
      })),
    }).select("id").single();
    if (error) throw error;
    return response({ reference: data.id }, 201);
  } catch {
    return response({ error: "No pudimos registrar la solicitud. Inténtalo de nuevo." }, 503);
  }
}
