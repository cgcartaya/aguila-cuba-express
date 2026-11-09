import type { RemittanceEarnings } from "@/lib/shipping/remittance-earnings";

const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default function RemittanceEarningsCard({ earnings: e }: { earnings: RemittanceEarnings }) {
  const metrics = [
    ["Facturado total", e.billed, "Todas las operaciones vigentes"],
    ["Cobrado total", e.paid, "Pagos y recibos registrados"],
    ["Principal de remesas", e.principal, "Dinero destinado a los beneficiarios"],
    ["Comisión de la agencia", e.earned, e.count + " remesas · después de rebajas"],
    ["Comisión de facturas pagadas", e.collected, "Remesas con la factura completamente pagada"],
    ["Plataforma de esas remesas", e.platform, "Cargos históricos registrados"],
  ] as const;

  return <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
    <h2 className="text-xl font-black">Ingresos de la agencia · Remesas</h2>
    <p className="mt-1 text-sm text-slate-500">Acumulado histórico en USD. Excluye cancelados y papelera.</p>
    <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map(([label, amount, detail]) => <div key={label} className="rounded-xl bg-slate-50 p-4">
        <dt className="text-sm font-semibold">{label}</dt>
        <dd className="mt-2 text-2xl font-black tabular-nums">{usd(amount)}</dd>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>)}
    </dl>
    <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-950">
      <h3 className="text-sm font-bold">Ingreso de remesas menos plataforma</h3>
      <p className="mt-1 text-3xl font-black">{usd(e.afterPlatform)}</p>
      <p className="mt-2 text-xs">Comisión de la agencia menos el cargo de plataforma de esas remesas. Antes de gastos operativos, costos de proveedores e impuestos.</p>
    </div>
    <p className="mt-3 text-xs text-slate-500">
      Se usa la comisión guardada en cada factura. Las rebajas generales reducen primero la comisión de la agencia, hasta cero.
      Los pagos parciales se mantienen en Cobrado total hasta completar la factura.
      {e.withoutCharge > 0 && " " + e.withoutCharge + " remesa(s) no tienen cargo histórico de plataforma registrado."}
      {" "}La rentabilidad de paquetería y productos requiere registrar sus costos.
    </p>
  </section>;
}
