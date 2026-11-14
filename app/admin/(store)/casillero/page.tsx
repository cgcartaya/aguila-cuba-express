"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { purchaseDate, purchaseStatus, type Purchase } from "@/lib/lockers/purchase";
import LockerDialog from "@/components/lockers/LockerDialog";
import { supabase } from "@/lib/supabase";

type LockerResult = {
  locker: { code: string; customer_name: string; phone: string; email: string; destination: string; verified_at: string | null };
  packages: { id: string; prealert_id: string | null; tracking: string | null; weight_lb: number; dimensions: string; received_at: string; shipment_reference: string | null }[];
  prealerts: Purchase[];
  identification?: string;
  identification_state?: string | null;
  identification_type?: "license" | "state_id" | null;
};

const field = "block w-full rounded border border-slate-300 bg-white p-2 text-slate-900";
const button = "rounded bg-blue-800 px-3 py-2 text-white disabled:opacity-50";

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
  lockers: { code: string; customer_name: string; verified_at: string | null; identification_last4: string | null; pending_prealerts: number }[];
  canSearchIdentification: boolean;
  count: number;
  limit: number;
};

const emptyFilters = { code: "", name: "", identification: "", pending: false };

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

  const [credentials, setCredentials] = useState<{ code: string; email: string; password: string }>();
  const [createMessage, setCreateMessage] = useState("");

  async function createLocker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const { accepted, email_checked, ...fields } = Object.fromEntries(new FormData(form));
    setBusy(true);
    setCredentials(undefined);
    setCreateMessage("");
    try {
      setCredentials(await api("", {
        ...fields, action: "create", accepted: accepted === "on", email_checked: email_checked === "on",
      }));
      form.reset();
      setRefresh(value => value + 1);
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : "No se pudo crear el casillero.");
    } finally {
      setBusy(false);
    }
  }

  const record = useRef<HTMLDialogElement>(null);

  async function run(value: string, body?: object) {
    setBusy(true);
    setMessage("");
    if (!body) setResult(null);
    try {
      if (body) await api(value, body);
      setResult(await api(value));
      if (!body) record.current?.showModal();
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
    void run(result.locker.code, { ...fields, tracking: String(fields.tracking).trim() || null, prealert_id: fields.prealert_id || null, label_checked: fields.label_checked === "on", action: "receive", weight_lb: Number(fields.weight_lb) });
  }

  return <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm text-slate-600">WF Cargo · Administración</p><h1 className="text-3xl font-bold tracking-tight">Casilleros abiertos</h1></div>
      {list?.canSearchIdentification && <LockerDialog label="+ Crear casillero" title="Crear casillero manualmente">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={createLocker}>
        <label>Nombre completo <input className={field} name="customer_name" maxLength={120} required /></label>
        <label>Correo del cliente <input className={field} name="email" type="email" maxLength={254} required /></label>
        <label>Teléfono o WhatsApp <input className={field} name="phone" type="tel" maxLength={24} required /></label>
        <label className="sm:col-span-2">País y dirección de entrega <textarea className={field} name="destination" maxLength={350} required /></label>
        <label>Número de identificación <input className={field} name="identification" maxLength={60} required autoComplete="off" /></label>
        <label className="sm:col-span-2"><input name="email_checked" type="checkbox" required /> Comprobé que el cliente controla este correo.</label>
        <label className="sm:col-span-2"><input name="accepted" type="checkbox" required /> El cliente aceptó las reglas del casillero.</label>
        <button className={`${button} sm:col-span-2`} disabled={busy}>Crear casillero y generar contraseña</button>
      </form>
      {credentials && <div className="mt-4 grid gap-2 rounded border p-3">
        <p>Casillero creado · {credentials.code}</p>
        <p>Correo · {credentials.email}</p>
        <p>Contraseña · <code>{credentials.password}</code></p>
        <p>Comparte el acceso en privado con el titular. La contraseña se muestra solo en esta pantalla.</p>
        <button type="button" className={button} onClick={async () => {
          try {
            await navigator.clipboard.writeText(`Entra a https://wfcargoenviospsl.com/casillero y selecciona Entrar con una cuenta de correo existente.\nCasillero: ${credentials.code}\nCorreo: ${credentials.email}\nContraseña: ${credentials.password}`);
            setCreateMessage("Acceso copiado.");
          } catch { setCreateMessage("Selecciona y copia los datos de acceso de esta pantalla."); }
        }}>Copiar datos de acceso</button>
        <button type="button" className="underline" onClick={() => { setCredentials(undefined); setCreateMessage(""); }}>Ocultar credenciales</button>
      </div>}
      <p role="status">{createMessage}</p>
      </LockerDialog>}
    </header>
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-bold">Directorio de casilleros</h2>
      <form className="grid items-end gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap" onSubmit={event => {
        event.preventDefault();
        setSearch({ query: { ...filters }, page: 0 });
      }}>
        <label className="grid gap-1">Código<input className={field} value={filters.code} onChange={event => setFilters({ ...filters, code: event.target.value })} placeholder="WF-1001" maxLength={30} /></label>
        <label className="grid gap-1">Nombre<input className={field} value={filters.name} onChange={event => setFilters({ ...filters, name: event.target.value })} placeholder="Nombre o apellido" maxLength={120} /></label>
        {list?.canSearchIdentification && <label className="grid gap-1">ID o licencia<input className={field} value={filters.identification} onChange={event => setFilters({ ...filters, identification: event.target.value })} placeholder="Número o últimos 4" maxLength={60} autoComplete="off" /></label>}
        <label><input type="checkbox" checked={filters.pending} onChange={event => setFilters({ ...filters, pending: event.target.checked })} /> Con prealertas pendientes</label>
        <button className={button}>Filtrar</button>
        <button type="button" className="underline" onClick={() => { setFilters(emptyFilters); setSearch({ query: emptyFilters, page: 0 }); }}>Limpiar</button>
      </form>
      <p role="status">{listMessage || (list ? `${list.count} casilleros` : "Cargando casilleros…")}</p>
      {list && <div className="overflow-x-auto"><table className="w-full text-left">
        <thead><tr className="border-b border-slate-200 bg-slate-100"><th className="p-2">Código</th><th className="p-2">Titular</th>{list.canSearchIdentification && <th className="p-2">Identificación</th>}<th className="p-2">Verificación</th><th className="p-2">Prealertas pendientes</th><th className="p-2">Ficha</th></tr></thead>
        <tbody>{list.lockers.map(locker => <tr key={locker.code} className="border-b border-slate-100">
          <td className="p-2 font-semibold">{locker.code}</td><td className="p-2">{locker.customer_name}</td>
          {list.canSearchIdentification && <td className="p-2">{locker.identification_last4 ? `•••• ${locker.identification_last4}` : "—"}</td>}
          <td className="p-2"><span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${locker.verified_at ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-950"}`}>{locker.verified_at ? "Verificado" : "Pendiente"}</span></td>
          <td className="p-2">{locker.pending_prealerts || "—"}</td><td className="p-2"><button type="button" className={button} disabled={busy} onClick={() => void run(locker.code)}>Ver ficha</button></td>
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
    <dialog ref={record} aria-labelledby="locker-record-title" onClose={() => { setResult(null); setMessage(""); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/60">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 id="locker-record-title" className="text-xl font-bold">Ficha del casillero</h2>
        <button type="button" className={button} onClick={() => record.current?.close()}>Cerrar</button>
      </header>
      <p role="status">{message}</p>
      {result && <div className="grid gap-4">
      <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4">
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
      <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-bold">Prealertas</h2>
        {!result.prealerts.length && <p>Todavía no hay prealertas.</p>}
        {result.prealerts.map(alert => {
          const boxes = result.packages.filter(pkg => pkg.prealert_id === alert.id);
          return <article key={alert.id} className="grid gap-3 rounded-xl border border-slate-200 p-4">
            <div><h3 className="font-bold">{alert.merchant} · #{alert.id.slice(0, 8).toUpperCase()}</h3>
              <p>{purchaseStatus(alert, boxes.length)} · {purchaseDate(alert.created_at)} · {boxes.length} caja(s)</p>
              <p>{alert.contents} · USD {alert.declared_value}</p></div>
            {boxes.map(pkg => <p key={pkg.id}>{pkg.tracking || "Sin rastreo"} · {pkg.weight_lb} lb · {purchaseDate(pkg.received_at)}</p>)}
            {!alert.completed_at && boxes.length > 0 && <button type="button" className={button} disabled={busy} onClick={() => void run(result.locker.code, { action: "complete", prealert_id: alert.id })}>Marcar recepción completa</button>}
            {alert.dispatched_at && !alert.delivered_at && <button type="button" className={button} disabled={busy} onClick={() => void run(result.locker.code, { action: "deliver_purchase", prealert_id: alert.id })}>Confirmar entrega</button>}
            <LockerDialog label="Editar datos" title="Editar compra">
              <form className="grid gap-3" onSubmit={event => {
                event.preventDefault();
                const fields = Object.fromEntries(new FormData(event.currentTarget));
                void run(result.locker.code, { ...fields, declared_value: Number(fields.declared_value), action: "edit_purchase", prealert_id: alert.id });
              }}>
                <label>Tienda<input className={field} name="merchant" defaultValue={alert.merchant} required maxLength={120} /></label>
                <label>Artículos<textarea className={field} name="contents" defaultValue={alert.contents} required maxLength={6500} /></label>
                <label>Valor (USD)<input className={field} type="number" min="0" step=".01" name="declared_value" defaultValue={alert.declared_value} required /></label>
                <label>Referencia externa<input className={field} name="external_tracking" defaultValue={alert.external_tracking ?? ""} /></label>
                <label>Enlace de rastreo final<input className={field} type="url" name="external_url" defaultValue={alert.external_url ?? ""} /></label>
                <label>Enlace de factura<input className={field} type="url" name="invoice_url" defaultValue={alert.invoice_url ?? ""} /></label>
                <button className={button} disabled={busy}>Guardar cambios</button>
                <p role="status">{message}</p>
              </form>
            </LockerDialog>
            {alert.completed_at && !alert.dispatched_at && result.locker.verified_at && <LockerDialog label="Registrar despacho" title="Registrar despacho externo">
              <form className="grid gap-3" onSubmit={event => {
                event.preventDefault();
                const fields = Object.fromEntries(new FormData(event.currentTarget));
                void run(result.locker.code, { ...fields, action: "send_purchase", prealert_id: alert.id });
              }}>
                <label>Referencia externa<input className={field} name="external_tracking" defaultValue={alert.external_tracking ?? ""} /></label>
                <label>Enlace de rastreo final<input className={field} type="url" name="external_url" defaultValue={alert.external_url ?? ""} /></label>
                <label>Enlace de factura<input className={field} type="url" name="invoice_url" defaultValue={alert.invoice_url ?? ""} /></label>
                <button className={button} disabled={busy}>Confirmar despacho</button>
                <p role="status">{message}</p>
              </form>
            </LockerDialog>}
          </article>;
        })}
      </section>
      <LockerDialog key={result.locker.code} label="Registrar recepción" title="Registrar recepción">
      <form onSubmit={receive} className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><input type="checkbox" name="label_checked" required /> Confirmé el titular y código de la etiqueta física · {result.locker.customer_name} · {result.locker.code}</label>
        <label>Compra asociada<select name="prealert_id" className={field}><option value="">Sin prealerta</option>{result.prealerts.filter(alert => !alert.completed_at).map(alert => <option key={alert.id} value={alert.id}>{alert.merchant} · {alert.tracking || alert.contents}</option>)}</select></label>
        <label>Sucursal<select name="branch" className={field} required><option value="">Selecciona</option><option>US 1</option><option>Bayshore</option></select></label>
        <label>Rastreo del transportista (opcional)<input name="tracking" className={field} /></label>
        <label>Peso en libras <input name="weight_lb" type="number" min="0.01" step="0.01" className={field} required /></label>
        <label>Dimensiones en pulgadas <input name="dimensions" placeholder="24x24x24" className={field} required /></label>
        <button className={button} disabled={busy}>Registrar paquete</button>
      </form>
      <p className="mt-2" role="status">{message}</p>
      </LockerDialog>
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-xl font-bold">Paquetes recibidos</h2>
        {!result.packages.length && <p>Todavía no hay paquetes registrados.</p>}
        {result.packages.map(pkg => <article key={pkg.id} className="grid gap-2 border-t pt-3">
          <p>{pkg.tracking || "Paquete sin rastreo"} · {pkg.weight_lb} lb · {pkg.dimensions} pulg</p>
          <p>Recepción: {new Date(pkg.received_at).toLocaleDateString("es-US", { timeZone: "America/New_York" })}</p>
          {/^\+?1?\d{10}$/.test(result.locker.phone.replace(/[ ()-]/g, "")) && <a className="underline" target="_blank" rel="noreferrer"
            href={`https://wa.me/${result.locker.phone.replace(/\D/g, "").padStart(11, "1")}?text=${encodeURIComponent(`Hola, WF Cargo recibió un paquete${pkg.tracking ? ` (${pkg.tracking})` : ""} en tu casillero ${result.locker.code}.`)}`}>Avisar por WhatsApp</a>}
          <p>{pkg.shipment_reference ? `Despachado · ${pkg.shipment_reference}` : "Recibido en almacén"}</p>
        </article>)}
      </section>
      </div>}
    </dialog>
  </main>;
}
