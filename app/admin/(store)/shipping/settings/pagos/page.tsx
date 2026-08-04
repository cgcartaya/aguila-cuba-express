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
  const [status, setStatus] = useState<{ connected: boolean; chargesEnabled: boolean; detailsSubmitted: boolean; raw?: unknown; warning?: string } | null>(null);
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (!accessLoading && !storeLoading) void loadStatus();
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
          Conecta tu cuenta de Stripe para que tus clientes puedan pagar su saldo desde el portal, sin efectivo ni transferencias manuales.
        </p>

        {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>}

        {loading ? (
          <div className="mt-6 rounded-2xl border bg-white p-8 text-center text-slate-500">
            <Loader2 className="mx-auto mb-3 animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            {status?.chargesEnabled ? (
              <div className="flex items-center gap-3 text-emerald-700">
                <CheckCircle2 size={22} />
                <div>
                  <p className="font-black">Cobros activos</p>
                  <p className="text-sm text-emerald-600">Tu tienda ya puede recibir pagos en línea.</p>
                </div>
              </div>
            ) : status?.connected ? (
              <div className="flex items-center gap-3 text-amber-700">
                <CircleAlert size={22} />
                <div>
                  <p className="font-black">Falta terminar el registro en Stripe</p>
                  <p className="text-sm text-amber-600">Empezaste la conexión pero Stripe todavía necesita más datos.</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Todavía no has conectado una cuenta de Stripe.</p>
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

            {status?.warning && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-700">
                No se pudo refrescar el estado en vivo: {status.warning}
              </p>
            )}

            {status?.raw != null && (
              <details className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <summary className="cursor-pointer font-bold text-slate-500">
                  Info técnica (temporal, para depurar)
                </summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all text-slate-600">
                  {JSON.stringify(status.raw, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
