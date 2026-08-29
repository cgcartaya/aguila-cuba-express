"use client";

import { useEffect, useMemo, useState } from "react";
import { DollarSign, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

type StoreRef = { id: string; name: string };
type BreakdownRow = { storeId: string; storeName: string; amount: number; orders: number };

export default function SaasPlatformRevenue({
  subscriptions,
  stores,
  variant,
}: {
  subscriptions: number;
  stores: StoreRef[];
  variant: "stat" | "summary";
}) {
  const [commissionTotal, setCommissionTotal] = useState(0);
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const storeNames = useMemo(
    () => new Map(stores.map((store) => [store.id, store.name])),
    [stores]
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setFailed(false);

      try {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const { data, error } = await supabase
          .from("orders")
          .select("store_id,platform_fee_amount,status,deleted_at")
          .gte("created_at", from.toISOString())
          .lt("created_at", to.toISOString())
          .is("deleted_at", null)
          .neq("status", "cancelled")
          .gt("platform_fee_amount", 0);

        if (error) throw error;

        const grouped = new Map<string, { amount: number; orders: number }>();

        for (const row of data || []) {
          const storeId = String(row.store_id || "");
          if (!storeId) continue;

          const current = grouped.get(storeId) || { amount: 0, orders: 0 };
          current.amount += Number(row.platform_fee_amount || 0);
          current.orders += 1;
          grouped.set(storeId, current);
        }

        const rows = Array.from(grouped.entries())
          .map(([storeId, value]) => ({
            storeId,
            storeName: storeNames.get(storeId) || "Tienda",
            amount: value.amount,
            orders: value.orders,
          }))
          .sort((a, b) => b.amount - a.amount);

        if (!mounted) return;
        setBreakdown(rows);
        setCommissionTotal(rows.reduce((sum, row) => sum + row.amount, 0));
      } catch (error) {
        console.error("Error cargando comisiones SaaS:", error);
        if (!mounted) return;
        setFailed(true);
        setCommissionTotal(0);
        setBreakdown([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [storeNames]);

  const total = subscriptions + commissionTotal;

  if (variant === "stat") {
    return (
      <article className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-700">
            <DollarSign className="h-5 w-5" />
          </span>
          {!loading && !failed && commissionTotal > 0 && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
              +${commissionTotal.toFixed(2)} comisiones
            </span>
          )}
        </div>

        <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">
          Ingreso mensual
        </p>

        {loading ? (
          <div className="mt-2 flex h-9 items-center">
            <Loader2 className="animate-spin text-violet-600" size={20} />
          </div>
        ) : (
          <p className="mt-1 text-3xl font-black tracking-tight text-[#071a3d]">
            ${total.toFixed(2)}
          </p>
        )}

        <p className="mt-1 text-xs font-semibold text-slate-400">
          ${subscriptions.toFixed(2)} suscripciones
          {!loading && !failed ? ` + $${commissionTotal.toFixed(2)} comisiones` : ""}
        </p>
      </article>
    );
  }

  return (
    <div className="w-full">
      <p className="text-xs font-bold text-slate-400">Ingresos (USD)</p>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        {loading ? (
          <Loader2 className="animate-spin text-blue-600" size={24} />
        ) : (
          <p className="text-3xl font-black tracking-tight text-[#071a3d]">
            ${total.toFixed(2)}
          </p>
        )}

        {!loading && !failed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
            <TrendingUp size={13} />
            Total del mes
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
          Suscripciones ${subscriptions.toFixed(2)}
        </span>
        <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">
          Comisiones ${commissionTotal.toFixed(2)}
        </span>
      </div>

      {!loading && !failed && breakdown.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
          {breakdown.map((row) => (
            <span key={row.storeId}>
              {row.storeName}: <strong className="text-slate-700">${row.amount.toFixed(2)}</strong>
              {" · "}
              {row.orders} {row.orders === 1 ? "orden" : "órdenes"}
            </span>
          ))}
        </div>
      )}

      {failed && (
        <p className="mt-2 text-xs font-semibold text-rose-500">
          No se pudieron cargar las comisiones del mes.
        </p>
      )}
    </div>
  );
}
