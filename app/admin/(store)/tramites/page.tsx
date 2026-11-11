"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { states, transitions, type CatalogEntry, type Configuration, type State } from "@/lib/procedures/catalog";

type Item = { id: string; label: string; optional: boolean; answer: "ready" | "missing" | "na"; verification: string; verified_at?: string };
type Entry = {
  id: string; service: string; version: number; variant: string; customer_name: string | null; phone: string | null;
  email: string | null; state: State; revision: number; assigned_to: string | null;
  whatsapp_opt_in: boolean; checklist: Item[]; created_at: string;
};
type Employee = { user_id: string; profiles: { full_name: string; active: boolean } | null };
type Dashboard = { requests: Entry[]; total: number; supervisor: boolean; employees: Employee[]; catalog: (CatalogEntry & { published_at: string | null })[]; counts: Record<string, number> };
type History = { revision: number; event: string; previous_state: State | null; next_state: State | null; created_at: string; actor_id: string | null };
import CatalogEditor from "./CatalogEditor";

const field = "rounded border border-slate-300 bg-white px-3 py-2 text-slate-900";
const button = "rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50";
const answers = { ready: "Listo", missing: "Pendiente", na: "No aplica" };

async function api<T>(query = "", body?: object, method = body ? "POST" : "GET"): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Inicia sesión para continuar.");
  const response = await fetch(`/api/admin/procedures${query}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

export default function ProceduresAdmin() {
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<{ entry: Entry; history: History[] }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState(false);
  const [service, setService] = useState("");
  const [draft, setDraft] = useState<Configuration>();
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const params = new URLSearchParams(query);
    params.set("page", String(page));
    return api<Dashboard>("", { filters: params.toString() }, "PUT");
  }, [page, query]);

  useEffect(() => {
    let active = true;
    load().then(data => { if (active) setDashboard(data); })
      .catch(error => { if (active) setError(error.message); });
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
    } catch (error) { setError((error as Error).message); }
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
  const update = (data: object) => entry && mutate({ ...data, id: entry.id, revision: entry.revision }, entry.id);

  return <div className="mx-auto grid max-w-6xl gap-5 p-4 text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">Gestión de trámites</h1>
      {dashboard?.supervisor && <button className={button} onClick={() => setConfig(!config)}>{config ? "Ver solicitudes" : "Configuración"}</button>}
    </header>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-900">{error}</p>}
    {notice && <p role="status" className="rounded bg-green-50 p-3">{notice}</p>}
    {!dashboard && !error && <p>Cargando solicitudes…</p>}
    {dashboard && (config ? <section className="grid gap-3 rounded-xl bg-white p-4">
      <h2 className="text-lg font-semibold">Catálogo y formularios</h2>
      <button className={`${button} justify-self-start`} disabled={busy} onClick={() => mutate({ action: "seed" })}>Cargar los seis borradores iniciales</button>
      <label>Servicio <select className={field} value={service} onChange={event => {
        const id = event.target.value;
        setService(id);
        setDraft(dashboard.catalog.find(item => item.service === id)?.configuration);
      }}>
        <option value="">Selecciona un servicio</option>
        {dashboard.catalog.map(item => <option key={item.service} value={item.service}>{item.configuration.title} · v{item.version} {item.published_at ? "publicado" : "borrador"}</option>)}
      </select></label>
      {service && draft && <form className="grid gap-3" onSubmit={event => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        void mutate({ action: "catalog", service, configuration: draft, publish: submitter?.getAttribute("value") === "publish" });
      }}>
        <CatalogEditor value={draft} change={setDraft} />
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={busy}>Guardar borrador</button>
          <button className={button} disabled={busy} value="publish">Publicar versión</button>
        </div>
      </form>}
    </section> : <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[...Object.entries(states), ["unassigned", "Sin asignar"]].map(([key, label]) =>
          <div key={key} className="rounded-xl border bg-white p-3"><p className="text-sm">{label}</p><strong className="text-xl">{dashboard.counts[key] ?? 0}</strong></div>)}
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={filters}>
        <input className={field} name="q" aria-label="Buscar solicitudes" placeholder="Referencia, nombre, teléfono o correo" />
        <select className={field} name="state" aria-label="Estado"><option value="">Todos los estados</option>
          {Object.entries(states).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select className={field} name="service" aria-label="Servicio"><option value="">Todos los servicios</option>
          {dashboard.catalog.map(item => <option key={item.service} value={item.service}>{item.configuration.title}</option>)}</select>
        {dashboard.supervisor && <select className={field} name="assigned" aria-label="Empleado"><option value="">Todos los empleados</option>
          <option value="none">Sin asignar</option>{employees.map(employee => <option key={employee.user_id} value={employee.user_id}>{employee.profiles?.full_name || employee.user_id}</option>)}</select>}
        <label>Desde (UTC) <input className={field} type="date" name="from" /></label>
        <label>Hasta (UTC) <input className={field} type="date" name="until" /></label>
        <button className={button}>Filtrar</button>
      </form>
      <section className="overflow-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead><tr>{["Solicitante", "Servicio", "Estado", "Recibido", "Acción"].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead>
          <tbody>{dashboard.requests.map(item => <tr className="border-t" key={item.id}>
            <td className="p-3">{item.customer_name || "Contacto eliminado"}</td><td>{serviceName(item.service)}</td>
            <td>{states[item.state]}</td><td>{new Date(item.created_at).toLocaleDateString("es-US")}</td>
            <td><button className="p-2 underline" onClick={() => detail(item.id)}>Abrir</button></td>
          </tr>)}</tbody>
        </table>
        {!dashboard.requests.length && <p className="p-3">No hay solicitudes para estos filtros.</p>}
        <div className="flex items-center justify-between gap-2 p-3">
          <button className={button} disabled={!page} onClick={() => setPage(page - 1)}>Anterior</button>
          <span>{dashboard.total} solicitudes</span>
          <button className={button} disabled={(page + 1) * 25 >= dashboard.total} onClick={() => setPage(page + 1)}>Siguiente</button>
        </div>
      </section>
      {entry && <section className="grid gap-4 rounded-xl border bg-white p-4">
        <header className="flex flex-wrap justify-between gap-2">
          <h2 className="text-lg font-semibold">{serviceName(entry.service)} · {entry.customer_name || "Contacto eliminado"}</h2>
          <button className="underline" onClick={() => setSelected(undefined)}>Cerrar detalle</button>
        </header>
        <p className="break-all">Referencia {entry.id} · {entry.variant} · versión {entry.version}</p>
        <p>{entry.phone} {entry.email}</p>
        {entry.whatsapp_opt_in && entry.phone && <a className="justify-self-start underline"
          href={`https://wa.me/${entry.phone.slice(1)}?text=${encodeURIComponent(`Hola, te contactamos de WF Cargo sobre tu solicitud ${entry.id}.`)}`}
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
        <h3 className="font-semibold">Historial</h3>
        <ul className="grid gap-2 text-sm">{selected.history.map(row => <li key={row.revision}>
          {new Date(row.created_at).toLocaleString("es-US")} · {row.event === "state" && row.previous_state && row.next_state
            ? `${states[row.previous_state]} → ${states[row.next_state]}`
            : ({ created: "Solicitud recibida", assignment: "Asignación actualizada", verification: "Requisito revisado" }[row.event] || row.event)}
          {row.actor_id && ` · ${employees.find(employee => employee.user_id === row.actor_id)?.profiles?.full_name || row.actor_id}`}
        </li>)}</ul>
      </section>}
    </>)}
  </div>;
}
