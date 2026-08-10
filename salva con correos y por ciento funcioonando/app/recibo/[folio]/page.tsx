"use client";

import { use, useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Hash,
  Loader2,
  Wallet,
  Banknote,
  CreditCard,
} from "lucide-react";

import PublicInvoiceButtons from "@/components/public/invoice/PublicInvoiceButtons";
import {
  getPublicPaymentReceipt,
  type PublicPaymentReceipt,
} from "@/lib/services/public-payment-receipt";

function currency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value?: string | number | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function methodLabel(method: string) {
  return method === "card" ? "Tarjeta" : "Efectivo";
}

export default function PublicReceiptPage({
  params,
}: {
  params: Promise<{ folio: string }>;
}) {
  const { folio } = use(params);

  const [payload, setPayload] = useState<PublicPaymentReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await getPublicPaymentReceipt(folio);

      if (error || !data?.receipt) {
        setPayload(null);
        setErrorMessage("El recibo no está disponible o el folio no es válido.");
      } else {
        setPayload(data);
      }

      setLoading(false);
    }

    void load();
  }, [folio]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="text-center font-semibold text-slate-500">
          <Loader2 className="mx-auto mb-3 animate-spin" />
          Preparando recibo...
        </div>
      </main>
    );
  }

  if (!payload?.receipt || errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-950">Recibo no disponible</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{errorMessage}</p>
        </div>
      </main>
    );
  }

  const { receipt, shipment, store_name } = payload;

  return (
    <>
      <style jsx global>{`
        @page {
          size: Letter;
          margin: 8mm;
        }

        @media print {
          html,
          body {
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }

          .invoice-no-print {
            display: none !important;
          }

          main {
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .invoice-document {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }

          .invoice-document,
          .invoice-document * {
            visibility: visible !important;
          }
        }
      `}</style>

      <main className="min-h-screen bg-slate-100 p-4 py-7 print:min-h-0 print:bg-white print:p-0">
        <div className="mx-auto max-w-[640px]">
          <div className="invoice-no-print mb-5 flex flex-col justify-between gap-4 rounded-3xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-700">
                Recibo de pago
              </p>
              <h1 className="mt-1 text-xl font-extrabold text-slate-950">{receipt.folio}</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Puede descargarlo como PDF o imprimirlo.
              </p>
            </div>

            <PublicInvoiceButtons />
          </div>

          <article className="invoice-document overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-xl">
            <header className="bg-slate-950 px-7 py-6 text-white">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-emerald-200">
                    Comprobante de pago
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{store_name}</h2>
                  <p className="mt-1 text-sm font-medium text-blue-100">
                    Este documento certifica que el pago fue recibido.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 px-5 py-4 text-right">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-200">
                    Folio
                  </p>
                  <p className="mt-1 text-xl font-extrabold">{receipt.folio}</p>
                </div>
              </div>
            </header>

            <div className="p-6 md:p-7">
              <div className="mb-5 flex items-center gap-3 rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-800">
                <BadgeCheck size={22} />
                <p className="text-sm font-extrabold">Pago confirmado — sin saldo pendiente por este monto.</p>
              </div>

              <section className="grid gap-4 sm:grid-cols-3">
                <Field icon={<Hash size={17} />} label="Envío" value={shipment?.tracking_code || "—"} />
                <Field
                  icon={<CalendarDays size={17} />}
                  label="Fecha y hora"
                  value={formatDateTime(receipt.created_at)}
                />
                <Field
                  icon={receipt.payment_method === "card" ? <CreditCard size={17} /> : <Banknote size={17} />}
                  label="Método de pago"
                  value={methodLabel(receipt.payment_method)}
                />
              </section>

              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                <div className="bg-slate-100 px-5 py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                    Monto recibido
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Wallet size={18} />
                    <span className="text-sm font-semibold">Total pagado</span>
                  </div>
                  <span className="text-2xl font-extrabold text-slate-950">{currency(receipt.amount)}</span>
                </div>
              </div>

              <footer className="mt-6 border-t border-slate-200 pt-4">
                <div className="flex flex-col justify-between gap-3 text-xs font-medium text-slate-500 sm:flex-row">
                  <div>
                    <p className="font-extrabold text-slate-950">Gracias por confiar en {store_name}.</p>
                    <p className="mt-1">Conserve este recibo junto con la factura de su envío.</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-extrabold text-slate-950">{receipt.folio}</p>
                    <p className="mt-1">www.aguilaexpressusa.com</p>
                  </div>
                </div>
              </footer>
            </div>
          </article>
        </div>
      </main>
    </>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-emerald-700">
        {icon}
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="mt-2 truncate text-sm font-extrabold text-slate-950">{value}</p>
    </div>
  );
}
