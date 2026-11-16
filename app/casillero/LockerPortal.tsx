"use client";

import LockerRules from "@/components/landing/wfcargo/LockerRules";
import LockerDialog from "@/components/lockers/LockerDialog";
import { purchaseDate, purchaseStatus, type Purchase } from "@/lib/lockers/purchase";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { Country, State } from "country-state-city";
import { ArrowLeft, BookOpen, CheckCircle2, CircleHelp, Copy, Home, Layers, MapPin, Package, PackageCheck, ShieldCheck, ShoppingCart, Truck, UserRound } from "lucide-react";
import { lockerWarehouse, shipping, whatsapp } from "@/components/landing/wfcargo/content";

const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { storageKey: "perla-wfcargo-locker", detectSessionInUrl: true },
}).auth;
function LockerParcelArt({ variant }: { variant: "access" | "dashboard" }) {
  const access = variant === "access";
  return (
    <svg viewBox="0 0 240 215" aria-hidden="true" focusable="false" className="block h-auto w-full">
      {access && <path fill="#1464b7" opacity=".58" d="m21 31 15 7 3-9 48 8 39 1 34 9 18-6 14 4 15-7 7-13 9-2 6 10-10 12-4 18-19 10-10 18 2 17 8 14-5 4-15-14-9-16-17 2-8 9-13-4-14 3-4 13-12-4-11-16-21-7-13-14-20-5-9-16z" />}
      <ellipse cx="120" cy="192" rx="108" ry="17" fill="#001a42" opacity=".48" />
      <path d="m130 140 49-17 37 11v50l-37 14-49-12z" fill="#1558b5" />
      <path d="m130 140 49 12 37-18-37-11z" fill="#72aaff" />
      <path d="M179 152v46l37-14v-50z" fill="#09438e" />
      <path d="m27 136 57-19 74 12v58l-56 17-75-17z" fill="#d99143" />
      <path d="m27 136 75 14 56-21-74-12z" fill="#ffcf86" />
      <path d="M102 150v54l56-17v-58z" fill="#b97532" />
      <path d="m54 127 13-4 73 13-14 5z" fill="#ffdfa6" />
      <path d="m126 141 14-5v19l-14 5z" fill="#e8ab63" />
      <path d="m78 79 53-15 65 13v55l-51 16-67-14z" fill="#ecac5d" />
      <path d="m78 79 67 13 51-15-65-13z" fill="#ffda99" />
      <path d="M145 92v56l51-16V77z" fill="#c3813d" />
      <path d="m105 71 13-4 66 13-13 4z" fill="#fff0c8" />
      <path d="m171 84 13-4v18l-13 4z" fill="#eebb78" />
      <path d="m89 92 28 5v14l-28-5z" fill="#fff3da" />
      <path d="m93 97 19 4m-19 0 12 3" stroke="#89755c" strokeWidth="1.4" />
      <path d="m38 151 28 6v16l-28-6z" fill="#fff3da" />
      <path d="m42 156 19 4m-19 0 12 3" stroke="#89755c" strokeWidth="1.4" />
      {access ? <>
        <path d="M153 18a26 26 0 0 1 26 26c0 17-26 45-26 45s-26-28-26-45a26 26 0 0 1 26-26Z" fill="#ed4642" />
        <circle cx="153" cy="44" r="11" fill="#fff6eb" />
        <path d="M27 177c16 24 124 24 181-21 13-10 18-19 11-25" fill="none" stroke="#ffce06" strokeWidth="7" strokeLinecap="round" />
      </> : <>
        <path d="m161 72 18 23 17-23" fill="#ffce06" />
        <circle cx="179" cy="51" r="29" fill="#fff" />
        <path d="M158 40h42m-45 10h48m-47 10h46m-41 10h36" stroke="#e83949" strokeWidth="5" />
        <path d="M158 37a25 25 0 0 1 20-10v24h-23a24 24 0 0 1 3-14Z" fill="#154d9e" />
        <path d="M161 38h2m5-4h2m2 8h2m-14 4h2m5 0h2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </>}
    </svg>
  );
}

const panel = "min-w-0 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6";
const field = "block w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-base";
const primary = "inline-flex rounded-lg bg-gradient-to-b from-blue-700 to-blue-900 px-4 py-2.5 font-semibold text-white disabled:opacity-50";
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
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>();
  const purchases = result?.prealerts ?? [];
  const selectedPurchase = purchases.find(purchase => purchase.id === selectedPurchaseId) ?? purchases[0];
  const activeStep = selectedPurchase?.delivered_at ? 3 : selectedPurchase?.dispatched_at ? 2 :
    selectedPurchase?.completed_at || (selectedPurchase && result?.packages.some(pkg => pkg.prealert_id === selectedPurchase.id)) ? 1 : 0;
  const showDashboard = Boolean(locker && !mailLink && !resetting);
  const supportUrl = whatsapp(locker
    ? `Hola, quisiera ayuda con mi casillero ${locker.code}.`
    : "Hola, quisiera información sobre el casillero virtual.");

  return <div className="min-h-screen bg-[#edf4fe] text-[#092457]">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7">
        <Link href="/" className="flex items-center gap-3 font-bold"><Image src="/wfcargo/logo.webp" alt="WF Cargo" width={56} height={56} className="rounded-full object-contain" /><span>WF Cargo Envíos<span className="block text-xs font-medium sm:text-sm">Envíos · Casillero Virtual · Trámites</span></span></Link>
        {showDashboard && <span className="flex max-w-full items-center gap-2 break-all text-sm font-semibold"><UserRound size={19} />{locker?.customer_name}</span>}
        {session ? <button className={secondary} onClick={async () => {
          const { error } = await auth.signOut({ scope: "local" });
          if (error) { setMessage("No se pudo cerrar la sesión. Intenta nuevamente."); return; }
          setAccount(undefined); setMessage(""); window.history.replaceState(null, "", "/casillero");
        }}>Cerrar sesión</button> : <Link href="/" className="inline-flex items-center gap-2 font-semibold text-blue-800"><ArrowLeft size={18} />Volver a WF Cargo</Link>}
      </div>
    </header>
    <div className={showDashboard ? "mx-auto max-w-[100rem] lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)]" : ""}>
    {showDashboard && <nav aria-label="Navegación del casillero" className="bg-[#061f50] p-4 text-white lg:pt-8">
      <div className="flex flex-wrap gap-2 lg:sticky lg:top-5 lg:grid">
        {[
          { href: "#mi-casillero", label: "Mi casillero", Icon: Home },
          { href: "#mis-paquetes", label: "Mis paquetes", Icon: Package },
          { href: "#prealertar", label: "Prealertar compra", Icon: ShoppingCart },
          { href: "#mi-perfil", label: "Mi perfil", Icon: UserRound },
          { href: "#como-funciona", label: "Cómo funciona", Icon: BookOpen },
          { href: supportUrl, label: "Ayuda / Soporte", Icon: CircleHelp },
        ].map(({ href, label, Icon }, index) => <a key={href} href={href}
          onClick={href === "#mi-perfil" ? () => {
            const profile = document.querySelector<HTMLDetailsElement>("#mi-perfil");
            if (profile) profile.open = true;
          } : undefined}
          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${index === 0 ? "bg-[#ffce06] text-[#061f50]" : "hover:bg-white/15"}`}>
          <Icon size={19} aria-hidden="true" />{label}
        </a>)}
      </div>
    </nav>}
    <main id="mi-casillero" className={`mx-auto grid w-full min-w-0 gap-5 px-4 py-6 sm:px-7 ${showDashboard ? "" : "max-w-[94rem] sm:py-8"}`}>
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
      {!mailLink && !resetting && session === null && <div className="grid items-start gap-5 md:grid-cols-[1.1fr_1fr]">
        <section className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#061e4b] to-[#063e89] p-6 text-white sm:p-9">
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,32%)]">
          <div>
          <div className="flex flex-wrap items-center gap-3 text-2xl font-bold"><PackageCheck size={36} aria-hidden="true" /> Casillero <span className="rounded-lg bg-[#ffce06] px-2 text-blue-950">Virtual</span></div>
          <p className="mt-7 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Compra en tus tiendas favoritas <span className="text-[#ffce06]">y envía a tu destino.</span></p>
          <p className="mt-4 max-w-lg text-blue-50">Obtén una dirección en EE. UU. con tu código personal y recibe tus compras de Amazon, Walmart, Shein, eBay y más.</p>
          </div>
          <div className="mx-auto w-full max-w-44 sm:max-w-none"><LockerParcelArt variant="access" /></div>
          </div>
          <h2 className="mt-8 text-2xl font-bold">¿Cómo funciona?</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { Icon: UserRound, title: "Crea tu cuenta", description: "Regístrate y obtén tu código de casillero." },
              { Icon: ShoppingCart, title: "Compra en línea", description: "Usa tu dirección en EE. UU. y tu código." },
              { Icon: Package, title: "Recibe y envía", description: "Prealerta tu compra para que podamos identificarla y enviarla." },
            ].map(({ Icon, title, description }, index) => <li key={title}>
              <div className="mb-2 flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-[#ffce06] font-bold text-blue-950">{index + 1}</span><Icon size={25} aria-hidden="true" /></div>
              <strong>{title}</strong><p className="mt-1 text-sm text-blue-100">{description}</p>
            </li>)}
          </ol>
          <details className="mt-6 rounded-xl bg-white/10 p-3 text-sm">
            <summary className="cursor-pointer font-semibold">Conoce las reglas del casillero</summary>
            <div className="mt-3 rounded-lg bg-white p-3 text-blue-950"><LockerRules /><Link className="mt-2 inline-block underline" href="/condiciones">Ver condiciones del servicio</Link></div>
          </details>
          <a className="mt-4 inline-block text-sm text-blue-100 underline" href={whatsapp("Hola, quisiera consultar la tarifa por libra para mi destino desde el casillero.")}>Consultar tarifas desde USD {shipping.perPound.sea.toFixed(2)}/lb por marítimo a Cuba</a>
        </section>
        <section className={panel}>
          <h1 className="flex items-center gap-3 text-2xl font-bold sm:text-3xl"><Package className="shrink-0 text-blue-800" aria-hidden="true" />Accede a tu Casillero Virtual</h1>
          <p className="mb-5 mt-2 text-slate-600">Consulta tus paquetes, envíos y el estado de tus prealertas.</p>
          <button type="button" className={`${primary} w-full justify-center disabled:opacity-50`} disabled={busy} onClick={() => void continueWithGoogle()}>
            Continuar con Google
          </button>
          <p className="mb-4 mt-2 text-sm text-slate-600">Si ya tienes un casillero, elige la cuenta de Google con el mismo correo que usaste para abrirlo.</p>
          <p className="my-4 flex items-center gap-3 text-center text-sm before:h-px before:flex-1 before:bg-blue-200 after:h-px after:flex-1 after:bg-blue-200">o accede con tu cuenta</p>
          <div className="mb-4 grid grid-cols-2 gap-2 [&>button]:justify-center">
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
            <button className={`${primary} w-full justify-center`} disabled={busy}>{emailMode === "login" ? "Entrar a mi casillero" : emailMode === "signup" ? "Crear mi cuenta" : "Enviar enlace de recuperación"}</button>
            {emailMode === "login" && <button type="button" className="text-left underline" onClick={() => { setEmailMode("recovery"); setMessage(""); }}>¿Olvidaste tu contraseña?</button>}
          </form>}
        </section>
        <section aria-label="Beneficios del casillero" className={`${panel} grid gap-5 sm:grid-cols-2 md:col-span-2 xl:grid-cols-4`}>
          {[
            { Icon: Truck, title: "Dirección en EE. UU.", copy: "Recibe compras con tu código único." },
            { Icon: Layers, title: "Consolida y ahorra", copy: "Agrupa tus paquetes antes del envío." },
            { Icon: ShieldCheck, title: "Seguimiento de paquetes", copy: "Consulta el estado en tu cuenta." },
            { Icon: CircleHelp, title: "Atención personalizada", copy: "Contáctanos por WhatsApp." },
          ].map(({ Icon, title, copy }) => <div key={title} className="flex gap-3">
            <Icon size={27} className="shrink-0 text-blue-800" aria-hidden="true" />
            <div><strong>{title}</strong><p className="text-sm text-slate-600">{copy}</p>
              {Icon === CircleHelp && <a href={supportUrl} className="text-sm font-semibold text-blue-800 underline">Abrir WhatsApp</a>}
            </div>
          </div>)}
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
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight"><Package aria-hidden="true" />Mi Casillero</h1>
          <p className="mt-1 text-slate-600">Gestiona tus compras, prealertas y envíos desde un solo lugar.</p>
        </div>
        <div className="grid items-stretch gap-4 xl:grid-cols-[1.65fr_1fr]">
          <section className="grid items-center gap-4 rounded-2xl bg-gradient-to-r from-[#061e4b] to-[#064399] p-5 text-white sm:grid-cols-[minmax(0,1fr)_minmax(7rem,32%)] sm:p-7">
            <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="flex items-center gap-2 text-sm text-blue-100"><MapPin size={16} aria-hidden="true" />Tu código de casillero</h2><p className="text-4xl font-extrabold text-[#ffce06]">{locker.code}</p></div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${locker.verified_at ? "bg-green-700 text-white" : "bg-white/15 text-white"}`}>{locker.verified_at ? "Titular verificado" : "Verificación pendiente"}</span>
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
            }}><Copy size={17} className="mr-2 self-center" aria-hidden="true" />Copiar dirección</button>
            </div>
            <div className="mx-auto w-full max-w-40 sm:max-w-none"><LockerParcelArt variant="dashboard" /></div>
          </section>
          <section id="prealertar" className="grid content-center gap-3 rounded-2xl bg-gradient-to-br from-[#ffdb26] to-[#ffbf00] p-5 sm:p-7 [&>button]:justify-self-start">
            <h2 className="flex items-center gap-2 text-2xl font-bold"><PackageCheck aria-hidden="true" />Prealertar compra</h2>
            <p>Registra tus compras para que podamos identificarlas cuando lleguen al almacén.</p>
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
          </section>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { Icon: Package, count: result?.packages.length ?? 0, label: "Total de paquetes", color: "bg-blue-100 text-blue-900" },
            { Icon: MapPin, count: result?.packages.filter(pkg => !pkg.shipment_reference && !purchases.some(purchase => purchase.id === pkg.prealert_id && (purchase.dispatched_at || purchase.delivered_at))).length ?? 0, label: "En almacén", color: "bg-amber-100 text-amber-950" },
            { Icon: Truck, count: purchases.filter(purchase => purchase.dispatched_at && !purchase.delivered_at).length, label: "Compras en tránsito", color: "bg-blue-100 text-blue-900" },
            { Icon: CheckCircle2, count: purchases.filter(purchase => purchase.delivered_at).length, label: "Compras entregadas", color: "bg-green-100 text-green-950" },
          ].map(({ Icon, count, label, color }) => <div key={label} className={`flex items-center gap-3 rounded-2xl p-3 sm:p-4 ${color}`}>
            <Icon className="shrink-0" aria-hidden="true" /><div><strong className="block text-2xl">{count}</strong><span className="text-sm font-semibold">{label}</span></div>
          </div>)}
        </div>
        <div className="grid items-start gap-4 xl:grid-cols-[1.65fr_1fr]">
        <section id="mis-paquetes" className={panel}>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Package aria-hidden="true" />Mis paquetes</h2>
          {!result?.prealerts?.length && <p>Aún no tienes compras prealertadas.</p>}
          {result?.prealerts?.map(alert => {
            const boxes = result.packages.filter(pkg => pkg.prealert_id === alert.id);
            return <details key={alert.id} onToggle={event => { if (event.currentTarget.open) setSelectedPurchaseId(alert.id); }} className="my-2 rounded-xl border border-blue-100 p-3">
              <summary className="cursor-pointer font-semibold">
                <span className="mt-1 inline-grid w-[calc(100%-1.2rem)] gap-2 align-top sm:grid-cols-[1fr_auto_1fr_auto]">
                  <span className="break-all">{alert.merchant}</span><span className="text-sm">{purchaseDate(alert.created_at)}</span>
                  <span className="break-all text-sm text-blue-800">{alert.external_tracking || alert.tracking || "Sin rastreo"}</span>
                  <span className="w-fit rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-950">{purchaseStatus(alert, boxes.length)}</span>
                </span>
              </summary>
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
        </section>
          <section className={panel}>
            <h2 className="flex items-center gap-2 text-xl font-bold"><Truck aria-hidden="true" />Estado del envío</h2>
            {selectedPurchase ? <>
              <p className="mt-2 break-words text-sm font-semibold">{selectedPurchase.merchant} · {purchaseDate(selectedPurchase.created_at)}</p>
              <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["Prealerta enviada", "En almacén", "En tránsito", "Entregada"].map((label, index) => <li key={label}
                  aria-current={activeStep === index ? "step" : undefined}
                  className={`grid justify-items-center gap-1 rounded-lg p-2 text-center text-xs font-semibold ${activeStep === index ? "bg-blue-800 text-white" : activeStep > index ? "bg-green-100 text-green-900" : "bg-slate-100 text-slate-600"}`}>
                  <span className="text-base">{index + 1}</span>{label}
                </li>)}
              </ol>
              <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm">{purchaseStatus(selectedPurchase, result?.packages.filter(pkg => pkg.prealert_id === selectedPurchase.id).length ?? 0)}</p>
            </> : <p className="mt-3 text-sm text-slate-600">El seguimiento de tus compras aparecerá cuando envíes una prealerta.</p>}
          </section>
        </div>
        <div className="grid items-stretch gap-4 xl:grid-cols-[1.65fr_1fr]">
          <section id="como-funciona" className={panel}>
            <h2 className="flex items-center gap-2 text-xl font-bold"><CircleHelp aria-hidden="true" />¿Cómo funciona?</h2>
            <ol className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {[
                ["Compra en línea", "Elige tus productos en tus tiendas favoritas."],
                ["Usa tu código", "Ponlo junto a tu nombre y en Dirección 2."],
                ["Prealerta tu compra", "Registra los artículos y añade el rastreo cuando lo tengas."],
                ["Recibe tu envío", "Consulta el estado y coordina el envío final con WF Cargo."],
              ].map(([title, description], index) => <li key={title} className="text-sm">
                <span className="mb-2 grid size-7 place-items-center rounded-full bg-[#ffce06] font-bold">{index + 1}</span>
                <strong>{title}</strong><p className="mt-1 text-slate-600">{description}</p>
              </li>)}
            </ol>
          </section>
          <section className={panel}>
            <h2 className="flex items-center gap-2 text-xl font-bold"><CircleHelp className="text-green-700" aria-hidden="true" />¿Necesitas ayuda?</h2>
            <p className="mt-2 text-sm text-slate-600">Escríbenos si necesitas ayuda con tu casillero o un envío.</p>
            <a className="mt-4 inline-flex rounded-lg bg-green-700 px-4 py-2.5 font-semibold text-white" href={supportUrl} target="_blank" rel="noreferrer">Chatear por WhatsApp</a>
          </section>
        </div>
        <details id="mi-perfil" className={panel} key={locker.code}>
          <summary className="cursor-pointer text-lg font-semibold">Mi perfil y dirección de entrega</summary>
          <p className="my-3 break-all text-sm text-slate-600">Correo de la cuenta · {locker.email}</p>
          <form onSubmit={saveProfile} className="grid max-w-2xl gap-4">
            <ProfileFields profile={locker} />
            <button className={primary} disabled={busy}>Guardar perfil</button>
            {profileMessage && <p role="status">{profileMessage}</p>}
          </form>
        </details>
      </>}
      {message && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950">{message}</p>}
    </main>
    </div>
  </div>;
}
