"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus, Trash2, UtensilsCrossed, X } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import {
  addItemToDailyMenu,
  createDailyMenu,
  deleteDailyMenu,
  getDailyMenuItemIds,
  getDailyMenusForAdmin,
  getEligibleItemsForAdmin,
  removeItemFromDailyMenu,
} from "@/lib/services/menu-daily-menus";
import { setDailyStockQuantity, getDailyStockDashboard } from "@/lib/services/menu-inventory";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import type { DailyMenu, EligibleDailyMenuItem } from "@/lib/menu/types";

export default function AdminMenuDailyMenusPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [eligibleItems, setEligibleItems] = useState<EligibleDailyMenuItem[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [todayQuota, setTodayQuota] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState<Record<string, string>>({});

  const loadMenus = async () => {
    if (accessLoading || storeLoading || !activeStore?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: menusData }, { data: eligible }, dailyStock] = await Promise.all([
      getDailyMenusForAdmin(activeStore.id),
      getEligibleItemsForAdmin(activeStore.id),
      getDailyStockDashboard(activeStore.id),
    ]);

    const nextMenus = menusData || [];
    setMenus(nextMenus);
    setEligibleItems(eligible);

    const quotaMap: Record<string, number | null> = {};
    dailyStock.forEach((row) => {
      quotaMap[row.menu_item_id] = row.quantity;
    });
    setTodayQuota(quotaMap);

    if (!activeMenuId && nextMenus.length > 0) {
      setActiveMenuId(nextMenus[0].id);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id, accessLoading, storeLoading]);

  useEffect(() => {
    if (!activeMenuId) {
      setMemberIds([]);
      return;
    }
    getDailyMenuItemIds(activeMenuId).then(({ data }) => setMemberIds(data));
  }, [activeMenuId]);

  const activeMenu = menus.find((m) => m.id === activeMenuId) || null;
  const catalogItems = eligibleItems.filter((i) => !memberIds.includes(i.id));
  const menuItems = eligibleItems.filter((i) => memberIds.includes(i.id));

  const handleCreateMenu = async () => {
    const name = prompt("Nombre del nuevo menú (ej: Almuerzo, Cena, Brunch)");
    if (!name?.trim() || !activeStore?.id) return;
    const { data, error } = await createDailyMenu(activeStore.id, name, menus.length);
    if (error) {
      alert("No se pudo crear el menú.");
      return;
    }
    setMenus((prev) => [...prev, data]);
    setActiveMenuId(data.id);
  };

  const handleDeleteMenu = async () => {
    if (!activeMenu) return;
    const confirmDelete = confirm(`¿Eliminar el menú "${activeMenu.name}"? Los platillos siguen existiendo en el catálogo.`);
    if (!confirmDelete) return;
    const { error } = await deleteDailyMenu(activeMenu.id);
    if (error) {
      alert("No se pudo eliminar el menú.");
      return;
    }
    const remaining = menus.filter((m) => m.id !== activeMenu.id);
    setMenus(remaining);
    setActiveMenuId(remaining[0]?.id || null);
  };

  const handleAddToMenu = async (item: EligibleDailyMenuItem) => {
    if (!activeMenuId) return;
    setBusyItemId(item.id);
    const { error } = await addItemToDailyMenu(activeMenuId, item.id, menuItems.length);
    setBusyItemId(null);
    if (error) {
      alert("No se pudo agregar el platillo.");
      return;
    }
    setMemberIds((prev) => [...prev, item.id]);
  };

  const handleRemoveFromMenu = async (item: EligibleDailyMenuItem) => {
    if (!activeMenuId) return;
    setBusyItemId(item.id);
    const { error } = await removeItemFromDailyMenu(activeMenuId, item.id);
    setBusyItemId(null);
    if (error) {
      alert("No se pudo quitar el platillo.");
      return;
    }
    setMemberIds((prev) => prev.filter((id) => id !== item.id));
  };

  const handleSaveQuota = async (item: EligibleDailyMenuItem) => {
    if (!activeStore?.id) return;
    const draft = draftQty[item.id];
    const quantity = draft !== undefined ? Number(draft) : todayQuota[item.id] ?? 0;
    if (!Number.isFinite(quantity) || quantity < 0) return;

    setBusyItemId(item.id);
    const { error } = await setDailyStockQuantity(activeStore.id, item.id, quantity);
    setBusyItemId(null);
    if (error) {
      alert("No se pudo guardar el cupo de hoy.");
      return;
    }
    setTodayQuota((prev) => ({ ...prev, [item.id]: quantity }));
  };

  if (accessLoading || storeLoading || loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-sm font-bold text-slate-400">Cargando menú del día...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <AdminPageHeader
        eyebrow="Menú"
        title="Menú del día"
        description="Arma Almuerzo, Cena o los menús que quieras a partir de tu catálogo — solo entran platillos con inventario activo."
        storeName={activeStore?.name}
        icon={UtensilsCrossed}
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {menus.map((menu) => (
          <button
            key={menu.id}
            onClick={() => setActiveMenuId(menu.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              activeMenuId === menu.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            {menu.name}
          </button>
        ))}
        <button
          onClick={handleCreateMenu}
          className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-slate-300 px-4 py-2 text-sm font-bold text-slate-400 hover:border-slate-400 hover:text-slate-600"
        >
          <Plus size={14} />
          Nuevo menú
        </button>
      </div>

      {!activeMenu ? (
        <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
          Crea tu primer menú (ej. &quot;Almuerzo&quot;) para empezar a armarlo.
        </p>
      ) : eligibleItems.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
          Ningún platillo tiene inventario activo todavía (cupo diario o permanente) —
          actívalo en la edición de cada platillo para poder agregarlo aquí.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {/* CATÁLOGO — toca "+" para sumarlo al menú activo */}
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
                Catálogo elegible
              </h2>
              <span className="text-xs font-bold text-slate-400">{catalogItems.length}</span>
            </div>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {catalogItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        ${item.price.toFixed(2)} ·{" "}
                        {item.daily_stock_enabled ? "Cupo diario" : `Stock: ${item.stock}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddToMenu(item)}
                      disabled={busyItemId === item.id}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      {busyItemId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {catalogItems.length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs font-semibold text-slate-400">
                  Todo lo elegible ya está en este menú.
                </p>
              )}
            </div>
          </div>

          {/* MENÚ ACTIVO — toca "×" para quitarlo, ajusta el cupo de hoy */}
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
                En &quot;{activeMenu.name}&quot; hoy
              </h2>
              <button
                onClick={handleDeleteMenu}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Eliminar este menú"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {menuItems.map((item) => {
                  const draft = draftQty[item.id] ?? String(todayQuota[item.id] ?? "");
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-2xl border-2 p-2.5"
                      style={{ borderColor: "#0f172a22" }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                          <p className="text-[11px] font-semibold text-slate-400">${item.price.toFixed(2)}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFromMenu(item)}
                          disabled={busyItemId === item.id}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {busyItemId === item.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                        </button>
                      </div>

                      {item.daily_stock_enabled ? (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Cupo hoy
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={draft}
                            onChange={(e) => setDraftQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold"
                          />
                          <button
                            onClick={() => handleSaveQuota(item)}
                            className="rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-slate-700"
                          >
                            Guardar
                          </button>
                        </div>
                      ) : (
                        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Inventario permanente · quedan {item.stock}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {menuItems.length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs font-semibold text-slate-400">
                  Toca &quot;+&quot; en el catálogo para agregar platillos aquí.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
