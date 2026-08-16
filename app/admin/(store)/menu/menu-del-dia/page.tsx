"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import WeeklyMenuCalendar from "@/components/admin/menu/WeeklyMenuCalendar";
import MenuAdminPreview from "@/components/admin/menu/MenuAdminPreview";
import {
  addItemToDailyMenu,
  clearDailyMenuItemOverride,
  createDailyMenu,
  createDailyMenuSchedule,
  deleteDailyMenu,
  deleteDailyMenuScheduleRule,
  getDailyMenuItemIds,
  getDailyMenuOverrides,
  getDailyMenusForAdmin,
  getEligibleItemsForAdmin,
  getMenuToday,
  removeItemFromDailyMenu,
  setDailyMenuItemOverride,
  setMenuTimeZone,
  updateDailyMenuMeta,
  updateDailyMenuScheduleRule,
} from "@/lib/services/menu-daily-menus";
import { setDailyStockQuantity, getDailyStockDashboard } from "@/lib/services/menu-inventory";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { WEEKDAY_LABELS, scheduleLabel } from "@/lib/menu/daytime";
import type {
  DailyMenu,
  DailyMenuItemOverride,
  DailyMenuSchedule,
  EligibleDailyMenuItem,
} from "@/lib/menu/types";

type TabKey = "menus" | "platos" | "excepciones" | "preview" | "calendario" | "config";

const TABS: { key: TabKey; label: string; icon: typeof Clock3 }[] = [
  { key: "menus", label: "Menús", icon: Clock3 },
  { key: "platos", label: "Platos", icon: UtensilsCrossed },
  { key: "excepciones", label: "Excepciones de hoy", icon: Sparkles },
  { key: "preview", label: "Vista previa", icon: Eye },
  { key: "calendario", label: "Calendario", icon: CalendarDays },
  { key: "config", label: "Configuración", icon: Settings2 },
];

export default function AdminMenuDailyMenusPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [tab, setTab] = useState<TabKey>("menus");
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [items, setItems] = useState<EligibleDailyMenuItem[]>([]);
  const [memberMap, setMemberMap] = useState<Record<string, string[]>>({});
  const [overrides, setOverrides] = useState<DailyMenuItemOverride[]>([]);
  const [todayQuota, setTodayQuota] = useState<Record<string, number | null>>({});
  const [draftQty, setDraftQty] = useState<Record<string, string>>({});
  const [today, setToday] = useState("");
  const [timeZone, setTimeZoneState] = useState("America/Havana");
  const [tzDraft, setTzDraft] = useState("America/Havana");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeMenu = menus.find((m) => m.id === activeMenuId) || null;
  const members = activeMenuId ? memberMap[activeMenuId] || [] : [];
  const overrideMap = new Map(overrides.map((o) => [o.menu_item_id, o.is_included]));

  const loadAll = async () => {
    if (accessLoading || storeLoading || !activeStore?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [{ data: menuData }, { data: eligible }, stock, restaurantNow] = await Promise.all([
      getDailyMenusForAdmin(activeStore.id),
      getEligibleItemsForAdmin(activeStore.id),
      getDailyStockDashboard(activeStore.id),
      getMenuToday(activeStore.id),
    ]);

    const nextMenus = menuData || [];
    setMenus(nextMenus);
    setItems(eligible);
    setToday(restaurantNow.date);
    setTimeZoneState(restaurantNow.timeZone);
    setTzDraft(restaurantNow.timeZone);

    const nextMemberMap: Record<string, string[]> = {};
    await Promise.all(
      nextMenus.map(async (menu) => {
        const { data } = await getDailyMenuItemIds(menu.id);
        nextMemberMap[menu.id] = data;
      })
    );
    setMemberMap(nextMemberMap);

    const quotaMap: Record<string, number | null> = {};
    stock.forEach((row) => {
      quotaMap[row.menu_item_id] = row.quantity;
    });
    setTodayQuota(quotaMap);

    setActiveMenuId((current) => current || nextMenus[0]?.id || null);
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id, accessLoading, storeLoading]);

  useEffect(() => {
    if (!activeMenuId || !activeStore?.id || !today) {
      setOverrides([]);
      return;
    }
    getDailyMenuOverrides(activeStore.id, activeMenuId, today).then(({ data }) => setOverrides(data));
  }, [activeMenuId, activeStore?.id, today]);

  const refreshMenus = async () => {
    if (!activeStore?.id) return;
    const { data } = await getDailyMenusForAdmin(activeStore.id);
    setMenus(data || []);
  };

  const createMenu = async () => {
    const name = prompt("Nombre del menú (ej: Almuerzo, Cena, Happy Hour)");
    if (!name?.trim() || !activeStore?.id) return;

    const { data, error } = await createDailyMenu(activeStore.id, name, menus.length);
    if (error || !data) return alert("No se pudo crear el menú.");

    await createDailyMenuSchedule(data.id, {
      weekdays: [1, 2, 3, 4, 5],
      start_time: "11:00",
      end_time: "15:00",
      label: "Lunes a viernes",
      sort_order: 0,
    });

    await refreshMenus();
    setActiveMenuId(data.id);
  };

  const removeMenu = async (menu: DailyMenu) => {
    if (!confirm(`¿Eliminar "${menu.name}"? Los platos no se borran.`)) return;
    const { error } = await deleteDailyMenu(menu.id);
    if (error) return alert("No se pudo eliminar.");
    await refreshMenus();
    setActiveMenuId((current) => (current === menu.id ? null : current));
  };

  const addRule = async (menu: DailyMenu) => {
    setBusyId(menu.id);
    const { error } = await createDailyMenuSchedule(menu.id, {
      weekdays: [6, 0],
      start_time: "11:30",
      end_time: "16:00",
      label: "Fin de semana",
      sort_order: menu.menu_daily_menu_schedules?.length || 0,
    });
    setBusyId(null);
    if (error) return alert("No se pudo agregar la regla.");
    await refreshMenus();
  };

  const updateRuleLocal = (menuId: string, ruleId: string, patch: Partial<DailyMenuSchedule>) => {
    setMenus((prev) =>
      prev.map((menu) =>
        menu.id !== menuId
          ? menu
          : {
              ...menu,
              menu_daily_menu_schedules: (menu.menu_daily_menu_schedules || []).map((rule) =>
                rule.id === ruleId ? { ...rule, ...patch } : rule
              ),
            }
      )
    );
  };

  const saveRule = async (rule: DailyMenuSchedule) => {
    setBusyId(rule.id);
    const { error } = await updateDailyMenuScheduleRule(rule.id, {
      weekdays: rule.weekdays,
      start_time: rule.start_time,
      end_time: rule.end_time,
      label: rule.label,
      is_active: rule.is_active,
      sort_order: rule.sort_order,
    });
    setBusyId(null);
    if (error) alert("No se pudo guardar la regla.");
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm("¿Eliminar esta regla horaria?")) return;
    const { error } = await deleteDailyMenuScheduleRule(ruleId);
    if (error) return alert("No se pudo eliminar.");
    await refreshMenus();
  };

  const toggleMenu = async (menu: DailyMenu) => {
    const next = !menu.is_active;
    setMenus((prev) => prev.map((m) => (m.id === menu.id ? { ...m, is_active: next } : m)));
    await updateDailyMenuMeta(menu.id, { is_active: next });
  };

  const addDish = async (item: EligibleDailyMenuItem) => {
    if (!activeMenuId) return;
    setBusyId(item.id);
    const { error } = await addItemToDailyMenu(activeMenuId, item.id, members.length);
    setBusyId(null);
    if (error) return alert("No se pudo agregar.");
    setMemberMap((prev) => ({ ...prev, [activeMenuId]: [...members, item.id] }));
  };

  const removeDish = async (item: EligibleDailyMenuItem) => {
    if (!activeMenuId) return;
    setBusyId(item.id);
    const { error } = await removeItemFromDailyMenu(activeMenuId, item.id);
    setBusyId(null);
    if (error) return alert("No se pudo quitar.");
    setMemberMap((prev) => ({
      ...prev,
      [activeMenuId]: members.filter((id) => id !== item.id),
    }));
  };

  const setOverride = async (item: EligibleDailyMenuItem, isIncluded: boolean) => {
    if (!activeMenuId || !activeStore?.id) return;
    setBusyId(item.id);
    const { error } = await setDailyMenuItemOverride({
      storeId: activeStore.id,
      dailyMenuId: activeMenuId,
      menuItemId: item.id,
      date: today,
      isIncluded,
    });
    setBusyId(null);
    if (error) return alert("No se pudo guardar la excepción.");
    setOverrides((prev) => [
      ...prev.filter((o) => o.menu_item_id !== item.id),
      {
        daily_menu_id: activeMenuId,
        menu_item_id: item.id,
        override_date: today,
        is_included: isIncluded,
      },
    ]);
  };

  const clearOverride = async (item: EligibleDailyMenuItem) => {
    if (!activeMenuId) return;
    await clearDailyMenuItemOverride(activeMenuId, item.id, today);
    setOverrides((prev) => prev.filter((o) => o.menu_item_id !== item.id));
  };

  const saveQuota = async (item: EligibleDailyMenuItem) => {
    if (!activeStore?.id) return;
    const quantity = Number(draftQty[item.id] ?? todayQuota[item.id] ?? 0);
    if (!Number.isFinite(quantity) || quantity < 0) return;

    setBusyId(item.id);
    const { error } = await setDailyStockQuantity(activeStore.id, item.id, quantity, today);
    setBusyId(null);
    if (error) return alert("No se pudo guardar el cupo.");
    setTodayQuota((prev) => ({ ...prev, [item.id]: quantity }));
  };

  const saveTimeZone = async () => {
    if (!activeStore?.id) return;
    const { data, error } = await setMenuTimeZone(activeStore.id, tzDraft);
    if (error || !data) return alert("Zona horaria inválida.");
    setTimeZoneState(data.menu_timezone);
    await loadAll();
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

  const catalogItems = items.filter((item) => !members.includes(item.id));
  const assignedItems = items.filter((item) => members.includes(item.id));

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <AdminPageHeader
        eyebrow="Menú"
        title="Menús y horarios"
        description="Organiza qué menú se muestra cada día, a qué hora y qué cambios aplican solo hoy."
        storeName={activeStore.name}
        icon={UtensilsCrossed}
      />

      <div className="mt-5 flex gap-1.5 overflow-x-auto rounded-2xl bg-slate-100 p-1.5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
              tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "menus" && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Mis menús</h2>
              <p className="text-xs font-semibold text-slate-400">
                Un mismo menú puede tener varias reglas de horario.
              </p>
            </div>
            <button onClick={createMenu} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">
              <Plus size={16} /> Nuevo menú
            </button>
          </div>

          <div className="space-y-4">
            {menus.map((menu) => (
              <div key={menu.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button onClick={() => setActiveMenuId(menu.id)} className="text-left">
                    <p className="text-base font-black text-slate-900">{menu.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {(memberMap[menu.id] || []).length} platos · {(menu.menu_daily_menu_schedules || []).length} reglas
                    </p>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleMenu(menu)}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-black ${
                        menu.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {menu.is_active ? "Activo" : "Inactivo"}
                    </button>
                    <button onClick={() => addRule(menu)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                      + Regla
                    </button>
                    <button onClick={() => removeMenu(menu)} className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {(menu.menu_daily_menu_schedules || []).map((rule) => (
                    <div key={rule.id} className="grid gap-3 rounded-2xl bg-slate-50 p-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
                      <div>
                        <input
                          value={rule.label || ""}
                          onChange={(e) => updateRuleLocal(menu.id, rule.id, { label: e.target.value })}
                          placeholder="Ej: Lunes a viernes"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                        />
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {WEEKDAY_LABELS.map((label, day) => {
                            const selected = rule.weekdays.includes(day);
                            return (
                              <button
                                key={label}
                                onClick={() =>
                                  updateRuleLocal(menu.id, rule.id, {
                                    weekdays: selected
                                      ? rule.weekdays.filter((d) => d !== day)
                                      : [...rule.weekdays, day].sort(),
                                  })
                                }
                                className={`h-7 w-7 rounded-full text-[9px] font-black ${
                                  selected ? "bg-slate-900 text-white" : "bg-white text-slate-400"
                                }`}
                              >
                                {label.slice(0, 1)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <label className="text-[10px] font-black uppercase text-slate-400">
                        Desde
                        <input
                          type="time"
                          value={rule.start_time?.slice(0, 5) || ""}
                          onChange={(e) => updateRuleLocal(menu.id, rule.id, { start_time: e.target.value || null })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                        />
                      </label>

                      <label className="text-[10px] font-black uppercase text-slate-400">
                        Hasta
                        <input
                          type="time"
                          value={rule.end_time?.slice(0, 5) || ""}
                          onChange={(e) => updateRuleLocal(menu.id, rule.id, { end_time: e.target.value || null })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                        />
                      </label>

                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => saveRule(rule)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                          Guardar
                        </button>
                        <button onClick={() => deleteRule(rule.id)} className="rounded-xl p-2 text-slate-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(menu.menu_daily_menu_schedules || []).length === 0 && (
                    <button onClick={() => addRule(menu)} className="w-full rounded-2xl border-2 border-dashed border-slate-200 p-4 text-xs font-bold text-slate-400">
                      + Agregar primera regla horaria
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "platos" && (
        <section className="mt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {menus.map((menu) => (
              <button
                key={menu.id}
                onClick={() => setActiveMenuId(menu.id)}
                className={`rounded-full px-4 py-2 text-xs font-black ${
                  activeMenuId === menu.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {menu.name}
              </button>
            ))}
          </div>

          {!activeMenu ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-400">
              Selecciona un menú.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-black uppercase text-slate-500">Catálogo</h2>
                <div className="mt-3 space-y-2">
                  {catalogItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                        <p className="text-xs font-semibold text-slate-400">${item.price.toFixed(2)}</p>
                      </div>
                      <button onClick={() => addDish(item)} className="rounded-full bg-slate-900 p-2 text-white">
                        <Plus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-black uppercase text-slate-500">En {activeMenu.name}</h2>
                <div className="mt-3 space-y-2">
                  {assignedItems.map((item) => {
                    const draft = draftQty[item.id] ?? String(todayQuota[item.id] ?? "");
                    return (
                      <div key={item.id} className="rounded-2xl border border-slate-200 p-3">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                            <p className="text-xs font-semibold text-slate-400">${item.price.toFixed(2)}</p>
                          </div>
                          <button onClick={() => removeDish(item)} className="rounded-full bg-slate-100 p-2 text-slate-500">
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {item.daily_stock_enabled && (
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
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "excepciones" && (
        <section className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Excepciones de hoy</h2>
              <p className="text-xs font-semibold text-slate-400">{today} · Solo afectan este día.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {menus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => setActiveMenuId(menu.id)}
                  className={`rounded-full px-4 py-2 text-xs font-black ${
                    activeMenuId === menu.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {menu.name}
                </button>
              ))}
            </div>
          </div>

          {!activeMenu ? null : (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-black text-red-600">Ocultar hoy</h3>
                <div className="mt-3 space-y-2">
                  {assignedItems.map((item) => {
                    const hidden = overrideMap.get(item.id) === false;
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                        </div>
                        <button
                          onClick={() => (hidden ? clearOverride(item) : setOverride(item, false))}
                          className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-black ${
                            hidden ? "bg-red-100 text-red-700" : "bg-white text-slate-500"
                          }`}
                        >
                          <EyeOff size={12} /> {hidden ? "Oculto hoy ✓" : "Ocultar hoy"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-black text-emerald-600">Disponible solo hoy</h3>
                <div className="mt-3 space-y-2">
                  {catalogItems.map((item) => {
                    const onlyToday = overrideMap.get(item.id) === true;
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                        </div>
                        <button
                          onClick={() => (onlyToday ? clearOverride(item) : setOverride(item, true))}
                          className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-black ${
                            onlyToday ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500"
                          }`}
                        >
                          <Sparkles size={12} /> {onlyToday ? "Solo hoy ✓" : "Solo hoy"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "preview" && (
        <div className="mt-6">
          <MenuAdminPreview menus={menus} memberMap={memberMap} items={items} timeZone={timeZone} />
        </div>
      )}

      {tab === "calendario" && (
        <div className="mt-6">
          <WeeklyMenuCalendar menus={menus} />
        </div>
      )}

      {tab === "config" && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-black text-slate-900">Configuración</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            La zona horaria define qué significa “hoy” y cuándo se activa cada menú.
          </p>

          <div className="mt-5 max-w-xl">
            <label className="text-xs font-black uppercase text-slate-400">
              Zona horaria del restaurante
              <input
                value={tzDraft}
                onChange={(e) => setTzDraft(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
                placeholder="America/Havana"
              />
            </label>

            <button onClick={saveTimeZone} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
              Guardar zona horaria
            </button>

            <p className="mt-3 text-xs font-semibold text-slate-400">
              Actual: {timeZone} · Hoy: {today}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
