"use client";

import LockerRules from "@/components/landing/wfcargo/LockerRules";
import LockerDialog from "@/components/lockers/LockerDialog";
import { purchaseDate, purchaseStatus, type Purchase } from "@/lib/lockers/purchase";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { Country, State } from "country-state-city";
import { PackageCheck } from "lucide-react";
import { lockerWarehouse, shipping, whatsapp } from "@/components/landing/wfcargo/content";

const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { storageKey: "perla-wfcargo-locker", detectSessionInUrl: true },
}).auth;
const panel = "rounded-2xl border border-slate-200 bg-white p-5 sm:p-7";
const field = "block w-full rounded-lg border border-slate-300 px-3 py-2 text-base";
const primary = "inline-flex rounded-lg bg-blue-800 px-4 py-2.5 font-semibold text-white disabled:opacity-50";
const secondary = "inline-flex rounded-lg border border-slate-300 px-4 py-2 font-semibold";
const addressLines = [lockerWarehouse.street, lockerWarehouse.cityLine, `Tel. ${lockerWarehouse.phone}`];
const states = State.getStatesOfCountry("US").filter(state => !["AS", "GU", "MP", "PR", "UM", "VI"].includes(state.isoCode));
const countryNames = new Intl.DisplayNames(["es"], { type: "region" });
const countries = Country.getAllCountries()
  .map(({ isoCode }) => ({ code: isoCode, name: countryNames.of(isoCode) ?? isoCode }))
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

type Profile = {
  customer_name: string;
  email: string;
  phone: string;
  destination: string;
  destination_country: string | null;
  identification: string;
  identification_country: string | null;
  identification_state: string | null;
  identification_type: string | null;
};

