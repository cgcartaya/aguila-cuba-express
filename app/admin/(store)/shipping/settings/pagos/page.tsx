"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Loader2, WalletCards } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

export default function StripeConnectSettingsPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore]
  );

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; chargesEnabled: boolean; detailsSubmitted: boolean; warning?: string } | null>(null);
  const [error, setError] = useState("");

  // --- Modo de cobro (connect vs direct) ---
  const [mode, setMode] = useState<"connect" | "direct">("connect");
  const [directConfigured, setDirectConfigured] = useState(false);
  const [directSecretKey, setDirectSecretKey] = useState("");
  const [directWebhookSecret, setDirectWebhookSecret] = useState("");
  const [savingDirect, setSavingDirect] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [directMsg, setDirectMsg] = useState("");

  async function authHeader() {
    const { data } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${data.session?.access_token || ""}` };
  }

  async function loadStatus() {
    if (!activeStore?.id) return;
    setLoading(true);
    setError("");
    const headers = await authHeader();
    const response = await fetch(`/api/admin/shipping-settings/stripe-connect?store_id=${activeStore.id}`, { headers, cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error || "No se pudo consultar el estado.");
    else setStatus(body);
    setLoading(false);
  }

  async function loadDirectStatus() {
    if (!activeStore?.id) return;
    const headers = await authHeader();
    const response = await fetch(`/api/admin/shipping-settings/stripe-direct?store_id=${activeStore.id}`, { headers, cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setMode(body.mode === "direct" ? "direct" : "connect");
      setDirectConfigured(Boolean(body.directConfigured));
    }
  }

  useEffect(() => {
    if (!accessLoading && !storeLoading) {
      void loadStatus();
      void loadDirectStatus();
    }
  }, [accessLoading, storeLoading, activeStore?.id]);

  async function connect() {
    if (!activeStore?.id) return;
    setConnecting(true);
    setError("");
    const headers = await authHeader();
    const response = await fetch("/api/admin/shipping-settings/stripe-connect", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: activeStore.id }),
    });
    const body = await response.json().catch(() => ({}));
    setConnecting(false);
    if (!response.ok) return setError(body.error || "No se pudo iniciar la conexión con Stripe.");
    window.location.href = body.url;
  }

  async function disconnect() {
    if (!activeStore?.id) return;
    if (!window.confirm("Esto va a soltar la cuenta de Stripe guardada actualmente (por ejemplo, si era de prueba). No borra nada en Stripe, solo la referencia aquí. ¿Continuar?")) return;
    setDisconnecting(true);
    setError("");
    const headers = await authHeader();
    const response = await fetch("/api/admin/shipping-settings/stripe-connect", {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: activeStore.id }),
    });
    const body = await response.json().catch(() => ({}));
    setDisconnecting(false);
    if (!response.ok) return setError(body.error || "No se pudo desconectar.");
    void loadStatus();
  }

  async function saveDirectKeys() {
    if (!activeStore?.id) return;
    setSavingDirect(true);
    setDirectMsg("");
    const headers = await authHeader();
    const response = await fetch("/api/admin/shipping-settings/stripe-direct", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: activeStore.id,
        secretKey: directSecretKey,
        webhookSecret: directWebhookSecret,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSavingDirect(false);
    if (!response.ok) return setDirectMsg(body.error || "No se pudo guardar.");
    setDirectSecretKey("");
    setDirectWebhookSecret("");
    setDirectMsg("Guardado.");
    void loadDirectStatus();
  }

  async function switchMode(nextMode: "connect" | "direct") {
    if (!activeStore?.id) return;
    setSwitchingMode(true);
    setDirectMsg("");
    const headers = await authHeader();
    const response = await fetch("/api/admin/shipping-settings/stripe-direct", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: activeStore.id, mode: nextMode }),
    });
    const body = await response.json().catch(() => ({}));
    setSwitchingMode(false);
    if (!response.ok) return setDirectMsg(body.error || "No se pudo cambiar el modo.");
    setMode(nextMode);
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/admin/shipping" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
          <ArrowLeft size={16} />
          Volver
        </Link>

        <h1 className="mt-4 flex items-center gap-2 text-2xl font-black text-[#061b3a]">
          <WalletCards />
          Cobros en línea
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Conecta Stripe para que tus clientes puedan pagar su saldo desde el portal, sin efectivo ni transferencias manuales.
        </p>

        {/* --- Selector de modo --- */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black text-[#061b3a]">Cómo se cobran las tarjetas</p>
          <p className="mt-1 text-xs text-slate-500">
            Puedes tener las dos formas configuradas y cambiar entre ellas cuando quieras, sin perder la configuración de la otra.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void switchMode("connect")}
              disabled={switchingMode}
              className={`rounded-2xl border p-4 text-left transition ${
                mode === "connect" ? "border-[#635bff] bg-[#635bff]/5" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-sm font-black text-[#061b3a]">Cuenta conectada a la plataforma</p>
              <p className="mt-1 text-xs text-slate-500">La tienda opera como cuenta conectada de Stripe bajo la plataforma. Se cobra un 2% extra automático en cada pago con tarjeta.</p>
              {mode === "connect" && <p className="mt-2 text-xs font-black text-[#635bff]">Modo activo</p>}
            </button>

            <button
              type="button"
              onClick={() => void switchMode("direct")}
              disabled={switchingMode || !directConfigured}
              className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                mode === "direct" ? "border-[#635bff] bg-[#635bff]/5" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-sm font-black text-[#061b3a]">Cuenta propia de Stripe</p>
              <p className="mt-1 text-xs text-slate-500">La tienda usa su propia cuenta de Stripe, sin pasar por la plataforma. No se cobra nada extra en el pago.</p>
              {mode === "direct" && <p className="mt-2 text-xs font-black text-[#635bff]">Modo activo</p>}
              {!directConfigured && <p className="mt-2 text-xs font-bold text-amber-600">Configura las llaves abajo primero</p>}
            </button>
          </div>
        </div>

        {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>}

        {/* --- Panel modo "connect" --- */}
        {loading ? (
          <div className="mt-6 rounded-2xl border bg-white p-8 text-center text-slate-500">
            <Loader2 className="mx-auto mb-3 animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <p className="mb-4 text-sm font-black text-[#061b3a]">Cuenta conectada a la plataforma</p>
            {status?.chargesEnabled && !status?.warning ? (
              <div className="flex items-center gap-3 text-emerald-700">
                <CheckCircle2 size={22} />
                <div>
                  <p className="font-black">Cobros activos</p>
                  <p className="text-sm text-emerald-600">Tu tienda ya puede recibir pagos en línea por esta vía.</p>
                </div>
              </div>
            ) : status?.connected ? (
              <div className="flex items-center gap-3 text-amber-700">
                <CircleAlert size={22} />
                <div>
                  <p className="font-black">{status?.warning ? "No se pudo confirmar el estado" : "Falta terminar el registro en Stripe"}</p>
                  <p className="text-sm text-amber-600">
                    {status?.warning
                      ? "La cuenta guardada no responde con las llaves actuales — puede ser de otro modo (prueba/real). Desconecta y conecta de nuevo."
                      : "Empezaste la conexión pero Stripe todavía necesita más datos."}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Todavía no has conectado una cuenta de Stripe por esta vía.</p>
            )}

            <button
              type="button"
              onClick={() => void connect()}
              disabled={connecting}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#635bff] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {connecting ? <Loader2 className="animate-spin" size={16} /> : <WalletCards size={16} />}
              {status?.connected ? "Continuar configuración en Stripe" : "Conectar con Stripe"}
            </button>

            {status?.connected && (
              <button
                type="button"
                onClick={() => void disconnect()}
                disabled={disconnecting}
                className="mt-3 ml-3 inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-700 disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="animate-spin" size={16} /> : null}
                Desconectar
              </button>
            )}

            {status?.warning && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-700">
                No se pudo refrescar el estado en vivo: {status.warning}
              </p>
            )}
          </div>
        )}

        {/* --- Panel modo "direct" --- */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black text-[#061b3a]">Cuenta propia de Stripe</p>
          <p className="mt-1 text-xs text-slate-500">
            Pega aquí la secret key y el webhook signing secret de la cuenta de Stripe de la tienda (no la de la plataforma). Se guardan cifrados en el servidor y nunca se muestran de nuevo.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600">Secret key (empieza con sk_)</label>
              <input
                type="password"
                value={directSecretKey}
                onChange={(e) => setDirectSecretKey(e.target.value)}
                placeholder={directConfigured ? "•••••••••••••• (ya guardada — deja vacío para no cambiarla)" : "sk_live_..."}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#635bff]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Webhook signing secret (empieza con whsec_)</label>
              <input
                type="password"
                value={directWebhookSecret}
                onChange={(e) => setDirectWebhookSecret(e.target.value)}
                placeholder={directConfigured ? "•••••••••••••• (ya guardado — deja vacío para no cambiarlo)" : "whsec_..."}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#635bff]"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                En el dashboard de Stripe de la tienda: Desarrolladores → Webhooks → agregar endpoint apuntando a
                {" "}
                <span className="font-mono">/api/webhooks/stripe-direct/{activeStore?.id || "‹store_id›"}</span>, evento{" "}
                <span className="font-mono">checkout.session.completed</span>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void saveDirectKeys()}
              disabled={savingDirect || (!directSecretKey && !directWebhookSecret)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {savingDirect ? <Loader2 className="animate-spin" size={16} /> : null}
              Guardar
            </button>

            {directMsg && <p className="text-xs font-bold text-slate-600">{directMsg}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
