"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, UtensilsCrossed, X, CalendarClock, EyeOff, Sparkles } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import {
  addItemToDailyMenu,
  clearDailyMenuItemOverride,
  createDailyMenu,
  deleteDailyMenu,
  getDailyMenuItemIds,
  getDailyMenuOverrides,
  getDailyMenusForAdmin,
  getEligibleItemsForAdmin,
  getMenuToday,
  setDailyMenuItemOverride,
  setMenuTimeZone,
  updateDailyMenuSchedule,
} from "@/lib/services/menu-daily-menus";
import { setDailyStockQuantity, getDailyStockDashboard } from "@/lib/services/menu-inventory";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { WEEKDAY_LABELS, scheduleLabel } from "@/lib/menu/daytime";
import type { DailyMenu, DailyMenuItemOverride, EligibleDailyMenuItem } from "@/lib/menu/types";

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
  const [overrides, setOverrides] = useState<DailyMenuItemOverride[]>([]);
  const [todayQuota, setTodayQuota] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState<Record<string, string>>({});
  const [today, setToday] = useState("");
  const [timeZone, setTimeZoneState] = useState("America/Havana");
  const [tzDraft, setTzDraft] = useState("America/Havana");
  const [scheduleBusy, setScheduleBusy] = useState(false);

  const loadMenus = async () => {
    if (accessLoading || storeLoading || !activeStore?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [{ data: menusData }, { data: eligible }, dailyStock, restaurantNow] =
      await Promise.all([
        getDailyMenusForAdmin(activeStore.id),
        getEligibleItemsForAdmin(activeStore.id),
        getDailyStockDashboard(activeStore.id),
        getMenuToday(activeStore.id),
      ]);

    const nextMenus = menusData || [];
    setMenus(nextMenus);
    setEligibleItems(eligible);
    setToday(restaurantNow.date);
    setTimeZoneState(restaurantNow.timeZone);
    setTzDraft(restaurantNow.timeZone);

    const quotaMap: Record<string, number | null> = {};
    dailyStock.forEach((row) => {
      quotaMap[row.menu_item_id] = row.quantity;
    });
    setTodayQuota(quotaMap);

    setActiveMenuId((current) => current || nextMenus[0]?.id || null);
    setLoading(false);
  };

  useEffect(() => {
    void loadMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id, accessLoading, storeLoading]);

  useEffect(() => {
    if (!activeMenuId || !activeStore?.id || !today) {
      setMemberIds([]);
      setOverrides([]);
      return;
    }

    Promise.all([
      getDailyMenuItemIds(activeMenuId),
      getDailyMenuOverrides(activeStore.id, activeMenuId, today),
    ]).then(([members, dailyOverrides]) => {
      setMemberIds(members.data);
      setOverrides(dailyOverrides.data);
    });
  }, [activeMenuId, activeStore?.id, today]);

  const activeMenu = menus.find((m) => m.id === activeMenuId) || null;
  const overrideMap = new Map(overrides.map((o) => [o.menu_item_id, o.is_included]));

  const effectiveMemberIds = new Set(memberIds);
  for (const o of overrides) {
    if (o.is_included) effectiveMemberIds.add(o.menu_item_id);
    else effectiveMemberIds.delete(o.menu_item_id);
  }

  const catalogItems = eligibleItems.filter((i) => !memberIds.includes(i.id));
  const menuItems = eligibleItems.filter((i) => effectiveMemberIds.has(i.id));

  const createMenu = async () => {
    const name = prompt("Nombre del menú (ej: Almuerzo, Cena, Brunch, Happy Hour)");
    if (!name?.trim() || !activeStore?.id) return;

    const { data, error } = await createDailyMenu(activeStore.id, name, menus.length);
    if (error || !data) return alert("No se pudo crear el menú.");

    setMenus((prev) => [...prev, data as DailyMenu]);
    setActiveMenuId(data.id);
  };

  const removeMenu = async () => {
    if (!activeMenu) return;
    if (!confirm(`¿Eliminar "${activeMenu.name}"? Los platos no se borran del catálogo.`)) return;

    const { error } = await deleteDailyMenu(activeMenu.id);
    if (error) return alert("No se pudo eliminar.");

    const remaining = menus.filter((m) => m.id !== activeMenu.id);
    setMenus(remaining);
    setActiveMenuId(remaining[0]?.id || null);
  };

  const saveSchedule = async (patch: Partial<DailyMenu> = {}) => {
    if (!activeMenu) return;
    const next = { ...activeMenu, ...patch };
    if (!next.weekdays?.length) {
      alert("Selecciona al menos un día.");
      return;
    }

    setScheduleBusy(true);
    const { data, error } = await updateDailyMenuSchedule(activeMenu.id, {
      weekdays: next.weekdays,
      start_time: next.start_time,
      end_time: next.end_time,
      is_active: next.is_active,
    });
    setScheduleBusy(false);

    if (error || !data) return alert("No se pudo guardar el horario.");
    setMenus((prev) => prev.map((m) => (m.id === activeMenu.id ? (data as DailyMenu) : m)));
  };

  const toggleDay = (day: number) => {
    if (!activeMenu) return;
    const days = activeMenu.weekdays?.length ? [...activeMenu.weekdays] : [0, 1, 2, 3, 4, 5, 6];
    const nextDays = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    setMenus((prev) =>
      prev.map((m) => (m.id === activeMenu.id ? { ...m, weekdays: nextDays } : m))
    );
  };

  const addPermanent = async (item: EligibleDailyMenuItem) => {
    if (!activeMenuId) return;
    setBusyItemId(item.id);
    const { error } = await addItemToDailyMenu(activeMenuId, item.id, memberIds.length);
    setBusyItemId(null);
    if (error) return alert("No se pudo agregar.");
    setMemberIds((prev) => [...prev, item.id]);
    await clearDailyMenuItemOverride(activeMenuId, item.id, today);
    setOverrides((prev) => prev.filter((o) => o.menu_item_id !== item.id));
  };

  const onlyToday = async (item: EligibleDailyMenuItem) => {
    if (!activeMenuId || !activeStore?.id) return;
    setBusyItemId(item.id);
    const { error } = await setDailyMenuItemOverride({
      storeId: activeStore.id,
      dailyMenuId: activeMenuId,
      menuItemId: item.id,
      date: today,
      isIncluded: true,
    });
    setBusyItemId(null);
    if (error) return alert("No se pudo marcar solo para hoy.");
    setOverrides((prev) => [
      ...prev.filter((o) => o.menu_item_id !== item.id),
      { daily_menu_id: activeMenuId, menu_item_id: item.id, override_date: today, is_included: true },
    ]);
  };

  const hideToday = async (item: EligibleDailyMenuItem) => {
    if (!activeMenuId || !activeStore?.id) return;
    setBusyItemId(item.id);
    const { error } = await setDailyMenuItemOverride({
      storeId: activeStore.id,
      dailyMenuId: activeMenuId,
      menuItemId: item.id,
      date: today,
      isIncluded: false,
    });
    setBusyItemId(null);
    if (error) return alert("No se pudo ocultar hoy.");
    setOverrides((prev) => [
      ...prev.filter((o) => o.menu_item_id !== item.id),
      { daily_menu_id: activeMenuId, menu_item_id: item.id, override_date: today, is_included: false },
    ]);
  };

  const clearToday = async (item: EligibleDailyMenuItem) => {
    if (!activeMenuId) return;
    await clearDailyMenuItemOverride(activeMenuId, item.id, today);
    setOverrides((prev) => prev.filter((o) => o.menu_item_id !== item.id));
  };

  const saveQuota = async (item: EligibleDailyMenuItem) => {
    if (!activeStore?.id) return;
    const quantity = Number(draftQty[item.id] ?? todayQuota[item.id] ?? 0);
    if (!Number.isFinite(quantity) || quantity < 0) return;

    setBusyItemId(item.id);
    const { error } = await setDailyStockQuantity(activeStore.id, item.id, quantity, today);
    setBusyItemId(null);
    if (error) return alert("No se pudo guardar el cupo.");
    setTodayQuota((prev) => ({ ...prev, [item.id]: quantity }));
  };

  const saveTimeZone = async () => {
    if (!activeStore?.id) return;
    const { data, error } = await setMenuTimeZone(activeStore.id, tzDraft);
    if (error || !data) return alert("Zona horaria inválida o no se pudo guardar.");
    setTimeZoneState(data.menu_timezone);
    await loadMenus();
  };

  if (accessLoading || storeLoading || loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </main>
    );
  }

  if (!activeStore?.id) {
    return <main className="p-8 text-center text-slate-400">Selecciona una tienda.</main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <AdminPageHeader
        eyebrow="Menú"
        title="Menús y horarios"
        description="Configura Almuerzo, Cena, Brunch o Happy Hour; decide cuándo aparecen y qué cambia solo por hoy."
        storeName={activeStore.name}
        icon={UtensilsCrossed}
      />

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Hora del restaurante</p>
            <p className="mt-1 text-sm font-bold text-slate-700">
              Hoy: {today} · Zona: {timeZone}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={tzDraft}
              onChange={(e) => setTzDraft(e.target.value)}
              placeholder="America/Havana"
              className="min-w-[220px] rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
            />
            <button onClick={saveTimeZone} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
              Guardar zona horaria
            </button>
          </div>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {menus.map((menu) => (
          <button
            key={menu.id}
            onClick={() => setActiveMenuId(menu.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              activeMenuId === menu.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            {menu.name}
          </button>
        ))}
        <button onClick={createMenu} className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-slate-300 px-4 py-2 text-sm font-bold text-slate-500">
          <Plus size={14} /> Nuevo menú
        </button>
      </div>

      {!activeMenu ? (
        <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">
          Crea tu primer menú.
        </div>
      ) : (
        <>
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarClock size={18} className="text-slate-500" />
                  <h2 className="text-base font-black text-slate-900">Horario de {activeMenu.name}</h2>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {scheduleLabel(activeMenu.weekdays, activeMenu.start_time, activeMenu.end_time)}
                </p>
              </div>
              <button onClick={removeMenu} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((label, day) => {
                const selected = activeMenu.weekdays?.includes(day) ?? true;
                return (
                  <button
                    key={label}
                    onClick={() => toggleDay(day)}
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${
                      selected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:max-w-lg">
              <label className="text-xs font-bold text-slate-500">
                Desde
                <input
                  type="time"
                  value={activeMenu.start_time?.slice(0, 5) || ""}
                  onChange={(e) =>
                    setMenus((prev) =>
                      prev.map((m) => m.id === activeMenu.id ? { ...m, start_time: e.target.value || null } : m)
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-bold text-slate-500">
                Hasta
                <input
                  type="time"
                  value={activeMenu.end_time?.slice(0, 5) || ""}
                  onChange={(e) =>
                    setMenus((prev) =>
                      prev.map((m) => m.id === activeMenu.id ? { ...m, end_time: e.target.value || null } : m)
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <button
              onClick={() => saveSchedule()}
              disabled={scheduleBusy}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {scheduleBusy ? "Guardando..." : "Guardar horario"}
            </button>
          </section>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <section className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Catálogo</h2>
              <p className="mb-3 mt-1 text-xs font-semibold text-slate-400">
                Todos los platos activos pueden agregarse, tengan inventario o no.
              </p>

              <div className="space-y-2">
                {catalogItems.map((item) => {
                  const todayOnly = overrideMap.get(item.id) === true;
                  return (
                    <div key={item.id} className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                          <p className="text-[11px] font-semibold text-slate-400">${item.price.toFixed(2)}</p>
                        </div>
                        <button onClick={() => addPermanent(item)} className="rounded-full bg-slate-900 p-2 text-white" title="Agregar siempre">
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => (todayOnly ? clearToday(item) : onlyToday(item))}
                        className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-black ${
                          todayOnly ? "bg-amber-100 text-amber-700" : "bg-white text-slate-500"
                        }`}
                      >
                        <Sparkles size={12} />
                        {todayOnly ? "Solo hoy ✓ (quitar excepción)" : "Disponible solo hoy"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
                En “{activeMenu.name}”
              </h2>
              <p className="mb-3 mt-1 text-xs font-semibold text-slate-400">
                Las excepciones se borran solas al cambiar de fecha porque están guardadas por día.
              </p>

              <div className="space-y-2">
                {menuItems.map((item) => {
                  const hiddenToday = overrideMap.get(item.id) === false;
                  const todayOnly = overrideMap.get(item.id) === true && !memberIds.includes(item.id);
                  const draft = draftQty[item.id] ?? String(todayQuota[item.id] ?? "");

                  return (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                          <p className="text-[11px] font-semibold text-slate-400">
                            ${item.price.toFixed(2)}
                            {todayOnly ? " · Solo hoy" : ""}
                          </p>
                        </div>
                        {memberIds.includes(item.id) && (
                          <button onClick={() => hideToday(item)} className="rounded-full bg-slate-100 p-2 text-slate-500" title="Ocultar hoy">
                            <EyeOff size={14} />
                          </button>
                        )}
                      </div>

                      {hiddenToday && (
                        <button onClick={() => clearToday(item)} className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-600">
                          Oculto hoy · Restaurar
                        </button>
                      )}

                      {item.daily_stock_enabled ? (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-slate-400">Cupo hoy</span>
                          <input
                            type="number"
                            min={0}
                            value={draft}
                            onChange={(e) => setDraftQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold"
                          />
                          <button onClick={() => saveQuota(item)} className="rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white">
                            Guardar
                          </button>
                        </div>
                      ) : (
                        <p className="mt-2 text-[10px] font-bold uppercase text-slate-400">
                          {item.stock === null ? "Sin control de inventario" : `Inventario permanente: ${item.stock}`}
                        </p>
                      )}
                    </div>
                  );
                })}

                {menuItems.length === 0 && (
                  <div className="rounded-2xl bg-slate-50 p-5 text-center text-xs font-semibold text-slate-400">
                    Este menú no tiene platos efectivos para hoy.
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
