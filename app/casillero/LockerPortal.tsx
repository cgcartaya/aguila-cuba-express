"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { State } from "country-state-city";
import { Barcode, PackageCheck, ShoppingCart } from "lucide-react";
import { lockerWarehouse, whatsapp } from "@/components/landing/wfcargo/content";

const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { storageKey: "perla-wfcargo-locker", detectSessionInUrl: true },
}).auth;
const panel = "rounded-2xl border border-slate-200 bg-white p-5 sm:p-7";
const field = "block w-full rounded-lg border border-slate-300 px-3 py-2 text-base";
const primary = "inline-flex rounded-lg bg-blue-800 px-4 py-2.5 font-semibold text-white disabled:opacity-50";
const secondary = "inline-flex rounded-lg border border-slate-300 px-4 py-2 font-semibold";
const addressLines = [lockerWarehouse.street, lockerWarehouse.cityLine, `Tel. ${lockerWarehouse.phone}`];
const states = State.getStatesOfCountry("US").filter(state => !["AS", "GU", "MP", "PR", "UM", "VI"].includes(state.isoCode));
type Result = {
  locker: { code: string; customer_name: string; verified_at: string | null } | null;
  packages: { id: string; tracking: string; received_at: string; weight_lb: number; shipment_reference: string | null }[];
};