function CountryField({ label, name, value, onChange }: {
  label: string; name: string; value: string; onChange?: (value: string) => void;
}) {
  return <label>{label}
    <select name={name} className={field} defaultValue={value} required onChange={event => onChange?.(event.target.value)}>
      <option value="">Selecciona un país</option>
      {countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
    </select>
  </label>;
}

function ProfileFields({ profile }: { profile?: Profile }) {
  const [issuer, setIssuer] = useState(profile?.identification_country ?? "");
  const [document, setDocument] = useState(profile?.identification_type ?? "national_id");
  const needsState = issuer === "US" && (document === "license" || document === "state_id");
  return <>
    <label>Nombre completo<input name="customer_name" className={field} autoComplete="name" required minLength={3} maxLength={120} defaultValue={profile?.customer_name} /></label>
    <label>Teléfono con código de país<input name="phone" className={field} type="tel" autoComplete="tel" required maxLength={24} defaultValue={profile?.phone} /></label>
    <fieldset className="grid gap-3"><legend className="font-semibold">Dirección de entrega</legend>
      <CountryField label="País de entrega" name="destination_country" value={profile?.destination_country ?? ""} />
      <label>Calle, número, municipio o ciudad, provincia y código postal si aplica
        <textarea name="destination" className={field} autoComplete="street-address" required minLength={8} maxLength={350} defaultValue={profile?.destination} />
      </label>
    </fieldset>
    <fieldset className="grid gap-3"><legend className="font-semibold">Documento de identidad</legend>
      <CountryField label="País emisor" name="identification_country" value={issuer} onChange={setIssuer} />
      <label>Tipo de documento
        <select name="identification_type" className={field} value={document} onChange={event => setDocument(event.target.value)}>
          <option value="national_id">Carné, cédula o documento nacional</option>
          <option value="passport">Pasaporte</option>
          <option value="license">Licencia de conducir</option>
          <option value="state_id">Identificación estatal</option>
          <option value="other">Otro documento</option>
        </select>
      </label>
      {needsState && <label>Estado emisor
        <select name="identification_state" className={field} defaultValue={profile?.identification_state ?? ""} required>
          <option value="">Selecciona un estado</option>
          {states.map(state => <option key={state.isoCode} value={state.isoCode}>{state.name}</option>)}
        </select>
      </label>}
      <label>Número de identificación<input name="identification" className={field} autoComplete="off" required minLength={3} maxLength={60} defaultValue={profile?.identification} /></label>
      <p className="text-sm text-slate-600">WF Cargo verifica el documento antes del despacho. Si cambias el nombre o el documento, la agencia deberá verificarlo de nuevo.</p>
    </fieldset>
  </>;
}

type Result = {
  locker: (Profile & { code: string; verified_at: string | null }) | null;
  packages: { id: string; tracking: string | null; prealert_id: string | null; branch: string | null; received_at: string; weight_lb: number; shipment_reference: string | null; guide: { status: string; service_price: number | null; public_tracking_enabled: boolean } | null }[];
  prealerts?: Purchase[];
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

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [acceptedRulesFor, setAcceptedRulesFor] = useState<string | null>(null);


  const emailRequest = useRef(false);
  const signupCredentials = useRef<{ email: string; password: string } | null>(null);
  const [confirmation, setConfirmation] = useState<{ email: string; accepted: boolean }>();
  const [resendAt, setResendAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!resendAt) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (!remaining) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  async function requestConfirmation(credentials: { email: string; password: string }) {
    if (emailRequest.current) return;
    emailRequest.current = true;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/public/lockers/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credentials, action: "signup" }),
      });
      const result = await res.json();
      if (!res.ok && !(res.status === 429 && Number.isInteger(result.retryAfter))) {
        throw new Error(result.error);
      }
      signupCredentials.current = credentials;
      setConfirmation(current => ({ email: credentials.email, accepted: res.ok
        || (current?.email === credentials.email && current.accepted) }));
      const seconds = res.ok ? 60 : result.retryAfter;
      setSecondsLeft(seconds);
      setResendAt(Date.now() + seconds * 1000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo solicitar el enlace.");
    } finally {
      emailRequest.current = false;
      setBusy(false);
    }
  }

  const [emailMode, setEmailMode] = useState<"login" | "signup" | "recovery">("login");
  const [mailLink, setMailLink] = useState<{ token_hash: string; type: "signup" | "recovery" }>();
  const [resetting, setResetting] = useState(false);

  async function redeemMailLink() {
    if (!mailLink) return;
    setBusy(true);
    setMessage("");
    if (mailLink.type === "recovery") setResetting(true);
    try {
      const { error } = await auth.verifyOtp({ token_hash: mailLink.token_hash, type: mailLink.type === "signup" ? "email" : "recovery" });
      if (error) throw error;
      window.history.replaceState(null, "", "/casillero");
      setMailLink(undefined);
    } catch {
      setResetting(false);
      setMessage("El enlace venció o ya fue usado. Solicita otro desde el casillero.");
    } finally { setBusy(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== form.get("confirmation")) {
      setMessage("Las contraseñas deben coincidir.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await auth.updateUser({ password });
      if (error) throw error;
      const logout = await auth.signOut({ scope: "others" });
      if (logout.error) console.warn("WF Cargo could not revoke other sessions.");
      setResetting(false);
      setMessage("Tu contraseña fue actualizada.");
    } catch {
      setMessage("No se pudo actualizar la contraseña. Revisa que sea válida y diferente de la anterior.");
    } finally { setBusy(false); }
  }

  useEffect(() => {
    const { data } = auth.onAuthStateChange((event, next) => {
      if (event === "INITIAL_SESSION") {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const token_hash = params.get("wf_token");
        const action = params.get("wf_action");
        if (token_hash && (action === "signup" || action === "recovery")) {
          setMailLink({ token_hash, type: action });
        }
      }
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const load = useCallback(async (current: Session) => {
    const data: Result = await api(current, "GET");
    if (data.locker) return data;
    const { linked } = await api(current, "PATCH");
    return linked ? api(current, "GET") as Promise<Result> : data;
  }, []);

  useEffect(() => {
    if (!session || resetting || mailLink) return;
    let current = true;
    void load(session).then(data => {
      if (!current) return;
      setAccount({ userId: session.user.id, result: data });
      if (data.locker) window.history.replaceState(null, "", "/casillero/mi-cuenta");
    }).catch(() => {
      if (current) setMessage("No pudimos cargar tu casillero. Recarga la página para reintentar.");
    });
    return () => { current = false; };
  }, [session, load, resetting, mailLink]);

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
    if (emailMode === "signup") {
      if (credentials.password !== form.get("confirmation")) {
        setMessage("Las contraseñas deben coincidir.");
        return;
      }
      await requestConfirmation(credentials);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (emailMode === "recovery") {
        const res = await fetch("/api/public/lockers/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...credentials, action: emailMode }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        setMessage("Si tu cuenta está activa, recibirás un enlace para cambiar tu contraseña.");
        return;
      }
      const { error } = await auth.signInWithPassword(credentials);
      if (error?.code === "email_not_confirmed") throw new Error("Confirma tu correo. Puedes solicitar otro enlace desde Crear cuenta.");
      if (error) throw new Error("Revisa tu correo y contraseña.");
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

  const [profileMessage, setProfileMessage] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setProfileMessage("");
    try {
      const updated: Pick<Result, "locker"> = await api(session, "PATCH", { ...fields, action: "profile" });
      setAccount(current => current?.userId === session.user.id
        ? { ...current, result: { ...current.result, locker: updated.locker } } : current);
      setProfileMessage("Perfil actualizado.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "No se pudo guardar tu perfil.");
    } finally { setBusy(false); }
  }

  const [prealertMessage, setPrealertMessage] = useState("");

  const [items, setItems] = useState([{ name: "", quantity: 1 }]);

  async function savePrealert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setBusy(true);
    setPrealertMessage("");
    try {
      await api(session, "POST", { ...fields, action: "prealert", items, tracking: String(fields.tracking).trim() || null, tracking_url: String(fields.tracking_url).trim() || null, declared_value: Number(fields.declared_value) });
      form.reset();
      setItems([{ name: "", quantity: 1 }]);
      setAccount({ userId: session.user.id, result: await load(session) });
      setPrealertMessage("Prealerta enviada a WF Cargo.");
    } catch (error) {
      setPrealertMessage(error instanceof Error ? error.message : "No se pudo guardar la prealerta.");
    } finally {
      setBusy(false);
    }
  }

  const locker = session && result?.locker;
  const address = locker ? [`${locker.customer_name} – ${locker.code}`, addressLines[0], locker.code, ...addressLines.slice(1)].join("\n") : "";
  const activity = result?.prealerts?.slice(0, 3) ?? [];

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
      {mailLink && <section className={panel}>
        <h1 className="mb-4 text-2xl font-bold">{mailLink.type === "signup" ? "Confirma tu cuenta" : "Recupera tu contraseña"}</h1>
        <button className={primary} disabled={busy} onClick={() => void redeemMailLink()}>Continuar</button>
        <Link href="/casillero" className="ml-4 underline" onClick={() => { setMailLink(undefined); setMessage(""); }}>Volver al casillero</Link>
      </section>}
      {resetting && !mailLink && <section className={panel}>
        <h1 className="mb-4 text-2xl font-bold">Elige una nueva contraseña</h1>
        <form onSubmit={changePassword} className="grid max-w-md gap-4">
          <label>Nueva contraseña<input name="password" className={field} type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
          <label>Confirma la contraseña<input name="confirmation" className={field} type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
          <button className={primary} disabled={busy}>Guardar contraseña</button>
        </form>
      </section>}
      {!mailLink && !resetting && (session === undefined || (session && !result)) && !message && <p role="status">Cargando casillero…</p>}
      {!mailLink && !resetting && session === null && <div className="grid items-start gap-5 md:grid-cols-2">
        <section className="grid min-h-64 content-center rounded-2xl bg-gradient-to-br from-slate-950 to-blue-800 p-7 text-white sm:p-10">
          <PackageCheck size={42} aria-hidden="true" />
          <h1 className="my-4 text-4xl font-bold tracking-tight">Tus compras tienen una dirección en EE. UU.</h1>
          <p>Compra en Amazon, Walmart, Shein y otras tiendas con tu dirección en Port St. Lucie. Prealerta tu rastreo y consulta la recepción y la entrega desde tu cuenta.</p>
          <p className="mt-3">Marítimo a Cuba · desde USD {shipping.perPound.toFixed(2)}/lb. Confirma las condiciones y los cargos para tu destino.</p>
          <a className="mt-4 underline" href={whatsapp("Hola, quisiera consultar la tarifa por libra para mi destino desde el casillero.")}>Consultar tarifas por destino</a>
        </section>
        <section className={panel}>
          <h2 className="mb-4 text-2xl font-bold">Abre o consulta tu casillero</h2>
          <button type="button" className={`${primary} w-full justify-center disabled:opacity-50`} disabled={busy} onClick={() => void continueWithGoogle()}>
            Continuar con Google
          </button>
          <p className="mb-4 mt-2 text-sm text-slate-600">Si ya tienes un casillero, elige la cuenta de Google con el mismo correo que usaste para abrirlo.</p>
          <div className="mb-4 flex flex-wrap gap-3">
            <button type="button" className={emailMode === "login" ? primary : secondary} onClick={() => { setEmailMode("login"); setMessage(""); }}>Iniciar sesión</button>
            <button type="button" className={emailMode === "signup" ? primary : secondary} onClick={() => { setEmailMode("signup"); setMessage(""); }}>Crear cuenta</button>
          </div>
          {emailMode === "signup" && confirmation ? <div className="grid gap-3">
            <h3 className="text-lg font-semibold">{confirmation.accepted ? "Cuenta creada. Confirma tu correo." : "Verificación pendiente"}</h3>
            <p className="text-sm">{confirmation.accepted ? "Abre el enlace más reciente enviado a " : "Podrás solicitar otro enlace para "}<strong className="break-all">{confirmation.email}</strong>{confirmation.accepted ? ". Revisa también la carpeta de correo no deseado." : " cuando termine la cuenta regresiva."}</p>
            <button type="button" className={secondary} disabled={busy || secondsLeft > 0}
              onClick={() => { if (signupCredentials.current) void requestConfirmation(signupCredentials.current); }}>
              {busy ? "Enviando…" : secondsLeft > 0 ? `Reenviar enlace en ${secondsLeft} s` : "Reenviar enlace de verificación"}
            </button>
            <button type="button" className="text-left underline" onClick={() => {
              signupCredentials.current = null;
              setConfirmation(undefined);
              setMessage("");
            }}>Usar otro correo</button>
          </div> : <form key={emailMode} onSubmit={access} className="grid gap-4">
            <label>Correo electrónico<input name="email" className={field} type="email" autoComplete="email" required /></label>
            {emailMode !== "recovery" && <label>Contraseña<input name="password" className={field} type="password"
              autoComplete={emailMode === "signup" ? "new-password" : "current-password"}
              minLength={emailMode === "signup" ? 8 : undefined} maxLength={emailMode === "signup" ? 72 : undefined} required /></label>}
            {emailMode === "signup" && <label>Confirma tu contraseña<input name="confirmation" className={field} type="password" autoComplete="new-password" required /></label>}
            <button className={secondary} disabled={busy}>{emailMode === "login" ? "Entrar" : emailMode === "signup" ? "Crear mi cuenta" : "Enviar enlace de recuperación"}</button>
            {emailMode === "login" && <button type="button" className="text-left underline" onClick={() => { setEmailMode("recovery"); setMessage(""); }}>¿Olvidaste tu contraseña?</button>}
          </form>}
        </section>
      </div>}
      {!mailLink && !resetting && session && result && !locker && <section className={`${panel} mx-auto w-full max-w-2xl`}>
        <h1 className="mb-2 text-3xl font-bold">Abre tu casillero</h1>
        <p className="mb-5 text-slate-600">Completa tus datos para recibir tu código WF.</p>
        <p className="mb-4 break-all">Correo de la cuenta · {session.user.email}</p>
        <form onSubmit={register} className="grid gap-4">
          <ProfileFields />
          <details className="space-y-2 text-sm text-slate-700">
            <summary className="font-semibold">Reglas del casillero</summary>
            <LockerRules />
            <Link className="underline" href="/condiciones">Ver condiciones del servicio</Link>
          </details>
          <label className="flex gap-2"><input type="checkbox" name="accepted" required checked={acceptedRulesFor === session.user.id}
            onChange={event => setAcceptedRulesFor(event.target.checked ? session.user.id : null)} /> Leí y acepto las reglas del casillero.</label>
          <button className={primary} disabled={busy || acceptedRulesFor !== session.user.id}>Abrir mi casillero</button>
        </form>
      </section>}
      {!mailLink && !resetting && locker && <>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-4xl font-bold tracking-tight">Mi casillero</h1><p className="mt-2 text-slate-600">Tu dirección de compras en Estados Unidos.</p></div>
          <LockerDialog label="Prealertar compra" title="Prealertar una compra">
          <form onSubmit={savePrealert} className="grid gap-3 sm:grid-cols-2">
            <label>Tienda<input className={field} name="merchant" required maxLength={120} /></label>
            <label>Número de rastreo (opcional)<input className={field} name="tracking" maxLength={120} /></label>
            <label className="sm:col-span-2">Enlace de rastreo de la tienda (opcional)<input className={field} type="url" name="tracking_url" maxLength={2048} /></label>
            <fieldset className="grid gap-2 sm:col-span-2"><legend>Artículos</legend>
              {items.map((item, index) => <div key={index} className="grid grid-cols-[5rem_1fr_auto] items-end gap-2">
                <label>Cantidad<input className={field} type="number" min="1" max="9999" required value={item.quantity || ""} onChange={event => setItems(rows => rows.map((row, i) => i === index ? { ...row, quantity: Number(event.target.value) } : row))} /></label>
                <label>Artículo<input className={field} required maxLength={120} value={item.name} onChange={event => setItems(rows => rows.map((row, i) => i === index ? { ...row, name: event.target.value } : row))} /></label>
                <button type="button" disabled={items.length === 1} onClick={() => setItems(rows => rows.filter((_, i) => i !== index))}>Quitar</button>
              </div>)}
              <button type="button" className={secondary} disabled={items.length >= 50} onClick={() => setItems(rows => [...rows, { name: "", quantity: 1 }])}>+ Añadir artículo</button>
            </fieldset>
            <label>Valor pagado (USD)<input className={field} name="declared_value" type="number" min="0" max="999999" step="0.01" required /></label>
            <button className={primary} disabled={busy}>Enviar prealerta</button>
          </form>
            <a className="mt-3 inline-block text-blue-800 underline" href={whatsapp(`Hola, adjunto la factura de una prealerta de ${locker.code}. Rastreo: `)} target="_blank" rel="noreferrer">Enviar factura por WhatsApp</a>
            <p className="mt-2 text-sm" role="status">{prealertMessage}</p>
          </LockerDialog>
        </div>
        <details className={panel} key={locker.code}>
          <summary className="cursor-pointer text-lg font-semibold">Mi perfil y dirección de entrega</summary>
          <p className="my-3 break-all text-sm text-slate-600">Correo de la cuenta · {locker.email}</p>
          <form onSubmit={saveProfile} className="grid max-w-2xl gap-4">
            <ProfileFields profile={locker} />
            <button className={primary} disabled={busy}>Guardar perfil</button>
            {profileMessage && <p role="status">{profileMessage}</p>}
          </form>
        </details>
        <div className="grid gap-4 md:grid-cols-[1.15fr_1fr]">
          <section className="rounded-2xl bg-[#102c55] p-5 text-white sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-sm text-blue-100">Tu código de casillero</h2><p className="font-mono text-3xl font-bold">{locker.code}</p></div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-950">{locker.verified_at ? "Titular verificado" : "Verificación pendiente"}</span>
            </div>
            <dl className="my-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 break-words text-sm">
              <dt>Nombre</dt><dd>{locker.customer_name} {locker.code}</dd>
              <dt>Dirección 1</dt><dd>{lockerWarehouse.street}</dd>
              <dt>Dirección 2</dt><dd className="font-semibold">{locker.code}</dd>
              <dt>Ciudad y ZIP</dt><dd>{lockerWarehouse.cityLine}</dd>
              <dt>Teléfono</dt><dd>{lockerWarehouse.phone}</dd>
            </dl>
            <button className={`${secondary} bg-white text-blue-950`} onClick={async () => {
              try { await navigator.clipboard.writeText(address); setMessage("Dirección copiada."); }
              catch { setMessage("Selecciona la dirección para copiarla."); }
            }}>Copiar dirección</button>
          </section>
          <section className={panel}>
            <h2 className="text-xl font-bold">Actividad reciente</h2>
            {!activity.length && !result?.packages.length && <p className="mt-3 text-slate-600">Todavía no tienes prealertas ni paquetes.</p>}
            <ul className="mt-4 grid gap-2">
              {activity.map(alert => <li key={alert.id} className="break-words rounded-lg bg-blue-50 p-3">
                <strong>{alert.merchant}</strong><p>{purchaseStatus(alert, result?.packages.filter(pkg => pkg.prealert_id === alert.id).length ?? 0)}</p>
              </li>)}
              {result?.packages.filter(pkg => !activity.some(alert => alert.tracking === pkg.tracking)).slice(0, 3).map(pkg => <li key={pkg.id} className="break-words rounded-lg bg-blue-50 p-3">
                <strong>{pkg.tracking}</strong><p>Recibido · {pkg.weight_lb} lb</p>
              </li>)}
            </ul>
          </section>
        </div>
        <section className={panel}>
          <h2 className="mb-3 text-xl font-bold">Mis compras</h2>
          {!result?.prealerts?.length && <p>Aún no tienes compras prealertadas.</p>}
          {result?.prealerts?.map(alert => {
            const boxes = result.packages.filter(pkg => pkg.prealert_id === alert.id);
            return <details key={alert.id} className="my-3 rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-semibold">{alert.merchant} · {purchaseStatus(alert, boxes.length)} · {purchaseDate(alert.created_at)}</summary>
              <div className="mt-3 grid gap-2">
                <p>{alert.contents}</p>
                <p>Compra #{alert.id.slice(0, 8).toUpperCase()} · USD {alert.declared_value}</p>
                {alert.tracking && <p>Rastreo de la tienda · {alert.tracking}</p>}
                {alert.tracking_url && <a className="underline" href={alert.tracking_url} target="_blank" rel="noreferrer">Rastrear compra hasta el almacén</a>}
                {boxes.map(pkg => <p key={pkg.id}>Recibido el {purchaseDate(pkg.received_at)} · {pkg.tracking || "Sin rastreo"} · {pkg.weight_lb} lb {pkg.branch && `· ${pkg.branch}`}</p>)}
                {alert.completed_at && <p>Recepción completa · {purchaseDate(alert.completed_at)}</p>}
                {alert.dispatched_at && <p>Despachada · {purchaseDate(alert.dispatched_at)}</p>}
                {alert.delivered_at && <p>Entregada · {purchaseDate(alert.delivered_at)}</p>}
                {alert.external_tracking && <p>Rastreo final · {alert.external_tracking}</p>}
                {alert.external_url && <a className="underline" href={alert.external_url} target="_blank" rel="noreferrer">Rastrear envío final</a>}
                {alert.invoice_url && <a className="underline" href={alert.invoice_url} target="_blank" rel="noreferrer">Ver factura de WF Cargo</a>}
              </div>
            </details>;
          })}
          <h2 className="mb-3 mt-5 text-xl font-bold">Paquetes sin compra asociada</h2>
          {result?.packages.some(pkg => !pkg.prealert_id) ? <ul className="divide-y divide-slate-200">
            {result.packages.filter(pkg => !pkg.prealert_id).map(pkg => <li key={pkg.id} className="break-words py-3">
              <strong>{pkg.tracking || "Paquete sin rastreo"}</strong> {pkg.branch && `· ${pkg.branch}`} · {pkg.weight_lb} lb · {new Date(pkg.received_at).toLocaleDateString("es-US", { timeZone: "America/New_York" })}
              <p>{pkg.guide?.status === "delivered" ? "Entregado" : ["in_transit", "out_for_delivery", "received_cuba"].includes(pkg.guide?.status ?? "") ? "En tránsito" : pkg.shipment_reference ? "Despachado" : "Recibido en almacén"}
              {pkg.shipment_reference && ` · Guía ${pkg.shipment_reference}`}</p>
              {pkg.guide?.public_tracking_enabled && pkg.shipment_reference && <Link className="underline" href={`/rastrear/${encodeURIComponent(pkg.shipment_reference)}`}>Rastrear envío de WF Cargo</Link>}
              {pkg.guide?.public_tracking_enabled && pkg.shipment_reference && <Link className="ml-3 underline" href={`/factura/${encodeURIComponent(pkg.shipment_reference)}`}>Ver factura de WF Cargo</Link>}
              {pkg.guide?.service_price != null && <p>Costo de la guía · {new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" }).format(pkg.guide.service_price)}</p>}
            </li>)}
          </ul> : <p>Aún no tienes paquetes registrados.</p>}
          <a className={`${primary} mt-4`} href={whatsapp(`Hola, quisiera ayuda con mi casillero ${locker.code}.`)} target="_blank" rel="noreferrer">Preguntar por WhatsApp</a>
        </section>
        <details className={panel}>
          <summary className="cursor-pointer font-semibold">Cómo usar tu casillero</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700">
            <li>Pon el código WF junto a tu nombre y también en Dirección 2.</li>
            <li>Guarda una prealerta después de comprar. Puedes hacerlo aunque todavía no tengas rastreo. Envía el comprobante de compra a WF Cargo por WhatsApp.</li>
            <li>Consulta cuándo llega tu paquete al almacén. Para coordinar el envío final y pedir la factura, contacta a WF Cargo por WhatsApp.</li>
          </ol>
        </details>
      </>}
      {message && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950">{message}</p>}
    </main>
  </div>;
}
