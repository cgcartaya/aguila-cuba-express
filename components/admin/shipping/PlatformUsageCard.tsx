import { FileText, ShieldCheck } from "lucide-react";
import type { ShippingPlatformBilling } from "@/lib/shipping/platform-billing";

const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
export default function PlatformUsageCard({ billing }: { billing: ShippingPlatformBilling }) {
  return <section aria-label="Comisión del módulo de envíos" className="mt-6 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><FileText size={20} /></span><div><h2 className="font-extrabold text-slate-900">Comisión del módulo de envíos</h2><p className="mt-1 text-xs leading-5 text-slate-500">Cargo de la agencia por cada operación registrada. No se suma a la factura del cliente.</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${billing.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{billing.enabled ? `${usd(billing.fee_per_operation)} por operación` : "Comisión desactivada"}</span></div>
    <div className="grid gap-4 p-5 sm:grid-cols-3">{[
      { label: "Generado hoy", amount: billing.today_amount, count: billing.today_count },
      { label: "Generado este mes", amount: billing.month_amount, count: billing.month_count },
      { label: "Acumulado histórico", amount: billing.total_amount, count: billing.total_count },
    ].map(item => <div key={item.label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-extrabold text-[#122b4a]">{usd(item.amount)}</p><p className="mt-1 text-xs text-slate-400">{item.count} operaciones con comisión · USD</p></div>)}</div>
    <p className="flex items-start gap-2 px-5 pb-5 text-xs leading-5 text-slate-500"><ShieldCheck size={15} className="mt-0.5 shrink-0" />Una sola comisión por envío o remesa; una operación mixta cuenta una vez. Reimprimir y editar no genera cargos. El historial conserva la tarifa aplicada, incluso si la operación se elimina. Importes generados, no pagos liquidados.</p>
  </section>;
}