async function api(session: Session, method: string, body?: object) {
  const result = await fetch("/api/public/lockers", {
    method, headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const data = await result.json();
  if (!result.ok) throw new Error(data.error);
  return data;
}

export default function LockerPortal() {
  const [session, setSession] = useState<Session | null | undefined>();
  const [account, setAccount] = useState<{ userId: string; result: Result }>();
  const result = account?.userId === session?.user.id ? account?.result : undefined;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);


  useEffect(() => {
    const { data } = auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const load = useCallback(async (current: Session) => {
    const data: Result = await api(current, "GET");
    if (data.locker) return data;
    const { linked } = await api(current, "PATCH");
    return linked ? api(current, "GET") as Promise<Result> : data;
  }, []);

  useEffect(() => {
    if (!session) return;
    let current = true;
    void load(session).then(data => {
      if (!current) return;
      setAccount({ userId: session.user.id, result: data });
      if (data.locker) window.history.replaceState(null, "", "/casillero/mi-cuenta");
    }).catch(() => {
      if (current) setMessage("No pudimos cargar tu casillero. Recarga la página para reintentar.");
    });
    return () => { current = false; };
  }, [session, load]);

  async function continueWithGoogle() {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/casillero`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch {
      setMessage("No se pudo conectar con Google. Intenta de nuevo.");
      setBusy(false);
    }
  }

  async function access(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const credentials = { email: String(form.get("email")).trim(), password: String(form.get("password")) };
    setBusy(true);
    setMessage("");
    try {
      if (mode === "register") {
        const { data, error } = await auth.signUp({
          ...credentials, options: { emailRedirectTo: `${window.location.origin}/casillero` },
        });
        if (error) throw new Error("No se pudo crear la cuenta. Revisa tus datos o intenta iniciar sesión.");
        if (!data.session) setMessage("Revisa tu correo para confirmar la cuenta. Luego vuelve al casillero para completar tus datos.");
      } else {
        const { error } = await auth.signInWithPassword(credentials);
        if (error) throw new Error("Revisa el correo y la contraseña. Si acabas de registrarte, confirma primero tu correo.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo acceder.");
    } finally { setBusy(false); }
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const { accepted, ...fields } = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setMessage("");
    try {
      await api(session, "POST", { ...fields, accepted: accepted === "on" });
      setAccount({ userId: session.user.id, result: await load(session) });
      window.history.replaceState(null, "", "/casillero/mi-cuenta");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar el casillero.");
    } finally { setBusy(false); }
  }

  const locker = session && result?.locker;
  const address = locker ? [`${locker.customer_name} – ${locker.code}`, ...addressLines].join("\n") : "";
  const guide = locker ? [
    { title: "Compra en línea", Icon: ShoppingCart, image: `${locker.customer_name} · ${locker.code}`, text: "En Amazon, Walmart o eBay, escribe tu nombre completo junto al código WF en el campo de destinatario." },
    { title: "Prealerta tu compra", Icon: Barcode, image: "Rastreo y factura", text: "Envía el rastreo, la tienda, el contenido, el valor pagado y la factura por WhatsApp." },
    { title: "Consulta tus paquetes", Icon: PackageCheck, image: "Recepción en WF Cargo", text: "Cuando llegue un paquete, WF Cargo lo asigna con el nombre y el código de la etiqueta." },
  ] : [];

  return <div className="min-h-screen bg-slate-100 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7">
        <Link href="/" className="flex items-center gap-3 font-bold"><Image src="/wfcargo/logo.webp" alt="WF Cargo" width={64} height={64} /> WF Cargo Envíos</Link>
        {session ? <button className={secondary} onClick={async () => {
          const { error } = await auth.signOut({ scope: "local" });
          if (error) { setMessage("No se pudo cerrar la sesión. Intenta nuevamente."); return; }
          setAccount(undefined); setMessage(""); window.history.replaceState(null, "", "/casillero");
        }}>Cerrar sesión</button> : <Link href="/" className="font-semibold text-blue-800">Volver a WF Cargo</Link>}
      </div>
    </header>
    <main className="mx-auto grid max-w-6xl gap-5 px-4 py-7 sm:px-7 sm:py-10">
      {(session === undefined || (session && !result)) && !message && <p role="status">Cargando casillero…</p>}
      {session === null && <div className="grid items-start gap-5 md:grid-cols-2">
        <section className="grid min-h-64 content-center rounded-2xl bg-gradient-to-br from-slate-950 to-blue-800 p-7 text-white sm:p-10">
          <PackageCheck size={42} aria-hidden="true" />
          <h1 className="my-4 text-4xl font-bold tracking-tight">Tus compras tienen una dirección en EE. UU.</h1>
          <p>Usa tu código de WF Cargo para recibir tus pedidos de Amazon, Walmart, eBay y otras tiendas.</p>
        </section>
        <section className={panel}>
          <div className="mb-5 flex flex-wrap gap-2">
            <button className={mode === "login" ? primary : secondary} aria-pressed={mode === "login"} onClick={() => { setMode("login"); setMessage(""); }}>Iniciar sesión</button>
            <button className={mode === "register" ? primary : secondary} aria-pressed={mode === "register"} onClick={() => { setMode("register"); setMessage(""); }}>Registrarme</button>
          </div>
          <h2 className="mb-4 text-2xl font-bold">{mode === "login" ? "Entra a tu casillero" : "Crea tu cuenta"}</h2>
          <button type="button" className={`${secondary} w-full justify-center disabled:opacity-50`} disabled={busy} onClick={() => void continueWithGoogle()}>
            Continuar con Google
          </button>
          <p className="mb-4 mt-2 text-sm text-slate-600">Si ya tienes un casillero, elige la cuenta de Google con el mismo correo que usaste para abrirlo.</p>
          <form key={mode} onSubmit={access} className="grid gap-4">
            <label>Correo electrónico<input name="email" className={field} type="email" autoComplete="email" required /></label>
            <label>Contraseña<input name="password" className={field} type="password" minLength={mode === "register" ? 8 : undefined} autoComplete={mode === "register" ? "new-password" : "current-password"} required /></label>
            {mode === "register" && <p className="text-sm text-slate-600">Confirma tu correo primero. Si ya tenías un código WF, usa el correo que registraste para recuperarlo.</p>}
            <button className={primary} disabled={busy}>{mode === "login" ? "Entrar" : "Crear cuenta"}</button>
          </form>
        </section>
      </div>}
      {session && result && !locker && <section className={`${panel} mx-auto w-full max-w-2xl`}>
        <h1 className="mb-2 text-3xl font-bold">Abre tu casillero</h1>
        <p className="mb-5 text-slate-600">Completa tus datos para recibir tu código WF.</p>
        <form onSubmit={register} className="grid gap-4">
          <label>Nombre completo<input name="customer_name" className={field} autoComplete="name" required maxLength={120} /></label>
          <label>Teléfono<input name="phone" className={field} type="tel" autoComplete="tel" required maxLength={24} /></label>
          <label>País y dirección de entrega<textarea name="destination" className={field} required maxLength={350} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>Estado emisor<select name="identification_state" className={field} defaultValue="FL" required>{states.map(state => <option key={state.isoCode} value={state.isoCode}>{state.name}</option>)}</select></label>
            <label>Tipo de documento<select name="identification_type" className={field}><option value="license">Licencia de conducir</option><option value="state_id">ID estatal</option></select></label>
          </div>
          <label>Número de identificación<input name="identification" className={field} autoComplete="off" required maxLength={60} /></label>
          <p className="text-sm text-slate-600">Comprobamos el formato del número. WF Cargo verifica el documento antes del despacho. Si tu formato no está disponible, <a className="underline" href={whatsapp("Hola, necesito ayuda para abrir mi casillero con mi tipo de documento.")} target="_blank" rel="noreferrer">contacta a WF Cargo</a>.</p>
          <details className="space-y-2 text-sm text-slate-700">
            <summary className="font-semibold">Reglas del casillero</summary>
            <p>Fournier Investment Services LLC opera el servicio. El casillero es personal. WF Cargo verifica la identificación antes del despacho y retiene los paquetes cuyo nombre o código no coincide hasta que se acredite la compra.</p>
            <p>Prealerta cada compra por WhatsApp con su factura. WF Cargo confirma la recepción al registrar el paquete y puede abrirlo para inspección. Tienes 30 días de almacenaje gratuito y luego se cobra $1 por paquete al día.</p>
            <p>WF Cargo confirma el destino, los artículos admitidos, la tarifa, el seguro y los cargos antes del pago. Puedes solicitar consolidación. El despacho requiere el pago total.</p>
          </details>
          <label className="flex gap-2"><input type="checkbox" name="accepted" required /> Leí y acepto las reglas del casillero.</label>
          <button className={primary} disabled={busy}>Abrir mi casillero</button>
        </form>
      </section>}
      {locker && <>
        <div><h1 className="text-4xl font-bold tracking-tight">Mi casillero</h1><p className="mt-2 text-slate-600">Usa esta dirección y tu código al pagar en la tienda.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <section className={panel}><h2 className="text-xl font-bold">Tu código</h2><p className="my-3 break-all font-mono text-4xl font-bold text-blue-800">{locker.code}</p><p>{locker.verified_at ? "Titular verificado" : "Verificación de identidad pendiente"}</p></section>
          <section className={panel}><h2 className="text-xl font-bold">Dirección de entrega</h2><p className="my-3 whitespace-pre-line">{address}</p><button className={secondary} onClick={async () => {
            try { await navigator.clipboard.writeText(address); setMessage("Dirección copiada."); }
            catch { setMessage("Selecciona la dirección para copiarla."); }
          }}>Copiar dirección</button></section>
        </div>
        <section><h2 className="mb-3 text-2xl font-bold">Cómo funciona</h2><div className="grid gap-4 md:grid-cols-3">
          {guide.map(({ title, Icon, image, text }) => <article className={panel} key={title}>
            <div className="mb-4 grid min-h-28 place-items-center content-center gap-2 rounded-lg bg-blue-50 p-3 text-center text-sm font-semibold text-blue-900"><Icon size={34} aria-hidden="true" />{image}</div>
            <h3 className="mb-2 text-lg font-bold">{title}</h3><p className="text-slate-600">{text}</p>
            {title === "Prealerta tu compra" && <a className="mt-3 inline-block font-semibold text-blue-800 underline" href={whatsapp(`Hola, quiero prealertar una compra para ${locker.code}.\nRastreo: \nTienda: \nContenido: \nValor pagado: `)} target="_blank" rel="noreferrer">Prealertar por WhatsApp</a>}
          </article>)}
        </div></section>
        <section className={panel}>
          <h2 className="mb-3 text-xl font-bold">Paquetes recibidos</h2>
          {result?.packages.length ? <ul className="divide-y divide-slate-200">
            {result.packages.map(pkg => <li key={pkg.id} className="break-words py-3">
              <strong>{pkg.tracking}</strong> · {pkg.weight_lb} lb · {new Date(pkg.received_at).toLocaleDateString("es-US", { timeZone: "America/New_York" })}
              <p>{pkg.shipment_reference ? `Despachado · ${pkg.shipment_reference}` : "Recibido en almacén"}</p>
            </li>)}
          </ul> : <p>Aún no tienes paquetes registrados.</p>}
          <a className={`${primary} mt-4`} href={whatsapp(`Hola, quisiera ayuda con mi casillero ${locker.code}.`)} target="_blank" rel="noreferrer">Preguntar por WhatsApp</a>
        </section>
      </>}
      {message && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950">{message}</p>}
    </main>
  </div>;
}
