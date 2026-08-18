"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  EyeOff,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  clearDailyMenuItemOverride,
  getDailyMenuOverrides,
  setDailyMenuItemOverride,
} from "@/lib/services/menu-daily-menus";
import type {
  DailyMenu,
  DailyMenuItemOverride,
  EligibleDailyMenuItem,
} from "@/lib/menu/types";

type Props = {
  storeId: string;
  menus: DailyMenu[];
  items: EligibleDailyMenuItem[];
  memberMap: Record<string, string[]>;
  today: string;
};

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function isoLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromIso(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function timeLabel(value?: string | null) {
  if (!value) return "";
  const [hh, mm] = value.slice(0, 5).split(":").map(Number);
  const suffix = hh >= 12 ? "PM" : "AM";
  return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

function menusForDate(menus: DailyMenu[], date: Date) {
  const weekday = date.getDay();
  return menus.filter(
    (menu) =>
      menu.is_active &&
      (menu.menu_daily_menu_schedules || []).some(
        (rule) => rule.is_active && rule.weekdays.includes(weekday)
      )
  );
}

export default function WeeklyMenuCalendar({
  storeId,
  menus,
  items,
  memberMap,
  today,
}: Props) {
  const todayDate = dateFromIso(today);
  const [cursor, setCursor] = useState(
    new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<DailyMenuItemOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [cursor]);

  const selectedDateObject = dateFromIso(selectedDate);
  const scheduledMenus = menusForDate(menus, selectedDateObject);
  const selectedMenu =
    menus.find((menu) => menu.id === selectedMenuId) ||
    scheduledMenus[0] ||
    null;

  useEffect(() => {
    if (!selectedMenuId || !scheduledMenus.some((m) => m.id === selectedMenuId)) {
      setSelectedMenuId(scheduledMenus[0]?.id || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, menus]);

  useEffect(() => {
    if (!selectedMenu?.id) {
      setOverrides([]);
      return;
    }
    setLoadingOverrides(true);
    getDailyMenuOverrides(storeId, selectedMenu.id, selectedDate).then(({ data }) => {
      setOverrides(data);
      setLoadingOverrides(false);
    });
  }, [storeId, selectedMenu?.id, selectedDate]);

  const memberIds = selectedMenu ? memberMap[selectedMenu.id] || [] : [];
  const overrideMap = new Map(overrides.map((o) => [o.menu_item_id, o.is_included]));

  const effectiveAssigned = items.filter((item) => {
    const normal = memberIds.includes(item.id);
    const override = overrideMap.get(item.id);
    return override === undefined ? normal : override;
  });

  const outsideItems = items.filter((item) => !effectiveAssigned.some((x) => x.id === item.id));
  const q = search.trim().toLowerCase();
  const filteredAssigned = effectiveAssigned.filter((item) =>
    item.name.toLowerCase().includes(q)
  );
  const filteredOutside = outsideItems.filter((item) =>
    item.name.toLowerCase().includes(q)
  );

  const changeCount = overrides.length;

  const setOverride = async (item: EligibleDailyMenuItem, included: boolean) => {
    if (!selectedMenu) return;
    setBusyId(item.id);
    const { error } = await setDailyMenuItemOverride({
      storeId,
      dailyMenuId: selectedMenu.id,
      menuItemId: item.id,
      date: selectedDate,
      isIncluded: included,
    });
    setBusyId(null);
    if (error) return alert("No se pudo guardar el cambio de este día.");
    setOverrides((prev) => [
      ...prev.filter((o) => o.menu_item_id !== item.id),
      {
        daily_menu_id: selectedMenu.id,
        menu_item_id: item.id,
        override_date: selectedDate,
        is_included: included,
      },
    ]);
  };

  const restore = async (item: EligibleDailyMenuItem) => {
    if (!selectedMenu) return;
    setBusyId(item.id);
    const { error } = await clearDailyMenuItemOverride(
      selectedMenu.id,
      item.id,
      selectedDate
    );
    setBusyId(null);
    if (error) return alert("No se pudo restaurar el plato.");
    setOverrides((prev) => prev.filter((o) => o.menu_item_id !== item.id));
  };

  const goToday = () => {
    setCursor(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
    setSelectedDate(today);
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.05)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
            <CalendarDays size={21} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#071B35]">Calendario del restaurante</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              Consulta cada fecha y modifica sus platos sin alterar el menú habitual.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={goToday} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
            Hoy
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft size={17} />
          </button>
          <p className="min-w-[145px] text-center text-sm font-black capitalize text-[#071B35]">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </p>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.45fr)_390px]">
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((day) => (
              <div key={day} className="px-1 py-2 text-center text-[10px] font-black uppercase tracking-wide text-slate-400">
                {day}
              </div>
            ))}

            {cells.map((date) => {
              const iso = isoLocal(date);
              const isCurrentMonth = date.getMonth() === cursor.getMonth();
              const isToday = iso === today;
              const selected = iso === selectedDate;
              const dayMenus = menusForDate(menus, date);

              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDate(iso)}
                  className={`min-h-[112px] rounded-2xl border p-2 text-left transition ${
                    selected
                      ? "border-orange-300 bg-orange-50/60 shadow-sm ring-2 ring-orange-100"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                  } ${!isCurrentMonth ? "opacity-40" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                        isToday
                          ? "bg-[#FF641F] text-white"
                          : selected
                          ? "bg-[#071B35] text-white"
                          : "text-slate-600"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {isToday && <span className="text-[8px] font-black uppercase text-orange-600">Hoy</span>}
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayMenus.slice(0, 3).map((menu, index) => {
                      const rule = (menu.menu_daily_menu_schedules || []).find(
                        (r) => r.is_active && r.weekdays.includes(date.getDay())
                      );
                      return (
                        <div
                          key={menu.id}
                          className={`truncate rounded-lg px-2 py-1.5 text-[9px] font-black ${
                            index % 3 === 0
                              ? "bg-violet-50 text-violet-700"
                              : index % 3 === 1
                              ? "bg-orange-50 text-orange-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {menu.name}
                          {rule?.start_time && (
                            <span className="ml-1 font-semibold opacity-60">
                              {timeLabel(rule.start_time)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {dayMenus.length === 0 && isCurrentMonth && (
                      <p className="pt-2 text-center text-[9px] font-semibold text-slate-300">Sin menú</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="border-t border-slate-100 bg-slate-50/60 p-4 lg:border-l lg:border-t-0 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-orange-600">
                Día seleccionado
              </p>
              <h3 className="mt-1 text-lg font-black capitalize text-[#071B35]">
                {new Intl.DateTimeFormat("es", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(selectedDateObject)}
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {scheduledMenus.length} {scheduledMenus.length === 1 ? "menú programado" : "menús programados"}
                {changeCount > 0 ? ` · ${changeCount} cambios manuales` : ""}
              </p>
            </div>
          </div>

          {scheduledMenus.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
              <CalendarDays size={25} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-black text-slate-700">No hay un menú recurrente este día</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                Para crear un menú completamente nuevo solo para una fecha necesitamos una regla de fecha única. Esta vista ya queda preparada para incorporarla sin confundirla con los horarios semanales.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {scheduledMenus.map((menu) => (
                  <button
                    key={menu.id}
                    onClick={() => setSelectedMenuId(menu.id)}
                    className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-black ${
                      selectedMenu?.id === menu.id
                        ? "bg-[#071B35] text-white"
                        : "border border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {menu.name}
                  </button>
                ))}
              </div>

              {selectedMenu && (
                <>
                  <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-800">{selectedMenu.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                          <Clock3 size={11} />
                          {(selectedMenu.menu_daily_menu_schedules || [])
                            .filter((r) => r.is_active && r.weekdays.includes(selectedDateObject.getDay()))
                            .map((r) => `${timeLabel(r.start_time)} – ${timeLabel(r.end_time)}`)
                            .join(" · ")}
                        </p>
                      </div>
                      {changeCount > 0 && (
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[9px] font-black text-orange-600">
                          {changeCount} cambios
                        </span>
                      )}
                    </div>
                  </div>

                  <label className="relative mt-3 block">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar plato..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:border-orange-300"
                    />
                  </label>

                  {loadingOverrides ? (
                    <div className="flex justify-center py-10">
                      <Loader2 size={20} className="animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <div className="mt-4 max-h-[490px] space-y-4 overflow-y-auto pr-1">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Platos de este día ({filteredAssigned.length})
                          </p>
                        </div>
                        <div className="space-y-2">
                          {filteredAssigned.map((item) => {
                            const hasOverride = overrideMap.has(item.id);
                            const normallyMember = memberIds.includes(item.id);
                            return (
                              <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white p-2.5 ring-1 ring-slate-100">
                                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                  {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-black text-slate-700">{item.name}</p>
                                  <p className="text-[10px] font-semibold text-slate-400">${item.price.toFixed(2)}</p>
                                </div>
                                {hasOverride && !normallyMember ? (
                                  <button
                                    onClick={() => restore(item)}
                                    disabled={busyId === item.id}
                                    className="rounded-lg bg-violet-50 px-2 py-1.5 text-[9px] font-black text-violet-600"
                                  >
                                    <RotateCcw size={11} className="inline mr-1" /> Restaurar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setOverride(item, false)}
                                    disabled={busyId === item.id}
                                    className="rounded-lg bg-red-50 px-2 py-1.5 text-[9px] font-black text-red-600"
                                  >
                                    <EyeOff size={11} className="inline mr-1" /> Ocultar
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                          Agregar solo este día
                        </p>
                        <div className="space-y-2">
                          {filteredOutside.map((item) => {
                            const explicitlyHidden = overrideMap.get(item.id) === false;
                            const normallyMember = memberIds.includes(item.id);
                            return (
                              <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white p-2.5 ring-1 ring-slate-100">
                                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                  {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-black text-slate-700">{item.name}</p>
                                  <p className="text-[10px] font-semibold text-slate-400">${item.price.toFixed(2)}</p>
                                </div>
                                {explicitlyHidden && normallyMember ? (
                                  <button
                                    onClick={() => restore(item)}
                                    disabled={busyId === item.id}
                                    className="rounded-lg bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-600"
                                  >
                                    <RotateCcw size={11} className="inline mr-1" /> Restaurar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setOverride(item, true)}
                                    disabled={busyId === item.id}
                                    className="rounded-lg bg-emerald-50 px-2 py-1.5 text-[9px] font-black text-emerald-600"
                                  >
                                    <Plus size={11} className="inline mr-1" /> Solo este día
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/70 p-3">
                    <div className="flex gap-2">
                      <Sparkles size={15} className="mt-0.5 shrink-0 text-orange-600" />
                      <p className="text-[10px] font-semibold leading-4 text-orange-800">
                        Los cambios hechos aquí afectan únicamente el <strong>{selectedDate}</strong>. El menú recurrente y sus platos habituales permanecen intactos.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
