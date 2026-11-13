"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type LockerResult = {
  locker: { code: string; customer_name: string; phone: string; email: string; destination: string; verified_at: string | null };
  packages: { id: string; tracking: string; weight_lb: number; dimensions: string; received_at: string; shipment_reference: string | null }[];
  identification?: string;
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
    body: body ? JSON.stringify({ ...body, code }) : undefined,
  });
  const json = await result.json();
  if (!result.ok) throw new Error(json.error);
  return json;
}

export default function LockerAdmin() {
  const [code, setCode] = useState("");
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
      if (body) setMessage("Cambio guardado.");
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
    <h1 className="text-3xl font-bold">Casillero Virtual</h1>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void run(code); }}>
      <label className="grid gap-1">Código de la etiqueta
        <input className={field} value={code} onChange={event => setCode(event.target.value)} placeholder="WF-1001" required />
      </label>
      <button className={button} disabled={busy}>Buscar casillero</button>
    </form>
    <p role="status">{message}</p>
    {result && <div className="grid gap-4">
      <section className="grid gap-2 rounded border p-4">
        <h2 className="text-xl font-bold">{result.locker.code} · {result.locker.customer_name}</h2>
        <p>{result.locker.email} · {result.locker.phone}</p>
        <p>Destino: {result.locker.destination}</p>
        <p>{result.locker.verified_at ? "Titular verificado" : "Identidad pendiente de verificar"}</p>
        {result.identification && <div>
          <p>Identificación: {result.identification}</p>
          <button type="button" className={button} disabled={busy}
            onClick={() => void run(result.locker.code, { action: "verify" })}>Confirmar identificación verificada</button>
        </div>}
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
