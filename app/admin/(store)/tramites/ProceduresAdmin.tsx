"use client";

import { FilePlus2, Files, SearchCheck, LoaderCircle, CheckCircle2, CircleX, UserRound, Plus, SlidersHorizontal } from "lucide-react";
import { getContrastTextColor, normalizeHex } from "@/lib/admin/theme";
import { useStore } from "@/hooks/useStore";
import { getCurrentAdminAccessCached } from "@/lib/admin/access-service";
import ManualRequest from "./ManualRequest";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { states, transitions, type CatalogEntry, type Configuration, type State } from "@/lib/procedures/catalog";

type Item = { id: string; label: string; optional: boolean; answer: "ready" | "missing" | "na"; verification: string; verified_at?: string };
type Entry = {
  id: string; service: string; version: number; variant: string; customer_name: string | null; phone: string | null;
  origin: string; internal_notes: string; email: string | null; state: State; revision: number; assigned_to: string | null;
  whatsapp_opt_in: boolean; checklist: Item[]; created_at: string;
};
type Employee = { user_id: string; profiles: { full_name: string; active: boolean } | null };
type Dashboard = { store: { name: string; color: string | null; slug: string }; requests: Entry[]; total: number; supervisor: boolean; employees: Employee[]; catalog: (CatalogEntry & { published_at: string | null })[]; counts: Record<string, number> };
type History = { revision: number; event: string; previous_state: State | null; next_state: State | null; created_at: string; actor_id: string | null };
import CatalogEditor from "./CatalogEditor";

const field = "rounded border border-slate-300 bg-white px-3 py-2 text-slate-900";
const button = "rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50";
const answers = { ready: "Listo", missing: "Pendiente", na: "No aplica" };

