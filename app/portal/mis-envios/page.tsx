"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileText, Loader2, Package, Search, CreditCard } from "lucide-react";

type ShipmentRow = {
  id: string;
  tracking_code: string | null;
  status: string;
  created_at: string;
  delivered_date: string | null;
  location: string | null;
  recipient_name: string | null;
  service_price: number;
  amount_paid: number;
  balance_due: number;
  payment_status: "pending" | "partial" | "paid";
};

const STATUS_LABELS: Record<string, string> = {
  received_miami: "Recibido en Miami",
  preparing: "Preparando",
  in_transit: "En tránsito",
  received_cuba: "Recibido en Cuba",
  out_for_delivery: "En reparto",
  delivered: "Entregado",
  issue: "Incidencia",
};

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function MisEnviosPage() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";

  const [phone, setPhone] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customer, setCustomer] = useState<{ name: string; customerCode: string } | null>(null);
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function payBalance(shipmentId: string) {
    setPayingId(shipmentId);
    setError("");
    try {
      const response = await fetch("/api/public/customer-portal/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "No se pudo iniciar el pago.");
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("No se pudo conectar con el pago. Intenta de nuevo.");
    } finally {
      setPayingId(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setCustomer(null);
    setShipments([]);

    try {
      const response = await fetch("/api/public/customer-portal/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, customerCode, slug }),
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body.error || "No se pudo consultar tu historial.");
        return;
      }

      setCustomer(body.customer);
      setShipments(body.shipments || []);
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black text-slate-950">Mis envíos</h1>
        <p className="mt-2 text-slate-600">
          Ingresa tu teléfono y tu código de cliente para ver tu historial y tus facturas.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400"
            required
          />
          <input
            value={customerCode}
            onChange={(e) => setCustomerCode(e.target.value)}
            placeholder="Código de cliente (ej. AG-0013)"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Buscar
          </button>
        </form>

        {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

        {customer && (
          <div className="mt-8">
            <p className="text-sm font-bold text-slate-500">
              {customer.customerCode} · {customer.name}
            </p>

            {shipments.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                <Package className="mx-auto mb-3 text-slate-300" size={36} />
                Todavía no tienes envíos registrados.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {shipments.map((shipment) => (
                  <div key={shipment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div>
                      <p className="font-black text-slate-900">{shipment.tracking_code || "Sin código"}</p>
                      <p className="text-sm text-slate-500">
                        {STATUS_LABELS[shipment.status] || shipment.status} · {shipment.location || "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(shipment.created_at).toLocaleDateString("es-ES")}
                        {shipment.recipient_name ? ` · Para: ${shipment.recipient_name}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-black text-slate-900">{money(shipment.service_price)}</p>
                        <p
                          className={`text-xs font-bold ${
                            shipment.payment_status === "paid"
                              ? "text-emerald-600"
                              : shipment.payment_status === "partial"
                                ? "text-amber-600"
                                : "text-rose-600"
                          }`}
                        >
                          {shipment.payment_status === "paid"
                            ? "Pagado"
                            : `Saldo: ${money(shipment.balance_due)}`}
                        </p>
                      </div>

                      {shipment.tracking_code && (
                        <Link
                          href={`/factura/${shipment.tracking_code}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <FileText size={14} />
                          Factura
                        </Link>
                      )}

                      {shipment.payment_status !== "paid" && shipment.balance_due > 0 && (
                        <button
                          type="button"
                          onClick={() => void payBalance(shipment.id)}
                          disabled={payingId === shipment.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#635bff] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {payingId === shipment.id ? <Loader2 className="animate-spin" size={14} /> : <CreditCard size={14} />}
                          Pagar saldo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
