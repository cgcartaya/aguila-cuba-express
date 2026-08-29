export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  DollarSign,
  ReceiptText,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { getStores } from "@/lib/services/stores";

type OrderRow = {
  store_id: string | null;
  total: number | string | null;
  platform_fee_amount: number | string | null;
  created_at: string;
  status: string | null;
  deleted_at: string | null;
};

type MonthPoint = {
  key: string;
  label: string;
  commissions: number;
  sales: number;
  orders: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthStart(offset = 0) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

function change(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function Stat({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  delta,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof DollarSign;
  tone: string;
  delta?: number;
}) {
  const positive = (delta ?? 0) >= 0;

  return (
    <article className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}>
          <Icon size={19} />
        </span>

        {delta !== undefined && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${
              positive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>

      <p className="mt-4 text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-3xl font-black tracking-tight text-[#071a3d]">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{helper}</p>
    </article>
  );
}

export default async function SaasMetricsPage() {
  const stores = await getStores();

  const from = monthStart(-5);
  const to = monthStart(1);

  const { data: orderData, error } = await supabase
    .from("orders")
    .select("store_id,total,platform_fee_amount,created_at,status,deleted_at")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .is("deleted_at", null)
    .neq("status", "cancelled");

  if (error) {
    console.error("Error loading SaaS metrics orders:", error);
  }

  const orders = ((orderData || []) as OrderRow[]).filter(
    (row) => !row.deleted_at && row.status !== "cancelled"
  );

  const currentMonth = monthKey(new Date());
  const previousMonth = monthKey(monthStart(-1));

  const currentOrders = orders.filter(
    (row) => monthKey(new Date(row.created_at)) === currentMonth
  );
  const previousOrders = orders.filter(
    (row) => monthKey(new Date(row.created_at)) === previousMonth
  );

  const currentCommissions = currentOrders.reduce(
    (sum, row) => sum + Number(row.platform_fee_amount || 0),
    0
  );
  const previousCommissions = previousOrders.reduce(
    (sum, row) => sum + Number(row.platform_fee_amount || 0),
    0
  );

  const currentSales = currentOrders.reduce(
    (sum, row) => sum + Number(row.total || 0),
    0
  );

  const mrr = stores.reduce(
    (sum, store) => sum + Number(store.monthly_price || 0),
    0
  );

  const totalIncome = mrr + currentCommissions;
  const activeStores = stores.filter((store) => store.is_active).length;
  const suspendedStores = stores.length - activeStores;

  const now = new Date();
  const overdueStores = stores.filter((store) => {
    if (!store.next_payment_date) return false;
    return (
      new Date(`${store.next_payment_date}T23:59:59`) < now &&
      store.payment_status !== "paid"
    );
  }).length;

  const arpu = stores.length ? mrr / stores.length : 0;
  const takeRate = currentSales > 0 ? (currentCommissions / currentSales) * 100 : 0;
  const commissionDelta = change(currentCommissions, previousCommissions);

  const storeNames = new Map(stores.map((store) => [store.id, store.name]));
  const byStore = new Map<
    string,
    { storeId: string; name: string; commission: number; sales: number; orders: number }
  >();

  for (const order of currentOrders) {
    const storeId = String(order.store_id || "");
    if (!storeId) continue;

    const current = byStore.get(storeId) || {
      storeId,
      name: storeNames.get(storeId) || "Tienda",
      commission: 0,
      sales: 0,
      orders: 0,
    };

    current.commission += Number(order.platform_fee_amount || 0);
    current.sales += Number(order.total || 0);
    current.orders += 1;
    byStore.set(storeId, current);
  }

  const ranking = Array.from(byStore.values()).sort(
    (a, b) => b.commission - a.commission
  );

  const months: MonthPoint[] = Array.from({ length: 6 }, (_, index) => {
    const offset = index - 5;
    const date = monthStart(offset);
    const key = monthKey(date);
    const rows = orders.filter(
      (row) => monthKey(new Date(row.created_at)) === key
    );

    return {
      key,
      label: date.toLocaleDateString("es", { month: "short" }).replace(".", ""),
      commissions: rows.reduce(
        (sum, row) => sum + Number(row.platform_fee_amount || 0),
        0
      ),
      sales: rows.reduce((sum, row) => sum + Number(row.total || 0), 0),
      orders: rows.length,
    };
  });

  const maxCommission = Math.max(
    ...months.map((month) => month.commissions),
    1
  );

  return (
    <main className="min-h-screen bg-[#f6f8fc] px-4 py-5 md:px-6 xl:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="flex flex-col gap-5 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.04)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-600">
              Analítica SaaS
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#071a3d]">
              Métricas de plataforma
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">
              Ingresos recurrentes, comisiones, actividad de clientes y rendimiento
              transaccional de toda la plataforma.
            </p>
          </div>

          <Link
            href="/admin/saas"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Volver al dashboard
          </Link>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat
            label="Ingreso del mes"
            value={money(totalIncome)}
            helper={`${money(mrr)} MRR + ${money(currentCommissions)} comisiones`}
            icon={WalletCards}
            tone="bg-blue-50 text-blue-700"
          />
          <Stat
            label="MRR fijo"
            value={money(mrr)}
            helper={`${stores.length} clientes · ARPU ${money(arpu)}`}
            icon={CircleDollarSign}
            tone="bg-violet-50 text-violet-700"
          />
          <Stat
            label="Comisiones"
            value={money(currentCommissions)}
            helper={`${currentOrders.length} órdenes este mes`}
            icon={ReceiptText}
            tone="bg-emerald-50 text-emerald-700"
            delta={commissionDelta}
          />
          <Stat
            label="Volumen procesado"
            value={money(currentSales)}
            helper={`Take rate efectivo ${takeRate.toFixed(2)}%`}
            icon={BarChart3}
            tone="bg-cyan-50 text-cyan-700"
          />
          <Stat
            label="Clientes activos"
            value={`${activeStores}/${stores.length}`}
            helper={`${suspendedStores} suspendidos · ${overdueStores} atrasados`}
            icon={Users}
            tone="bg-amber-50 text-amber-700"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                  Tendencia real
                </p>
                <h2 className="mt-1 text-xl font-black text-[#071a3d]">
                  Comisiones de los últimos 6 meses
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">
                  Solo ingreso variable realmente generado por órdenes.
                </p>
              </div>
              <BarChart3 size={22} className="text-blue-600" />
            </div>

            <div className="mt-7 flex h-64 items-end gap-3">
              {months.map((month) => (
                <div key={month.key} className="flex h-full flex-1 flex-col justify-end">
                  <div className="mb-2 text-center">
                    <p className="text-[10px] font-black text-[#071a3d]">
                      {money(month.commissions)}
                    </p>
                    <p className="text-[9px] font-semibold text-slate-400">
                      {month.orders} ord.
                    </p>
                  </div>

                  <div className="flex h-[180px] items-end rounded-xl bg-slate-50 p-1.5">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-blue-600 to-indigo-400"
                      style={{
                        height: `${Math.max(
                          4,
                          (month.commissions / maxCommission) * 100
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-center text-xs font-black capitalize text-slate-500">
                    {month.label}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-600">
              Salud SaaS
            </p>
            <h2 className="mt-1 text-xl font-black text-[#071a3d]">
              Estado de la cartera
            </h2>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <CheckCircle2 size={18} className="text-emerald-700" />
                <p className="mt-3 text-3xl font-black text-emerald-900">
                  {activeStores}
                </p>
                <p className="text-xs font-black uppercase text-emerald-700">
                  Activos
                </p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-4">
                <Building2 size={18} className="text-rose-600" />
                <p className="mt-3 text-3xl font-black text-rose-900">
                  {overdueStores}
                </p>
                <p className="text-xs font-black uppercase text-rose-600">
                  Atrasados
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-xs font-black text-slate-500">
                  <span>Activación</span>
                  <span>
                    {stores.length ? Math.round((activeStores / stores.length) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${
                        stores.length ? (activeStores / stores.length) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  Ingreso medio por cliente
                </p>
                <p className="mt-1 text-2xl font-black text-[#071a3d]">
                  {money(arpu)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Basado únicamente en suscripciones fijas.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                Rendimiento por cliente
              </p>
              <h2 className="mt-1 text-xl font-black text-[#071a3d]">
                Comisiones generadas este mes
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                Ranking real según las órdenes activas del mes.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
              {ranking.length} tienda(s) con actividad
            </span>
          </div>

          {ranking.length ? (
            <div className="divide-y divide-slate-100">
              {ranking.map((row, index) => {
                const rowTakeRate =
                  row.sales > 0 ? (row.commission / row.sales) * 100 : 0;

                return (
                  <article
                    key={row.storeId}
                    className="grid gap-4 p-5 transition hover:bg-slate-50/70 md:grid-cols-[70px_1fr_150px_150px_150px] md:items-center"
                  >
                    <div>
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-sm font-black text-slate-600">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                        <Store size={18} />
                      </span>
                      <div>
                        <h3 className="font-black text-[#071a3d]">{row.name}</h3>
                        <p className="text-xs font-semibold text-slate-400">
                          {row.orders} {row.orders === 1 ? "orden" : "órdenes"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">
                        Ventas
                      </p>
                      <p className="mt-1 font-black text-slate-700">
                        {money(row.sales)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">
                        Comisión
                      </p>
                      <p className="mt-1 font-black text-emerald-700">
                        {money(row.commission)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">
                        Take rate
                      </p>
                      <p className="mt-1 font-black text-slate-700">
                        {rowTakeRate.toFixed(2)}%
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center">
              <BarChart3 className="mx-auto text-slate-300" size={36} />
              <p className="mt-3 font-black text-slate-600">
                No hay comisiones registradas este mes.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[28px] bg-gradient-to-r from-[#071a3d] to-blue-700 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-200">
                Lectura ejecutiva
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {currentCommissions >= previousCommissions
                  ? "Las comisiones están creciendo."
                  : "Las comisiones bajaron frente al mes anterior."}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-blue-100">
                Este mes la plataforma ha generado {money(currentCommissions)} en
                comisiones variables y {money(mrr)} en ingreso recurrente fijo.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl bg-white/10 px-5 py-4">
                <p className="text-[10px] font-black uppercase text-blue-200">
                  Total mes
                </p>
                <p className="mt-1 text-2xl font-black">{money(totalIncome)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-5 py-4">
                <p className="text-[10px] font-black uppercase text-blue-200">
                  Variación comisión
                </p>
                <p className="mt-1 flex items-center gap-1 text-2xl font-black">
                  {commissionDelta >= 0 ? (
                    <ArrowUpRight size={20} />
                  ) : (
                    <TrendingDown size={20} />
                  )}
                  {commissionDelta > 0 ? "+" : ""}
                  {commissionDelta.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