async function requestApi<T>(storeId: string | undefined, query = "", body?: object, method = body ? "POST" : "GET"): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Inicia sesión para continuar.");
  const access = await getCurrentAdminAccessCached();
  storeId = access.data?.isSuperAdmin ? storeId : access.data?.store?.id;
  const response = await fetch(`/api/admin/procedures${query}`, {
    method,
    headers: { ...(storeId ? { "x-store-id": storeId } : {}), Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

export default function ProceduresAdmin({ config = false }: { config?: boolean }) {
  const { store: selectedStore } = useStore();
  const api = useCallback(<T,>(query = "", body?: object, method = body ? "POST" : "GET") => requestApi<T>(selectedStore?.id, query, body, method), [selectedStore?.id]);
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<{ entry: Entry; history: History[]; snapshot: CatalogEntry }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creatingService, setCreatingService] = useState(false);
  const [service, setService] = useState("");
  const [draft, setDraft] = useState<Configuration>();
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const params = new URLSearchParams(query);
    params.set("page", String(page));
    return api<Dashboard>("", { filters: params.toString() }, "PUT");
  }, [page, query, api]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) { setLoading(true); setSelected(undefined); setError(""); } });
    load().then(data => { if (active) setDashboard(data); })
      .catch(error => { if (active) { setError(error.message); setDashboard(undefined); setSelected(undefined); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  async function detail(id: string) {
    setError("");
    try { setSelected(await api(`?id=${id}`)); }
    catch (error) { setError((error as Error).message); }
  }

  async function mutate(body: object, id?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("", body);
      setDashboard(await load());
      if (id) await detail(id);
      setNotice("Cambio guardado.");
      return true;
    } catch (error) { setError((error as Error).message); return false; }
    finally { setBusy(false); }
  }

  function filters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setQuery(new URLSearchParams(Array.from(values, ([key, value]) => [key, String(value)])).toString());
    setPage(0);
  }

  const entry = selected?.entry;
  const employees = dashboard?.employees.filter(employee => employee.profiles?.active) || [];
  const closed = entry?.state === "completed" || entry?.state === "cancelled";
  const serviceName = (key: string) => dashboard?.catalog.find(item => item.service === key)?.configuration.title || key;
  const color = normalizeHex(dashboard?.store.color);
  const brandStyle = { background: color, color: getContrastTextColor(color) };
  const employeeName = (id: string | null) => id ? employees.find(item => item.user_id === id)?.profiles?.full_name || id : "Sin asignar";
  const snapshot = selected?.snapshot;
  const badges: Record<string, string> = { new: "bg-blue-50 text-blue-700", pending: "bg-amber-50 text-amber-800", review: "bg-violet-50 text-violet-700", processing: "bg-cyan-50 text-cyan-800", completed: "bg-emerald-50 text-emerald-700", cancelled: "bg-rose-50 text-rose-700", unassigned: "bg-slate-100 text-slate-600" };
  const icons = [FilePlus2, Files, SearchCheck, LoaderCircle, CheckCircle2, CircleX, UserRound];
  const badge = (state: State) => <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badges[state]}`}>{states[state]}</span>;
  const update = (data: object) => entry && mutate({ ...data, id: entry.id, revision: entry.revision }, entry.id);

  return <div className="mx-auto grid w-full min-w-0 max-w-7xl gap-5 p-4 text-slate-900" style={{ fontFamily: "var(--font-manrope, Arial, sans-serif)" }}>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold tracking-tight">{config ? "Configuración de trámites" : "Solicitudes de trámites"}</h1>
      <p className="mt-2 text-sm text-slate-500">Gestiona y da seguimiento a todas las solicitudes de trámites de tus clientes.</p></div>
      {!config && dashboard && <button className={`${button} flex items-center gap-2 rounded-xl shadow-sm`} style={brandStyle} onClick={() => setManual(!manual)}><Plus size={18} />Nueva solicitud</button>}
    </header>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-900">{error}</p>}
    {notice && <p role="status" className="rounded bg-green-50 p-3">{notice}</p>}
    {!dashboard && !error && <p>Cargando solicitudes…</p>}
    {dashboard && (config ? dashboard.supervisor ? <section className="grid min-w-0 gap-4 rounded-xl border bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Catálogo y formularios</h2>
      <p className="text-sm text-slate-600">Guardar borrador conserva tus cambios para revisión. Publicar versión muestra la ficha y activa su formulario en la landing, si el formulario público está habilitado.</p>
      {dashboard.store.slug === "wf-cago" && !dashboard.catalog.length && <button className={`${button} justify-self-start`} disabled={busy} onClick={() => mutate({ action: "seed" })}>Cargar los seis borradores iniciales</button>}
      <button className={`${button} justify-self-start`} onClick={() => { setCreatingService(true); setService(""); setDraft({ title: "", description: "", fees: [], agencyFee: null, variants: [{ id: "general", title: "General", requirements: [{ id: "documentacion", label: "Documentación requerida", optional: false }] }] }); }}>Crear trámite</button>
      {creatingService && <label>Código del servicio <input value={service} className={field} placeholder="ejemplo: asesoria" pattern="[a-z0-9-]{1,64}" onChange={event => setService(event.target.value)} /></label>}
      {!creatingService && <label>Servicio <select className={field} value={service} onChange={event => {
        const id = event.target.value;
        setCreatingService(false);
        setService(id);
        setDraft(dashboard.catalog.find(item => item.service === id)?.configuration);
      }}>
        <option value="">Selecciona un servicio</option>
        {dashboard.catalog.map(item => <option key={item.service} value={item.service}>{item.configuration.title} · v{item.version} {item.published_at ? "publicado" : "borrador"}</option>)}
      </select></label>}
      {service && draft && <form className="grid gap-3" onSubmit={event => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        void mutate({ action: "catalog", service, configuration: draft, publish: submitter?.getAttribute("value") === "publish" }).then(ok => { if (ok) setCreatingService(false); });
      }}>
        <CatalogEditor value={draft} change={setDraft} />
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={busy}>Guardar borrador</button>
          <button className={button} disabled={busy} value="publish">Publicar versión</button>
        </div>
      </form>}
    </section> : <p>La configuración está disponible para administradores de la empresa.</p> : <>
      {manual && <ManualRequest catalog={dashboard.catalog.filter(item => item.configuration.active !== false)} employees={employees} supervisor={dashboard.supervisor}
        submit={async body => { const ok = await mutate(body); if (ok) setManual(false); return !!ok; }} close={() => setManual(false)} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {[...Object.entries(states), ["unassigned", "Sin asignar"]].map(([key, label], index) => {
          const Icon = icons[index];
          const active = key === "unassigned" ? new URLSearchParams(query).get("assigned") === "none" : new URLSearchParams(query).get("state") === key;
          return <button key={key} aria-pressed={active} onClick={() => { const filters = new URLSearchParams(query); if (key === "unassigned") filters.set("assigned", "none"); else filters.set("state", key); setQuery(filters.toString()); setPage(0); }}
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${active ? "ring-2 ring-slate-400" : "border-slate-100"}`}>
            <span className={`mb-3 inline-flex rounded-xl p-2 ${badges[key]}`}><Icon size={20} /></span>
            <strong className="block text-2xl">{dashboard.counts[key] ?? 0}</strong><span className="mt-1 block text-xs text-slate-500">{({ new: "Nuevas", completed: "Completadas", cancelled: "Canceladas" } as Record<string, string>)[key] || label}</span></button>;
        })}
      </div>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 font-semibold"><SlidersHorizontal size={18} />Filtros de búsqueda</h2>
      <form key={query} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={filters}>
        <input className={field} name="q" defaultValue={new URLSearchParams(query).get("q") || ""} aria-label="Buscar solicitudes" placeholder="Referencia, nombre, teléfono o correo" />
        <select className={field} name="state" defaultValue={new URLSearchParams(query).get("state") || ""} aria-label="Estado"><option value="">Todos los estados</option>
          {Object.entries(states).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select className={field} name="service" defaultValue={new URLSearchParams(query).get("service") || ""} aria-label="Servicio"><option value="">Todos los servicios</option>
          {dashboard.catalog.map(item => <option key={item.service} value={item.service}>{item.configuration.title}</option>)}</select>
        {dashboard.supervisor && <select className={field} name="assigned" defaultValue={new URLSearchParams(query).get("assigned") || ""} aria-label="Empleado"><option value="">Todos los empleados</option>
          <option value="none">Sin asignar</option>{employees.map(employee => <option key={employee.user_id} value={employee.user_id}>{employee.profiles?.full_name || employee.user_id}</option>)}</select>}
        <label>Desde (UTC) <input className={field} type="date" name="from" defaultValue={new URLSearchParams(query).get("from") || ""} /></label>
        <label>Hasta (UTC) <input className={field} type="date" name="until" defaultValue={new URLSearchParams(query).get("until") || ""} /></label>
        <label>Orden por fecha <select className={field} name="sort" defaultValue={new URLSearchParams(query).get("sort") || "newest"}><option value="newest">Más recientes</option><option value="oldest">Más antiguas</option></select></label>
        <div className="flex items-end gap-3"><button className={button} disabled={loading}>Filtrar</button>
        <button type="button" className={`${field} hover:bg-slate-50`} onClick={() => { setQuery(""); setPage(0); }}>Limpiar</button></div>
      </form></section>
      <section aria-busy={loading} className="overflow-hidden rounded-xl border bg-white">
        {loading && <p role="status" className="p-3">Cargando solicitudes…</p>}
        <table className="hidden w-full text-left text-sm lg:table">
          <thead className="text-white" style={brandStyle}><tr>{["Solicitante", "Referencia", "Servicio", "Estado", "Responsable", "Recibido", "Acción"].map(label => <th className="p-4" key={label}>{label}</th>)}</tr></thead>
          <tbody>{dashboard.requests.map(item => <tr className="border-t border-slate-100 transition hover:bg-slate-50" key={item.id}>
            <td className="p-4 font-medium">{item.customer_name || "Contacto eliminado"}<span className="block text-xs font-normal text-slate-500">{item.phone}</span></td>
            <td className="max-w-36 break-all px-3 font-mono text-xs">{item.id}</td><td className="px-3">{serviceName(item.service)}</td>
            <td className="px-3">{badge(item.state)}</td><td className="max-w-32 break-words px-3">{employeeName(item.assigned_to)}</td>
            <td className="px-3">{new Date(item.created_at).toLocaleString("es-US")}</td>
            <td className="px-3"><button className={`${field} text-xs font-semibold hover:bg-slate-100`} onClick={() => detail(item.id)}>Abrir</button></td>
          </tr>)}</tbody>
        </table>
        <div className="grid gap-3 p-3 lg:hidden">{dashboard.requests.map(item => <article key={item.id} className="grid gap-3 rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold">{item.customer_name || "Contacto eliminado"}</h3><p className="text-sm text-slate-500">{item.phone}</p></div>{badge(item.state)}</div>
          <p>{serviceName(item.service)}</p><p className="break-all font-mono text-xs text-slate-500">{item.id}</p>
          <p className="text-sm">Responsable: {employeeName(item.assigned_to)}</p><p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString("es-US")}</p>
          <button className={button} onClick={() => detail(item.id)}>Abrir</button>
        </article>)}</div>
        {!dashboard.requests.length && <p className="p-3">No hay solicitudes para estos filtros.</p>}
        <div className="flex items-center justify-between gap-2 p-3">
          <button className={button} disabled={!page || loading} onClick={() => setPage(page - 1)}>Anterior</button>
          <span>{dashboard.total} solicitudes</span>
          <button className={button} disabled={loading || (page + 1) * 25 >= dashboard.total} onClick={() => setPage(page + 1)}>Siguiente</button>
        </div>
      </section>
      {entry && <section className="grid gap-4 rounded-xl border bg-white p-4">
        <header className="flex flex-wrap justify-between gap-2">
          <h2 className="text-lg font-semibold">{serviceName(entry.service)} · {entry.customer_name || "Contacto eliminado"}</h2>
          <button className="underline" onClick={() => setSelected(undefined)}>Cerrar detalle</button>
        </header>
        <p className="break-all">Referencia {entry.id} · {entry.variant} · versión {entry.version}</p>
        <p>{entry.phone} {entry.email}</p>
        <p className="text-sm text-slate-500">Recibido: {new Date(entry.created_at).toLocaleString("es-US")} · Origen: {entry.origin} · Responsable: {employeeName(entry.assigned_to)}</p>
        <p>{snapshot?.configuration.variants.find(item => item.id === entry.variant)?.title || entry.variant}</p>
        {entry.whatsapp_opt_in && entry.phone && <a className="justify-self-start underline"
          href={`https://wa.me/${entry.phone.slice(1)}?text=${encodeURIComponent(`Hola, te contactamos sobre tu solicitud ${entry.id}.`)}`}
          target="_blank" rel="noreferrer">Contactar por WhatsApp</a>}
        <div className="flex flex-wrap gap-3">
          <label>Estado <select className={field} value={entry.state} disabled={busy || (closed && !dashboard.supervisor)}
            onChange={event => update({ action: "state", state: event.target.value })}>
            <option value={entry.state}>{states[entry.state]}</option>
            {transitions[entry.state].map(state => <option key={state} value={state}>{states[state]}</option>)}
          </select></label>
          {dashboard.supervisor && <label>Asignar a <select className={field} value={entry.assigned_to || ""} disabled={busy || closed}
            onChange={event => update({ action: "assign", employee: event.target.value || null })}>
            <option value="">Sin asignar</option>
            {employees.map(employee => <option key={employee.user_id} value={employee.user_id}>{employee.profiles?.full_name || employee.user_id}</option>)}
          </select></label>}
        </div>
        <h3 className="font-semibold">Verificación de requisitos</h3>
        <ul className="divide-y">{entry.checklist.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-2">
          <span>{item.label} <small className="block">Cliente · {answers[item.answer]}{item.verified_at && ` · ${new Date(item.verified_at).toLocaleString("es-US")}`}</small></span>
          <select className={field} aria-label={`Verificar ${item.label}`} value={item.verification} disabled={busy || closed}
            onChange={event => update({ action: "verify", requirement: item.id, verification: event.target.value })}>
            <option value="pending">Sin verificar</option><option value="verified">Verificado</option>
            {item.optional && <option value="na">No aplica</option>}
          </select>
        </li>)}</ul>
        <h3 className="font-semibold">Observaciones internas</h3>
        <p className="whitespace-pre-wrap text-sm">{entry.internal_notes || "Sin observaciones."}</p>
        <form key={`${entry.id}:${entry.revision}`} className="grid gap-2" onSubmit={event => { event.preventDefault(); const note = new FormData(event.currentTarget).get("note"); void update({ action: "note", note }); }}>
          <textarea className={field} name="note" aria-label="Nueva observación interna" required maxLength={2000} disabled={closed || busy} />
          <button className={`${button} justify-self-start`} disabled={closed || busy}>Agregar observación</button>
        </form>
        <h3 className="font-semibold">Historial</h3>
        <ul className="grid gap-2 text-sm">{selected.history.map(row => <li key={row.revision}>
          {new Date(row.created_at).toLocaleString("es-US")} · {row.event === "state" && row.previous_state && row.next_state
            ? `${states[row.previous_state]} → ${states[row.next_state]}`
            : ({ created: "Solicitud recibida", assignment: "Asignación actualizada", verification: "Requisito revisado", note: "Observación agregada" }[row.event] || row.event)}
          {row.actor_id && ` · ${employees.find(employee => employee.user_id === row.actor_id)?.profiles?.full_name || row.actor_id}`}
        </li>)}</ul>
      </section>}
    </>)}
  </div>;
}
