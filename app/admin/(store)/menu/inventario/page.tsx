"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, Loader2, Minus, Plus, RefreshCw } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import {
  adjustPermanentStock,
  getDailyStockDashboard,
  getPermanentStockDashboard,
  setDailyStockQuantity,
} from "@/lib/services/menu-inventory";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import type { DailyStockRow, PermanentStockRow } from "@/lib/menu/types";

type Tab = "daily" | "permanent";

export default function AdminMenuInventoryPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [tab, setTab] = useState<Tab>("daily");
  const [dailyRows, setDailyRows] = useState<DailyStockRow[]>([]);
  const [permanentRows, setPermanentRows] = useState<PermanentStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});

  const todayLabel = new Date().toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const loadData = async () => {
    if (accessLoading || storeLoading || !activeStore?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [daily, permanent] = await Promise.all([
      getDailyStockDashboard(activeStore.id),
      getPermanentStockDashboard(activeStore.id),
    ]);
    setDailyRows(daily);
    setPermanentRows(permanent);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id, accessLoading, storeLoading]);

  const handleSaveQuota = async (row: DailyStockRow) => {
    if (!activeStore?.id) return;
    const draft = draftQuantities[row.menu_item_id];
    const quantity = draft !== undefined ? Number(draft) : row.quantity ?? 0;
    if (!Number.isFinite(quantity) || quantity < 0) return;

    setSavingId(row.menu_item_id);
    const { error } = await setDailyStockQuantity(activeStore.id, row.menu_item_id, quantity);
    setSavingId(null);

    if (error) {
      alert("No se pudo guardar el cupo de hoy.");
      return;
    }
    void loadData();
  };

  const handleAdjustPermanent = async (row: PermanentStockRow, delta: number) => {
    setSavingId(row.menu_item_id);
    const { error } = await adjustPermanentStock(row.menu_item_id, delta);
    setSavingId(null);
    if (error) {
      alert("No se pudo actualizar el inventario.");
      return;
    }
    void loadData();
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <AdminPageHeader
        eyebrow="Menú"
        title="Inventario"
        description="Estado en tiempo real de lo que tienes para vender hoy."
        storeName={activeStore?.name}
        icon={Boxes}
        actions={
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
          >
            <RefreshCw size={14} />
            Actualizar
          </button>
        }
      />

      <div className="mt-5 flex gap-1.5 rounded-2xl bg-slate-100 p-1.5">
        <button
          onClick={() => setTab("daily")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            tab === "daily" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          Platos del día
        </button>
        <button
          onClick={() => setTab("permanent")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            tab === "permanent" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          Inventario (bebidas, contables)
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-sm font-bold text-slate-400">Cargando...</p>
      ) : tab === "daily" ? (
        <div className="mt-5">
          <p className="mb-3 text-xs font-bold capitalize text-slate-400">{todayLabel}</p>

          {dailyRows.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
              Ningún platillo tiene activado &quot;Cupo diario&quot; todavía. Actívalo desde la
              edición de cada platillo.
            </p>
          ) : (
            <div className="space-y-2">
              {dailyRows.map((row) => {
                const draft = draftQuantities[row.menu_item_id] ?? String(row.quantity ?? "");
                const isLow = row.remaining !== null && row.quantity !== null && row.remaining <= Math.ceil(row.quantity * 0.2);
                const isOut = row.remaining === 0;

                return (
                  <div key={row.menu_item_id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900">{row.item_name}</p>
                        <p className="text-xs font-semibold text-slate-500">
                          {row.quantity === null
                            ? "Sin cupo puesto hoy — no disponible para pedir en línea"
                            : `Vendidos hoy: ${row.sold} de ${row.quantity}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {row.remaining !== null && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-black ${
                              isOut
                                ? "bg-red-100 text-red-600"
                                : isLow
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isOut ? "Agotado" : `Quedan ${row.remaining}`}
                          </span>
                        )}

                        <input
                          type="number"
                          min={0}
                          value={draft}
                          onChange={(e) =>
                            setDraftQuantities((prev) => ({ ...prev, [row.menu_item_id]: e.target.value }))
                          }
                          placeholder="0"
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-bold"
                        />
                        <button
                          onClick={() => handleSaveQuota(row)}
                          disabled={savingId === row.menu_item_id}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60"
                        >
                          {savingId === row.menu_item_id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            "Poner cupo"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5">
          {permanentRows.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
              Ningún platillo tiene &quot;Inventario permanente&quot; activado todavía. Actívalo
              desde la edición de cada platillo (ej. cervezas, vinos, ron).
            </p>
          ) : (
            <div className="space-y-2">
              {permanentRows.map((row) => {
                const isLow = row.stock <= 5;
                const isOut = row.stock === 0;

                return (
                  <div key={row.menu_item_id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900">{row.item_name}</p>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isOut ? "bg-red-100 text-red-600" : isLow ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isOut ? "Agotado" : isLow ? "Bajo" : "OK"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAdjustPermanent(row, -1)}
                        disabled={savingId === row.menu_item_id || row.stock <= 0}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-10 text-center text-lg font-black text-slate-900">{row.stock}</span>
                      <button
                        onClick={() => handleAdjustPermanent(row, 1)}
                        disabled={savingId === row.menu_item_id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => {
                          const amount = Number(prompt(`¿Cuántas unidades de "${row.item_name}" quieres agregar? (repón compra)`));
                          if (Number.isFinite(amount) && amount !== 0) handleAdjustPermanent(row, amount);
                        }}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
                      >
                        Reponer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
