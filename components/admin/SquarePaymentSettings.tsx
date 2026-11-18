"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Connection = {
  environment: "sandbox" | "production";
  merchantId: string;
  merchantName: string | null;
  locationId: string | null;
  lastVerifiedAt: string;
  status: "connected" | "disconnecting";
};
type Provider = "stripe" | "clover" | "square";
type Review = { order_id: string; payment_id: string | null; amount_cents: number };
type Location = { id: string; name: string };
const endpoint = "/api/admin/payment-settings/square";
const buttonClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50";

async function squareSettingsRequest(storeId: string, operation?: object) {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`${endpoint}?store_id=${encodeURIComponent(storeId)}`, {
    method: operation ? "POST" : "GET",
    headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" },
    body: operation ? JSON.stringify({ ...operation, store_id: storeId }) : undefined,
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo consultar Square.");
  return result;
}

export default function SquarePaymentSettings({ storeId }: { storeId: string }) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [environment, setEnvironment] = useState<Connection["environment"]>("sandbox");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let current = true;
    const status = new URLSearchParams(window.location.search).get("square");
    void squareSettingsRequest(storeId).then((result) => {
      if (!current) return;
      setConnection(result.connection);
      setProvider(result.provider);
      setReviews(result.reviews);
      if (status === "cancelled") setMessage("Se canceló la autorización de Square.");
      if (status === "invalid" || status === "error") setMessage("No se pudo completar la autorización de Square.");
    }).catch(() => {
      if (current) setMessage("No se pudo consultar la conexión Square.");
    }).finally(() => {
      if (current) setBusy(false);
    });
    return () => { current = false; };
  }, [storeId]);

  async function run(action: "connect" | "verify" | "location" | "disconnect" | "provider", options?: { locationId?: string; provider?: string | null }) {
    setBusy(true);
    setMessage("");
    try {
      const result = await squareSettingsRequest(storeId, { action, environment, ...options });
      if (action === "connect") {
        window.location.assign(result.url);
        return;
      }
      if (result.locations || action === "disconnect") setLocations(result.locations ?? []);
      const updated = await squareSettingsRequest(storeId);
      setConnection(updated.connection);
      setProvider(updated.provider);
      setReviews(updated.reviews);
      if (action === "verify" && !result.locations?.length) setMessage("Square no tiene ubicaciones aptas para cobrar en USD.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la operación con Square.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <span aria-hidden="true" className="grid size-5 place-items-center rounded-[4px] bg-black">
          <span className="grid size-3 place-items-center rounded-[2px] bg-white"><span className="size-1.5 rounded-[1px] bg-black" /></span>
        </span>
        Square
      </h2>
      <p className="mb-4 text-sm text-slate-600">Autoriza la cuenta Square de esta tienda.</p>
      {connection ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">{connection.merchantName || connection.merchantId} · {connection.environment === "sandbox" ? "Sandbox" : "Production"}</p>
          <p className="text-sm text-slate-600">ID de comercio {connection.merchantId}</p>
          <p className="text-sm text-slate-600">{connection.locationId ? `Ubicación ${connection.locationId}` : "Ubicación pendiente de seleccionar"}</p>
          <p className="text-sm text-slate-600">Última verificación {new Date(connection.lastVerifiedAt).toLocaleString("es-US")}</p>
          {locations.length > 0 && (
            <label className="block text-sm">
              Ubicación Square{" "}
              <select className={buttonClass} value={connection.locationId ?? ""} disabled={busy} onChange={(event) => void run("location", { locationId: event.target.value })}>
                <option value="" disabled>Selecciona una ubicación</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass} disabled={busy} onClick={() => void run("verify")}>Verificar conexión</button>
            <button type="button" className={buttonClass} disabled={busy} onClick={() => {
              if (window.confirm("¿Quieres revocar el acceso de PerlaMarketplace a esta cuenta Square?")) void run("disconnect");
            }}>Desconectar</button>
          </div>
          {connection.status === "disconnecting" && <p className="text-sm text-slate-600">Desconexión pendiente de confirmación.</p>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">
            Entorno{" "}
            <select className={buttonClass} value={environment} disabled={busy} onChange={(event) => setEnvironment(event.target.value === "production" ? "production" : "sandbox")}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </label>
          <button type="button" className={buttonClass} disabled={busy} onClick={() => void run("connect")}>Conectar mi cuenta Square</button>
        </div>
      )}
      <label className="mt-4 block text-sm">
        Pasarela activa para nuevos pedidos{" "}
        <select className={buttonClass} value={provider ?? ""} disabled={busy} onChange={(event) => void run("provider", { provider: event.target.value || null })}>
          <option value="">Configuración actual de la tienda</option>
          <option value="stripe">Stripe</option>
          <option value="clover">Clover</option>
          <option value="square" disabled={!connection?.locationId || connection.status !== "connected"}>Square</option>
        </select>
      </label>
      {reviews.length > 0 && (
        <div className="mt-4 text-sm">
          <h3 className="font-semibold">Pagos Square por conciliar</h3>
          <ul className="mt-2 space-y-1">
            {reviews.map((review) => <li key={review.order_id}>Pedido {review.order_id} · USD {(review.amount_cents / 100).toFixed(2)} · {review.payment_id ?? "Sin ID de pago"}</li>)}
          </ul>
        </div>
      )}
      {message && <p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}
    </section>
  );
}
