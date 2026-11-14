"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type LockerResult = {
  locker: { code: string; customer_name: string; phone: string; email: string; destination: string; verified_at: string | null };
  packages: { id: string; tracking: string; weight_lb: number; dimensions: string; received_at: string; shipment_reference: string | null }[];
  prealerts: { tracking: string; merchant: string; contents: string; declared_value: number }[];
  identification?: string;
  identification_state?: string | null;
  identification_type?: "license" | "state_id" | null;
};

const field = "rounded border border-slate-300 bg-white p-2 text-slate-900";
const button = "rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50";

async function api(code: string, body?: object) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Inicia sesión para continuar.");
  const result = await fetch(`/api/admin/lockers?code=${encodeURIComponent(code)}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body && { "Content-Type": "application/json" }) },
    body: body ? JSON.stringify({ code, ...body }) : undefined,
  });
  const json = await result.json();
  if (!result.ok) throw new Error(json.error);
  return json;
}

type LockerList = {
  lockers: { code: string; customer_name: string; verified_at: string | null; identification_last4: string | null }[];
  canSearchIdentification: boolean;
  count: number;
  limit: number;
};

const emptyFilters = { code: "", name: "", identification: "" };

export default function LockerAdmin() {
  const [filters, setFilters] = useState(emptyFilters);
  const [{ query, page }, setSearch] = useState({ query: emptyFilters, page: 0 });
  const [list, setList] = useState<LockerList>();
  const [listMessage, setListMessage] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let current = true;
    void api("", { action: "list", ...query, page }).then(data => {
      if (!current) return;
      setList(data);
      setListMessage("");
    }).catch(error => {
      if (current) setListMessage(error instanceof Error ? error.message : "No se pudieron cargar los casilleros.");
    });
    return () => { current = false; };
  }, [query, page, refresh]);
  const [result, setResult] = useState<LockerResult | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(value: string, body?: object) {
    setBusy(true);
    setMessage("");
    if (!body) setResult(null);
    try {
      if (body) await api(value, body);
      setResult(await api(value));
      if (body) { setMessage("Cambio guardado."); setRefresh(value => value + 1); }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la operación.");
    } finally {
      setBusy(false);
    }
  }

  function receive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    void run(result.locker.code, { ...fields, action: "receive", weight_lb: Number(fields.weight_lb) });
  }

  return <main className="mx-auto grid max-w-4xl gap-5 p-6">
    <header><p className="text-sm text-slate-600">WF Cargo / Casillero Virtual</p><h1 className="text-3xl font-bold">Casilleros abiertos</h1></header>
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
        event.preventDefault();
        setSearch({ query: { ...filters }, page: 0 });
      }}>
        <label className="grid gap-1">Código<input className={field} value={filters.code} onChange={event => setFilters({ ...filters, code: event.target.value })} placeholder="WF-1001" maxLength={30} /></label>
        <label className="grid gap-1">Nombre<input className={field} value={filters.name} onChange={event => setFilters({ ...filters, name: event.target.value })} placeholder="Nombre o apellido" maxLength={120} /></label>
        {list?.canSearchIdentification && <label className="grid gap-1">ID o licencia<input className={field} value={filters.identification} onChange={event => setFilters({ ...filters, identification: event.target.value })} placeholder="Número o últimos 4" maxLength={60} autoComplete="off" /></label>}
        <button className={button}>Filtrar</button>
        <button type="button" className="underline" onClick={() => { setFilters(emptyFilters); setSearch({ query: emptyFilters, page: 0 }); }}>Limpiar</button>
      </form>
      <p role="status">{listMessage || (list ? `${list.count} casilleros` : "Cargando casilleros…")}</p>
      {list && <div className="overflow-x-auto"><table className="w-full text-left">
        <thead><tr className="border-b border-slate-200"><th className="p-2">Código</th><th className="p-2">Titular</th>{list.canSearchIdentification && <th className="p-2">Identificación</th>}<th className="p-2">Verificación</th><th className="p-2">Ficha</th></tr></thead>
        <tbody>{list.lockers.map(locker => <tr key={locker.code} className="border-b border-slate-100">
          <td className="p-2 font-semibold">{locker.code}</td><td className="p-2">{locker.customer_name}</td>
          {list.canSearchIdentification && <td className="p-2">{locker.identification_last4 ? `•••• ${locker.identification_last4}` : "—"}</td>}
          <td className="p-2">{locker.verified_at ? "Verificado" : "Pendiente"}</td>
          <td className="p-2"><button type="button" className={button} disabled={busy} onClick={() => void run(locker.code)}>Ver ficha</button></td>
        </tr>)}</tbody>
      </table></div>}
      {list && !list.lockers.length && <p>No se encontraron casilleros.</p>}
      {list && (page > 0 || list.count > list.limit) && <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={button} disabled={page === 0} onClick={() => setSearch({ query, page: page - 1 })}>Anterior</button>
        <span>Página {page + 1}</span>
        <button type="button" className={button} disabled={(page + 1) * list.limit >= list.count} onClick={() => setSearch({ query, page: page + 1 })}>Siguiente</button>
      </div>}
    </section>
    <p role="status">{message}</p>
    {result && <div className="grid gap-4">
      <section className="grid gap-2 rounded border p-4">
        <h2 className="text-xl font-bold">{result.locker.code} · {result.locker.customer_name}</h2>
        <p>{result.locker.email} · {result.locker.phone}</p>
        <p>Destino: {result.locker.destination}</p>
        <p>{result.locker.verified_at ? "Titular verificado" : "Identidad pendiente de verificar"}</p>
        {result.identification && <div>
          <p>{result.identification_type === "license" ? "Licencia" : result.identification_type === "state_id" ? "ID estatal" : "Identificación"} {result.identification_state} · {result.identification}</p>
          <button type="button" className={button} disabled={busy}
            onClick={() => void run(result.locker.code, { action: "verify" })}>Confirmar identificación verificada</button>
        </div>}
      </section>
      <section className="grid gap-2 rounded border p-4">
        <h2 className="text-xl font-bold">Prealertas</h2>
        {!result.prealerts.length && <p>Todavía no hay prealertas.</p>}
        {result.prealerts.map(alert => <p key={alert.tracking}>
          {alert.tracking} · {alert.merchant} · {alert.contents} · USD {alert.declared_value}
          {" · "}{result.packages.some(pkg => pkg.tracking === alert.tracking) ? "Recibido" : "Pendiente"}
        </p>)}
      </section>
      <form key={result.locker.code} onSubmit={receive} className="grid gap-3 rounded border p-4">
        <h2 className="text-xl font-bold">Registrar recepción</h2>
        <label>Nombre en la etiqueta <input name="label_name" className={field} required /></label>
        <label>Rastreo <input name="tracking" className={field} required /></label>
        <label>Peso en libras <input name="weight_lb" type="number" min="0.01" step="0.01" className={field} required /></label>
        <label>Dimensiones en pulgadas <input name="dimensions" placeholder="24x24x24" className={field} required /></label>
        <button className={button} disabled={busy}>Registrar paquete</button>
      </form>
      <section className="grid gap-3 rounded border p-4">
        <h2 className="text-xl font-bold">Paquetes recibidos</h2>
        {!result.packages.length && <p>Todavía no hay paquetes registrados.</p>}
        {result.packages.map(pkg => <article key={pkg.id} className="grid gap-2 border-t pt-3">
          <p>{pkg.tracking} · {pkg.weight_lb} lb · {pkg.dimensions} pulg</p>
          <p>Recepción: {new Date(pkg.received_at).toLocaleDateString("es-US", { timeZone: "America/New_York" })}</p>
          {/^\+?1?\d{10}$/.test(result.locker.phone.replace(/[ ()-]/g, "")) && <a className="underline" target="_blank" rel="noreferrer"
            href={`https://wa.me/${result.locker.phone.replace(/\D/g, "").padStart(11, "1")}?text=${encodeURIComponent(`Hola, WF Cargo recibió el paquete ${pkg.tracking} en tu casillero ${result.locker.code}.`)}`}>Avisar por WhatsApp</a>}
          {pkg.shipment_reference ? <p>Despachado · {pkg.shipment_reference}</p> : result.locker.verified_at && <>
            <Link className="underline" href="/admin/shipping/new">Crear guía en Envíos</Link>
            <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              void run(result.locker.code, { action: "dispatch", package_id: pkg.id, shipment_reference: fields.get("reference") });
            }}>
              <label className="grid gap-1">Rastreo de la guía pagada <input className={field} name="reference" required /></label>
              <button className={button} disabled={busy}>Registrar despacho</button>
            </form>
          </>}
        </article>)}
      </section>
    </div>}
  </main>;
}
