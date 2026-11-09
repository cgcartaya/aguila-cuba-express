import type { RemittanceEarnings } from "@/lib/shipping/remittance-earnings";

import type { ShippingPlatformBilling } from "@/lib/shipping/platform-billing";

const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default function RemittanceEarningsCard({ earnings: e, billing }: { earnings: RemittanceEarnings; billing?: ShippingPlatformBilling }) {
  const metrics = [
    ["Facturado total", e.billed, "Todas las operaciones vigentes"],
    ["Cobrado total", e.paid, "Pagos y recibos registrados"],
    ["Principal de remesas", e.principal, "Dinero destinado a los beneficiarios"],
    ["Comisión de la agencia", e.earned, e.count + " remesas · después de rebajas"],
    ["Comisión de facturas pagadas", e.collected, "Remesas con la factura completamente pagada"],
    ["Plataforma descontada aquí", e.platform, "Solo remesas vigentes de este bloque"],
  ] as const;

  return <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
    <h2 className="text-xl font-black">Facturación e ingresos de la agencia</h2>
    <p className="mt-1 text-sm text-slate-500">Acumulado histórico en USD. Excluye cancelados y papelera.</p>
    {billing && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
      <h3 className="font-bold">Cómo se divide la comisión de Perla</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        <div><dt className="text-xs">Total de la plataforma</dt><dd className="mt-1 text-xl font-black">{usd(billing.total_amount)}</dd><p className="text-xs">{billing.total_count} facturas con cargo</p></div>
        <div><dt className="text-xs">De estas remesas vigentes</dt><dd className="mt-1 text-xl font-black">{usd(e.platform)}</dd><p className="text-xs">{e.count - e.withoutCharge} facturas con cargo</p></div>
        <div><dt className="text-xs">Resto de facturas registradas</dt><dd className="mt-1 text-xl font-black">{usd(billing.total_amount - e.platform)}</dd><p className="text-xs">{billing.total_count - e.count + e.withoutCharge} facturas con cargo</p></div>
      </dl>
      <p className="mt-3 text-xs text-slate-600">El total incluye todos los cargos históricos. Para calcular el ingreso de remesas se descuenta solo su parte. El resto incluye paquetería, productos y cargos de operaciones canceladas o eliminadas.</p>
    </div>}
    <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map(([label, amount, detail]) => <div key={label} className="rounded-xl bg-slate-50 p-4">
        <dt className="text-sm font-semibold">{label}</dt>
        <dd className="mt-2 text-2xl font-black tabular-nums">{usd(amount)}</dd>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>)}
    </dl>
    <div className="mt-5 border-t border-slate-100 pt-5">
      <h3 className="font-black">Paquetería y ventas de productos</h3>
      <p className="mt-1 text-xs text-slate-500">Importes de las facturas de Envíos. Los productos virtuales se cuentan una sola vez, aunque tengan una orden vinculada en la tienda.</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {([
          ["Envíos por peso / libras", e.weightSales],
          ["Productos de la tienda virtual", e.virtualSales],
          ["Ventas de la tienda física", e.physicalSales],
          ["Cargos adicionales", e.extraFees],
          ["Subtotal de paquetería y productos", e.otherSalesBeforeRebates],
          ["Rebajas generales de facturas", e.invoiceRebates],
        ] as const).map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4">
          <dt className="text-sm font-semibold">{label}</dt><dd className="mt-2 text-2xl font-black">{usd(value)}</dd>
        </div>)}
      </dl>
      <div className="mt-3 rounded-xl bg-blue-50 p-4">
        <p className="text-sm font-bold">Ingreso total sin el dinero de los beneficiarios</p>
        <p className="mt-1 text-3xl font-black">{usd(e.incomeExcludingPrincipal)}</p>
        <p className="mt-2 text-xs text-slate-600">Facturado total menos el principal de las remesas. Incluye comisión de remesas, paquetería y ventas, con las rebajas aplicadas. Antes de costos de mercancía, transporte, plataforma y otros gastos.</p>
      </div>
      <p className="mt-3 text-xs text-slate-500">Las rebajas generales se muestran una sola vez para toda la facturación. El cobro se controla por factura completa; los pagos parciales no se atribuyen a un producto o servicio específico.</p>
    </div>
    <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-950">
      <h3 className="text-sm font-bold">Ingreso solo de remesas menos su plataforma</h3>
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
