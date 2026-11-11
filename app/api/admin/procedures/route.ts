import { z } from "zod";
import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { configuration, key, states, transitions, type State } from "@/lib/procedures/catalog";
import { initialCatalog } from "@/lib/procedures/seed";
import { catalog, response, staff } from "@/lib/procedures/server";

const mutation = z.discriminatedUnion("action", [
  z.object({ action: z.literal("seed") }).strict(),
  z.object({ action: z.literal("catalog"), service: key, configuration, publish: z.boolean() }).strict(),
  z.object({ action: z.literal("state"), id: z.uuid(), revision: z.number().int().nonnegative(), state: z.enum(statesKeys()) }).strict(),
  z.object({ action: z.literal("assign"), id: z.uuid(), revision: z.number().int().nonnegative(), employee: z.uuid().nullable() }).strict(),
  z.object({ action: z.literal("verify"), id: z.uuid(), revision: z.number().int().nonnegative(), requirement: key, verification: z.enum(["verified", "pending", "na"]) }).strict(),
]);

function statesKeys() {
  return Object.keys(states) as [State, ...State[]];
}

export async function GET(request: Request) {
  const params = new URLSearchParams();
  const id = new URL(request.url).searchParams.get("id");
  if (id) params.set("id", id);
  return readPanel(request, params);
}

export async function PUT(request: Request) {
  const input = z.object({ filters: z.string().max(1500) }).strict()
    .safeParse(await request.json().catch(() => null));
  if (!input.success) return response({ error: "Filtros inválidos." }, 400);
  const params = new URLSearchParams(input.data.filters);
  params.delete("id");
  return readPanel(request, params);
}

async function readPanel(request: Request, params: URLSearchParams) {
  const user = await staff(request);
  if (!user) return response({ error: "Acceso restringido al equipo de trámites de WF Cargo." }, 403);
  const id = z.uuid().safeParse(params.get("id"));
  try {
    let query = db.from("procedure_requests").select("*", { count: "exact" }).eq("store_id", user.store);
    if (!user.supervisor) query = query.eq("assigned_to", user.id);
    if (id.success) {
      const { data, error } = await query.eq("id", id.data).maybeSingle();
      if (error) throw error;
      if (!data) return response({ error: "Solicitud no disponible." }, 404);
      const history = await db.from("procedure_audit").select("revision,event,actor_id,previous_state,next_state,created_at")
        .eq("store_id", user.store).eq("request_id", id.data).order("revision", { ascending: false });
      if (history.error) throw history.error;
      return response({ entry: data, history: history.data });
    }
    const page = Math.max(0, Math.min(10000, Math.trunc(Number(params.get("page")) || 0)));
    const state = params.get("state");
    const service = key.safeParse(params.get("service"));
    const assigned = z.uuid().safeParse(params.get("assigned"));
    const from = params.get("from");
    const until = params.get("until");
    if (from && z.iso.date().safeParse(from).success) query = query.gte("created_at", `${from}T00:00:00Z`);
    if (until && z.iso.date().safeParse(until).success) query = query.lte("created_at", `${until}T23:59:59.999999Z`);
    const search = (params.get("q") || "").slice(0, 120).replace(/[^\p{L}\p{N}@.+ _-]/gu, "").replaceAll("_", "\\_").trim();
    if (state && Object.hasOwn(states, state)) query = query.eq("state", state);
    if (service.success) query = query.eq("service", service.data);
    if (assigned.success) query = query.eq("assigned_to", assigned.data);
    if (params.get("assigned") === "none") query = query.is("assigned_to", null);
    if (search) {
      const filters = [`customer_name.ilike.%${search}%`, `phone.ilike.%${search}%`, `email.ilike.%${search}%`];
      if (z.uuid().safeParse(search).success) filters.push(`id.eq.${search}`);
      query = query.or(filters.join(","));
    }
    const employeeQuery = user.supervisor
      ? db.from("store_users").select("user_id")
        .eq("store_id", user.store).eq("active", true).in("role", ["OWNER", "ADMIN", "OPERATIONS"])
      : Promise.resolve({ data: [], error: null });
    const totals = Promise.all([...statesKeys(), "unassigned"].map(async status => {
      let countQuery = db.from("procedure_requests").select("id", { count: "exact", head: true }).eq("store_id", user.store);
      if (!user.supervisor) countQuery = countQuery.eq("assigned_to", user.id);
      const result = await (status === "unassigned" ? countQuery.is("assigned_to", null) : countQuery.eq("state", status));
      if (result.error) throw result.error;
      return [status, result.count];
    }));
    const [result, employees, entries, counts] = await Promise.all([
      query.order("created_at", { ascending: false }).range(page * 25, page * 25 + 24),
      employeeQuery, catalog(user.store, !user.supervisor), totals,
    ]);
    if (result.error || employees.error) throw result.error || employees.error;
    const ids = employees.data?.map(row => row.user_id) || [];
    const profiles = ids.length
      ? await db.from("profiles").select("id,full_name,active").in("id", ids).eq("active", true)
      : { data: [], error: null };
    if (profiles.error) throw profiles.error;
    return response({ requests: result.data, total: result.count,
      employees: profiles.data?.map(profile => ({ user_id: profile.id, profiles: profile })), catalog: entries,
      supervisor: user.supervisor, counts: Object.fromEntries(counts) });
  } catch {
    return response({ error: "No se pudo consultar el panel." }, 503);
  }
}

