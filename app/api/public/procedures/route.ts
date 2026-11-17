import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { submission, requestValues } from "@/lib/procedures/submission";
import { catalog, procedurePublicStore, response } from "@/lib/procedures/server";


export async function GET(request: Request) {
  const store = await procedurePublicStore(request);
  if (!store) return response({ error: "Catálogo no disponible." }, 404);
  try {
    return response(await catalog(store.id, true));
  } catch {
    return response({ error: "Catálogo no disponible." }, 503);
  }
}

export async function POST(request: Request) {
  const store = await procedurePublicStore(request);
  if (!store) return response({ error: "Servicio no disponible." }, 404);
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return response({ error: "Formato de solicitud inválido." }, 415);
  }
  const parsed = submission.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const invalidPhone = parsed.error.issues.some(issue => issue.path[0] === "phone");
    return response({ error: invalidPhone
      ? "Ingresa un teléfono válido. Para EE. UU. puedes usar 10 dígitos o incluir el 1 inicial."
      : "Revisa los datos de contacto y los requisitos." }, 400);
  }
  const input = parsed.data;
  try {
    const entry = (await catalog(store.id, true)).find(row => row.service === input.service);
    const values = requestValues(input, entry);
    if (!values) return response({ error: "El catálogo cambió o faltan requisitos. Vuelve a cargar el formulario." }, 409);
    const { data, error } = await db.from("procedure_requests").insert({ ...values, store_id: store.id }).select("id").single();
    if (error) throw error;
    return response({ reference: data.id }, 201);
  } catch {
    return response({ error: "No pudimos registrar la solicitud. Inténtalo de nuevo." }, 503);
  }
}
