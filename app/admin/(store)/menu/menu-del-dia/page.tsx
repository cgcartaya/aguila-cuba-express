"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Layers3,
  Loader2,
  Plus,
  Search,
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
import {
  setDailyStockQuantity,
  getDailyStockDashboard,
} from "@/lib/services/menu-inventory";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { WEEKDAY_LABELS } from "@/lib/menu/daytime";
import type {
  DailyMenu,
  DailyMenuItemOverride,
  DailyMenuSchedule,
  EligibleDailyMenuItem,
} from "@/lib/menu/types";

type TabKey =
  | "menus"
  | "platos"
  | "excepciones"
  | "preview"
  | "calendario"
  | "config";

const TABS: { key: TabKey; label: string; icon: typeof Clock3 }[] = [
  { key: "menus", label: "Menús", icon: Clock3 },
  { key: "platos", label: "Platos", icon: UtensilsCrossed },
  { key: "preview", label: "Vista previa", icon: Eye },
  { key: "calendario", label: "Calendario", icon: CalendarDays },
  { key: "config", label: "Configuración", icon: Settings2 },
];

const MENU_TONES = [
  "bg-violet-100 text-violet-600",
  "bg-orange-100 text-orange-600",
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-600",
];

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const [hoursRaw, minutes = "00"] = value.slice(0, 5).split(":");
  let hours = Number(hoursRaw);
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours.toString().padStart(2, "0")}:${minutes} ${suffix}`;
}

export default function AdminMenuDailyMenusPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
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
  const [catalogSearch, setCatalogSearch] = useState("");
  const [assignedSearch, setAssignedSearch] = useState("");

  const activeMenu = menus.find((m) => m.id === activeMenuId) || null;
  const members = activeMenuId ? memberMap[activeMenuId] || [] : [];
  const overrideMap = new Map(
    overrides.map((o) => [o.menu_item_id, o.is_included])
  );

  const loadAll = async () => {
    if (accessLoading || storeLoading || !activeStore?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [
      { data: menuData },
      { data: eligible },
      stock,
      restaurantNow,
    ] = await Promise.all([
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
    getDailyMenuOverrides(activeStore.id, activeMenuId, today).then(
      ({ data }) => setOverrides(data)
    );
  }, [activeMenuId, activeStore?.id, today]);

  const refreshMenus = async () => {
    if (!activeStore?.id) return;
    const { data } = await getDailyMenusForAdmin(activeStore.id);
    setMenus(data || []);
  };

  const createMenu = async () => {
    const name = prompt(
      "Nombre del menú (ej: Almuerzo, Cena, Happy Hour)"
    );
    if (!name?.trim() || !activeStore?.id) return;

    const { data, error } = await createDailyMenu(
      activeStore.id,
      name,
      menus.length
    );
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

  const updateRuleLocal = (
    menuId: string,
    ruleId: string,
    patch: Partial<DailyMenuSchedule>
  ) => {
    setMenus((prev) =>
      prev.map((menu) =>
        menu.id !== menuId
          ? menu
          : {
              ...menu,
              menu_daily_menu_schedules: (
                menu.menu_daily_menu_schedules || []
              ).map((rule) =>
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
    setMenus((prev) =>
      prev.map((m) => (m.id === menu.id ? { ...m, is_active: next } : m))
    );
    await updateDailyMenuMeta(menu.id, { is_active: next });
  };

  const addDish = async (item: EligibleDailyMenuItem) => {
    if (!activeMenuId) return;
    setBusyId(item.id);
    const { error } = await addItemToDailyMenu(
      activeMenuId,
      item.id,
      members.length
    );
    setBusyId(null);
    if (error) return alert("No se pudo agregar.");
    setMemberMap((prev) => ({
      ...prev,
      [activeMenuId]: [...members, item.id],
    }));
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

  const setOverride = async (
    item: EligibleDailyMenuItem,
    isIncluded: boolean
  ) => {
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
    setOverrides((prev) =>
      prev.filter((o) => o.menu_item_id !== item.id)
    );
  };

  const saveQuota = async (item: EligibleDailyMenuItem) => {
    if (!activeStore?.id) return;
    const quantity = Number(
      draftQty[item.id] ?? todayQuota[item.id] ?? 0
    );
    if (!Number.isFinite(quantity) || quantity < 0) return;

    setBusyId(item.id);
    const { error } = await setDailyStockQuantity(
      activeStore.id,
      item.id,
      quantity,
      today
    );
    setBusyId(null);
    if (error) return alert("No se pudo guardar el cupo.");
    setTodayQuota((prev) => ({ ...prev, [item.id]: quantity }));
  };

  const saveTimeZone = async () => {
    if (!activeStore?.id) return;
    const { data, error } = await setMenuTimeZone(
      activeStore.id,
      tzDraft
    );
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
    return (
      <main className="p-8 text-center text-slate-400">
        Selecciona una tienda.
      </main>
    );
  }

  const catalogItems = items.filter((item) => !members.includes(item.id));
  const assignedItems = items.filter((item) => members.includes(item.id));

  const filteredCatalog = catalogItems.filter((item) =>
    `${item.name}`.toLowerCase().includes(catalogSearch.trim().toLowerCase())
  );
  const filteredAssigned = assignedItems.filter((item) =>
    `${item.name}`.toLowerCase().includes(assignedSearch.trim().toLowerCase())
  );

  const activeMenus = menus.filter((menu) => menu.is_active).length;
  const scheduleCount = menus.reduce(
    (sum, menu) => sum + (menu.menu_daily_menu_schedules || []).length,
    0
  );
  const assignedTotal = Object.values(memberMap).reduce(
    (sum, ids) => sum + ids.length,
    0
  );

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-6">
      <div className="mx-auto max-w-[1240px]">
        <AdminPageHeader
          eyebrow="Menú"
          title="Menús y horarios"
          description="Organiza tus menús recurrentes y planifica cambios especiales desde el calendario."
          storeName={activeStore.name}
          icon={UtensilsCrossed}
        />

        <div className="mt-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-1.5 shadow-sm">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
                tab === key
                  ? "bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {tab === "menus" && (
          <>
            <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  icon: Layers3,
                  label: "Menús activos",
                  value: activeMenus,
                  note: `${menus.length} configurados`,
                  tone: "bg-violet-100 text-violet-600",
                },
                {
                  icon: Clock3,
                  label: "Reglas de horario",
                  value: scheduleCount,
                  note: "Horarios configurados",
                  tone: "bg-orange-100 text-orange-600",
                },
                {
                  icon: UtensilsCrossed,
                  label: "Platos asignados",
                  value: assignedTotal,
                  note: "Entre todos los menús",
                  tone: "bg-emerald-100 text-emerald-600",
                },
                {
                  icon: Sparkles,
                  label: "Excepciones hoy",
                  value: overrides.length,
                  note: today || "Hoy",
                  tone: "bg-blue-100 text-blue-600",
                },
              ].map(({ icon: Icon, label, value, note, tone }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_22px_rgba(15,23,42,.04)]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}
                    >
                      <Icon size={21} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">
                        {label}
                      </p>
                      <p className="text-2xl font-black text-[#071B35]">
                        {value}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-slate-400">
                    {note}
                  </p>
                </div>
              ))}
            </section>

            <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-lg font-black text-[#071B35]">
                    Mis menús
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Define días y horarios. Cada menú puede tener varias reglas.
                  </p>
                </div>

                <button
                  onClick={createMenu}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#071B35] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Plus size={16} /> Nuevo menú
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {menus.map((menu, menuIndex) => {
                  const rules = menu.menu_daily_menu_schedules || [];
                  const firstRule = rules[0];
                  const activeDays = firstRule?.weekdays || [];
                  const tone = MENU_TONES[menuIndex % MENU_TONES.length];

                  return (
                    <div key={menu.id} className="p-4 sm:p-5">
                      <div className="grid items-center gap-4 xl:grid-cols-[minmax(200px,1fr)_minmax(260px,1.25fr)_220px_auto]">
                        <button
                          onClick={() => setActiveMenuId(menu.id)}
                          className="flex min-w-0 items-center gap-3 text-left"
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
                          >
                            <UtensilsCrossed size={17} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-slate-800">
                              {menu.name}
                            </span>
                            <span className="mt-1 block text-[11px] font-semibold text-slate-400">
                              {(memberMap[menu.id] || []).length} platos ·{" "}
                              {rules.length}{" "}
                              {rules.length === 1 ? "regla" : "reglas"}
                            </span>
                          </span>
                        </button>

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Horario principal
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-slate-700">
                            <Clock3 size={13} className="text-slate-400" />
                            {firstRule
                              ? `${formatTime(
                                  firstRule.start_time
                                )} – ${formatTime(firstRule.end_time)}`
                              : "Sin horario"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Días activos
                          </p>
                          <div className="mt-1.5 flex gap-1">
                            {WEEKDAY_LABELS.map((label, day) => (
                              <span
                                key={`${menu.id}-${day}`}
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black ${
                                  activeDays.includes(day)
                                    ? "bg-[#071B35] text-white"
                                    : "bg-slate-100 text-slate-300"
                                }`}
                              >
                                {label.slice(0, 1)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleMenu(menu)}
                            className={`rounded-full px-3 py-1.5 text-[10px] font-black ${
                              menu.is_active
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {menu.is_active ? "Activo" : "Inactivo"}
                          </button>
                          <button
                            onClick={() => addRule(menu)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                          >
                            + Regla
                          </button>
                          <button
                            onClick={() => removeMenu(menu)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:border-red-100 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {rules.map((rule, ruleIndex) => (
                          <div
                            key={rule.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
                          >
                            <div className="grid gap-3 lg:grid-cols-[1.25fr_1fr_1fr_auto]">
                              <div>
                                <p className="mb-1 text-[10px] font-black uppercase text-slate-400">
                                  {ruleIndex === 0
                                    ? "Nombre de la regla"
                                    : `Regla ${ruleIndex + 1}`}
                                </p>
                                <input
                                  value={rule.label || ""}
                                  onChange={(e) =>
                                    updateRuleLocal(menu.id, rule.id, {
                                      label: e.target.value,
                                    })
                                  }
                                  placeholder="Ej: Lunes a viernes"
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-300"
                                />
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {WEEKDAY_LABELS.map((label, day) => {
                                    const selected =
                                      rule.weekdays.includes(day);
                                    return (
                                      <button
                                        key={label}
                                        onClick={() =>
                                          updateRuleLocal(
                                            menu.id,
                                            rule.id,
                                            {
                                              weekdays: selected
                                                ? rule.weekdays.filter(
                                                    (d) => d !== day
                                                  )
                                                : [
                                                    ...rule.weekdays,
                                                    day,
                                                  ].sort(),
                                            }
                                          )
                                        }
                                        className={`h-7 w-7 rounded-full text-[9px] font-black transition ${
                                          selected
                                            ? "bg-[#071B35] text-white"
                                            : "bg-white text-slate-400 ring-1 ring-slate-200"
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
                                  value={
                                    rule.start_time?.slice(0, 5) || ""
                                  }
                                  onChange={(e) =>
                                    updateRuleLocal(menu.id, rule.id, {
                                      start_time:
                                        e.target.value || null,
                                    })
                                  }
                                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-300"
                                />
                              </label>

                              <label className="text-[10px] font-black uppercase text-slate-400">
                                Hasta
                                <input
                                  type="time"
                                  value={rule.end_time?.slice(0, 5) || ""}
                                  onChange={(e) =>
                                    updateRuleLocal(menu.id, rule.id, {
                                      end_time: e.target.value || null,
                                    })
                                  }
                                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-300"
                                />
                              </label>

                              <div className="flex items-end justify-end gap-2">
                                <button
                                  onClick={() => saveRule(rule)}
                                  disabled={busyId === rule.id}
                                  className="rounded-xl bg-[#071B35] px-3 py-2.5 text-xs font-black text-white disabled:opacity-50"
                                >
                                  {busyId === rule.id
                                    ? "Guardando..."
                                    : "Guardar"}
                                </button>
                                <button
                                  onClick={() => deleteRule(rule.id)}
                                  className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {rules.length === 0 && (
                          <button
                            onClick={() => addRule(menu)}
                            className="w-full rounded-2xl border-2 border-dashed border-slate-200 p-4 text-xs font-bold text-slate-400 hover:border-orange-200 hover:text-orange-600"
                          >
                            + Agregar primera regla horaria
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {tab === "platos" && (
          <section className="mt-5">
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {menus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => setActiveMenuId(menu.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${
                    activeMenuId === menu.id
                      ? "bg-[#071B35] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {menu.name}
                </button>
              ))}
            </div>

            {!activeMenu ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-slate-400">
                Selecciona un menú.
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-black text-[#071B35]">
                    Platillos del menú —{" "}
                    <span className="text-orange-600">
                      {activeMenu.name}
                    </span>
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Elige qué platillos estarán disponibles en este menú.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.04)]">
                    <div className="border-b border-slate-100 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black text-[#071B35]">
                            Catálogo de platillos
                          </h3>
                          <p className="text-[11px] font-semibold text-slate-400">
                            {catalogItems.length} disponibles para agregar
                          </p>
                        </div>
                      </div>

                      <label className="relative mt-3 block">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          value={catalogSearch}
                          onChange={(e) =>
                            setCatalogSearch(e.target.value)
                          }
                          placeholder="Buscar platillo..."
                          className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:border-orange-300"
                        />
                      </label>
                    </div>

                    <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto p-2">
                      {filteredCatalog.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50"
                        >
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-800">
                              {item.name}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-400">
                              ${item.price.toFixed(2)}
                            </p>
                          </div>

                          <button
                            onClick={() => addDish(item)}
                            disabled={busyId === item.id}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#071B35] text-white disabled:opacity-40"
                            title="Agregar al menú"
                          >
                            {busyId === item.id ? (
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />
                            ) : (
                              <Plus size={14} />
                            )}
                          </button>
                        </div>
                      ))}

                      {filteredCatalog.length === 0 && (
                        <div className="p-8 text-center text-xs font-semibold text-slate-400">
                          No hay platillos para mostrar.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.04)]">
                    <div className="border-b border-slate-100 p-4">
                      <div>
                        <h3 className="font-black text-[#071B35]">
                          En este menú{" "}
                          <span className="text-slate-400">
                            ({assignedItems.length})
                          </span>
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-400">
                          Platillos visibles cuando este menú esté activo.
                        </p>
                      </div>

                      <label className="relative mt-3 block">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          value={assignedSearch}
                          onChange={(e) =>
                            setAssignedSearch(e.target.value)
                          }
                          placeholder="Buscar en este menú..."
                          className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:border-orange-300"
                        />
                      </label>
                    </div>

                    <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto p-2">
                      {filteredAssigned.map((item) => {
                        const draft =
                          draftQty[item.id] ??
                          String(todayQuota[item.id] ?? "");

                        return (
                          <div
                            key={item.id}
                            className="rounded-xl px-2 py-2.5 hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-black text-slate-800">
                                  {item.name}
                                </p>
                                <p className="mt-0.5 text-xs font-semibold text-slate-400">
                                  ${item.price.toFixed(2)}
                                </p>
                              </div>

                              <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-600 sm:inline-flex">
                                En menú
                              </span>

                              <button
                                onClick={() => removeDish(item)}
                                disabled={busyId === item.id}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                title="Quitar del menú"
                              >
                                {busyId === item.id ? (
                                  <Loader2
                                    size={13}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2 size={13} />
                                )}
                              </button>
                            </div>

                            {item.daily_stock_enabled && (
                              <div className="ml-14 mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-orange-50/60 px-3 py-2">
                                <span className="text-[10px] font-black uppercase text-orange-600">
                                  Cupo hoy
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  value={draft}
                                  onChange={(e) =>
                                    setDraftQty((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                  className="w-20 rounded-lg border border-orange-100 bg-white px-2 py-1 text-xs font-bold outline-none"
                                />
                                <button
                                  onClick={() => saveQuota(item)}
                                  className="rounded-lg bg-[#071B35] px-2.5 py-1 text-[10px] font-black text-white"
                                >
                                  Guardar
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {filteredAssigned.length === 0 && (
                        <div className="p-8 text-center text-xs font-semibold text-slate-400">
                          Este menú todavía no tiene platillos.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3 text-xs font-semibold text-orange-800">
                  <strong>Consejo:</strong> usa el catálogo de la izquierda
                  para agregar rápidamente los platillos que formarán parte
                  de {activeMenu.name}.
                </div>
              </>
            )}
          </section>
        )}

        {tab === "excepciones" && (
          <section className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Excepciones de hoy
                </h2>
                <p className="text-xs font-semibold text-slate-400">
                  {today} · Solo afectan este día.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {menus.map((menu) => (
                  <button
                    key={menu.id}
                    onClick={() => setActiveMenuId(menu.id)}
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      activeMenuId === menu.id
                        ? "bg-[#071B35] text-white"
                        : "bg-white text-slate-500"
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
                  <h3 className="text-sm font-black text-red-600">
                    Ocultar hoy
                  </h3>
                  <div className="mt-3 space-y-2">
                    {assignedItems.map((item) => {
                      const hidden =
                        overrideMap.get(item.id) === false;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-800">
                              {item.name}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              hidden
                                ? clearOverride(item)
                                : setOverride(item, false)
                            }
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-black ${
                              hidden
                                ? "bg-red-100 text-red-700"
                                : "bg-white text-slate-500"
                            }`}
                          >
                            <EyeOff size={12} />{" "}
                            {hidden ? "Oculto hoy ✓" : "Ocultar hoy"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-black text-emerald-600">
                    Disponible solo hoy
                  </h3>
                  <div className="mt-3 space-y-2">
                    {catalogItems.map((item) => {
                      const onlyToday =
                        overrideMap.get(item.id) === true;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-800">
                              {item.name}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              onlyToday
                                ? clearOverride(item)
                                : setOverride(item, true)
                            }
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-black ${
                              onlyToday
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-white text-slate-500"
                            }`}
                          >
                            <Sparkles size={12} />{" "}
                            {onlyToday ? "Solo hoy ✓" : "Solo hoy"}
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
            <MenuAdminPreview
              menus={menus}
              memberMap={memberMap}
              items={items}
              timeZone={timeZone}
            />
          </div>
        )}

        {tab === "calendario" && (
          <div className="mt-6">
            <WeeklyMenuCalendar
              storeId={activeStore.id}
              menus={menus}
              items={items}
              memberMap={memberMap}
              today={today}
            />
          </div>
        )}

        {tab === "config" && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-900">
              Configuración
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              La zona horaria define qué significa “hoy” y cuándo se activa
              cada menú.
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

              <button
                onClick={saveTimeZone}
                className="mt-3 rounded-xl bg-[#071B35] px-4 py-2 text-sm font-bold text-white"
              >
                Guardar zona horaria
              </button>

              <p className="mt-3 text-xs font-semibold text-slate-400">
                Actual: {timeZone} · Hoy: {today}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