export async function POST(request: Request) {
  const user = await staff(request);
  if (!user) return response({ error: "Acceso restringido." }, 403);
  const parsed = mutation.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: "Datos inválidos." }, 400);
  const input = parsed.data;
  try {
    if (input.action === "catalog" || input.action === "seed") {
      if (!user.supervisor) return response({ error: "Acceso restringido." }, 403);
      const entries = await catalog(user.store, false);
      const rows = input.action === "seed"
        ? Object.entries(initialCatalog).filter(([service]) => !entries.some(row => row.service === service))
            .map(([service, configuration]) => ({ service, configuration, version: 1, published_at: null }))
        : [{ service: input.service, configuration: input.configuration,
            version: (entries.find(row => row.service === input.service)?.version || 0) + 1,
            published_at: input.publish ? new Date().toISOString() : null }];
      if (rows.length) {
        const { error } = await db.from("procedure_catalog").insert(rows.map(row => ({ ...row, store_id: user.store })));
        if (error?.code === "23505") return response({ error: "El catálogo cambió. Actualiza e inténtalo de nuevo." }, 409);
        if (error) throw error;
      }
      return response({ ok: true });
    }
    let query = db.from("procedure_requests").select("revision,state,assigned_to,checklist")
      .eq("store_id", user.store).eq("id", input.id);
    if (!user.supervisor) query = query.eq("assigned_to", user.id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return response({ error: "Solicitud no disponible." }, 404);
    if (data.revision !== input.revision) return response({ error: "La solicitud cambió. Actualiza e inténtalo de nuevo." }, 409);
    const closed = ["completed", "cancelled"].includes(data.state);
    const checklist = data.checklist as { id: string; optional: boolean; verification: string; verified_by?: string; verified_at?: string }[];
    if (input.action === "state") {
      if ((closed && !user.supervisor) || !transitions[data.state as State].includes(input.state)) {
        return response({ error: "Cambio de estado no permitido." }, 409);
      }
      if (input.state === "completed" && checklist.some(item =>
        item.verification !== "verified" && !(item.optional && item.verification === "na"))) {
        return response({ error: "Verifica todos los requisitos aplicables antes de completar." }, 409);
      }
      data.state = input.state;
    } else if (closed) {
      return response({ error: "Reabre la solicitud antes de editarla." }, 409);
    } else if (input.action === "assign") {
      if (!user.supervisor) return response({ error: "Acceso restringido." }, 403);
      if (input.employee) {
        const [employee, profile] = await Promise.all([
          db.from("store_users").select("user_id").eq("store_id", user.store)
            .eq("user_id", input.employee).eq("active", true).in("role", ["OWNER", "ADMIN", "OPERATIONS"]).maybeSingle(),
          db.from("profiles").select("id").eq("id", input.employee).eq("active", true).maybeSingle(),
        ]);
        if (employee.error || profile.error) throw employee.error || profile.error;
        if (!employee.data || !profile.data) return response({ error: "Empleado no disponible." }, 400);
      }
      data.assigned_to = input.employee;
    } else {
      const item = checklist.find(item => item.id === input.requirement);
      if (!item || (!item.optional && input.verification === "na")) return response({ error: "Verificación inválida." }, 400);
      item.verification = input.verification;
      item.verified_by = user.id;
      item.verified_at = new Date().toISOString();
    }
    const saved = await db.rpc("procedure_update", { p_store: user.store, p_request: input.id,
      p_revision: input.revision, p_actor: user.id, p_state: data.state,
      p_assignee: data.assigned_to, p_checklist: checklist });
    if (saved.error) throw saved.error;
    return saved.data ? response({ ok: true }) : response({ error: "La solicitud cambió. Actualiza e inténtalo de nuevo." }, 409);
  } catch {
    return response({ error: "No se pudo guardar el cambio." }, 503);
  }
}
