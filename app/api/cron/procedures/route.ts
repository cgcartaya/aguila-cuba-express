import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { response } from "@/lib/procedures/server";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return response({ error: "No autorizado." }, 401);
  }
  const { error } = await db.rpc("procedure_purge");
  return error ? response({ error: "No se completó la limpieza." }, 503) : response({ ok: true });
}
