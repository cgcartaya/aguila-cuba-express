"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Clock3,
  Loader2,
  PauseCircle,
  PlayCircle,
  Save,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import {
  getMenuOperationSettings,
  getOperationMenuItems,
  saveMenuOperationSettings,
  setMenuItemManualUnavailable,
  setMenuItemDeliveryPausedToday,
  setMenuOptionAvailability,
  type MenuOperationSettings,
  type OperationMenuItem,
} from "@/lib/services/menu-operation";

type Props = {
  storeId: string;
};

export default function MenuOperationPanel({ storeId }: Props) {
  const [settings, setSettings] = useState<MenuOperationSettings>({
    menu_orders_paused: false,
    menu_pause_message: null,
    menu_estimated_prep_minutes: 25,
  });
  const [items, setItems] = useState<OperationMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const [settingsResult, itemsResult] = await Promise.all([
      getMenuOperationSettings(storeId),
      getOperationMenuItems(storeId),
    ]);
    setSettings(settingsResult.data);
    setItems(itemsResult.data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.name} ${item.groups.map((g) => g.name).join(" ")}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  const saveSettings = async () => {
    setSavingSettings(true);
    const { error } = await saveMenuOperationSettings(storeId, settings);
    setSavingSettings(false);
    if (error) alert("No se pudo guardar la configuración.");
  };

  const toggleItem = async (item: OperationMenuItem) => {
    setBusyId(item.id);
    const next = !item.manual_unavailable;
    const { error } = await setMenuItemManualUnavailable(item.id, next);
    setBusyId(null);
    if (error) return alert("No se pudo cambiar la disponibilidad.");

    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id
          ? { ...current, manual_unavailable: next }
          : current
      )
    );
  };

  const toggleOption = async (
    itemId: string,
    groupId: string,
    optionId: string,
    current: boolean
  ) => {
    setBusyId(optionId);
    const { error } = await setMenuOptionAvailability(optionId, !current);
    setBusyId(null);
    if (error) return alert("No se pudo cambiar la opción.");

    setItems((prev) =>
      prev.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              groups: item.groups.map((group) =>
                group.id !== groupId
                  ? group
                  : {
                      ...group,
                      options: group.options.map((option) =>
                        option.id === optionId
                          ? { ...option, is_available: !current }
                          : option
                      ),
                    }
              ),
            }
      )
    );
  };

  const toggleDeliveryToday = async (item: OperationMenuItem) => {
    const paused = Boolean(item.delivery_paused_date);
    const reason = paused
      ? undefined
      : prompt(
          "Motivo para pausar el delivery de este plato hoy:",
          "Sin envases disponibles"
        ) || undefined;

    if (!paused && !reason) return;

    setBusyId(`delivery-${item.id}`);
    const { data, error } = await setMenuItemDeliveryPausedToday(
      storeId,
      item.id,
      !paused,
      reason
    );
    setBusyId(null);
    if (error || !data) return alert("No se pudo cambiar el delivery del plato.");

    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id
          ? {
              ...current,
              delivery_paused_date: data.delivery_paused_date,
              delivery_pause_reason: data.delivery_pause_reason,
            }
          : current
      )
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section
        className={`rounded-3xl border p-5 ${
          settings.menu_orders_paused
            ? "border-red-200 bg-red-50"
            : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full ${
                settings.menu_orders_paused
                  ? "bg-red-100 text-red-600"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {settings.menu_orders_paused ? (
                <PauseCircle size={20} />
              ) : (
                <PlayCircle size={20} />
              )}
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Pedidos en línea
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {settings.menu_orders_paused
                  ? "Los clientes pueden ver la carta, pero no completar pedidos."
                  : "El restaurante está aceptando pedidos."}
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                menu_orders_paused: !prev.menu_orders_paused,
              }))
            }
            className={`rounded-xl px-4 py-2 text-xs font-black text-white ${
              settings.menu_orders_paused ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {settings.menu_orders_paused ? "Reanudar pedidos" : "Pausar pedidos"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="text-[10px] font-black uppercase text-slate-500">
            Mensaje cuando están pausados
            <input
              value={settings.menu_pause_message || ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  menu_pause_message: e.target.value,
                }))
              }
              placeholder="Ej: Cocina saturada. Volvemos en 30 minutos."
              className="mt-1 w-full rounded-xl border border-white bg-white px-3 py-2 text-sm font-semibold normal-case outline-none"
            />
          </label>

          <label className="text-[10px] font-black uppercase text-slate-500">
            Tiempo estimado de preparación
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-white px-3 py-2">
              <Clock3 size={15} className="text-slate-400" />
              <input
                type="number"
                min={0}
                max={240}
                value={settings.menu_estimated_prep_minutes}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    menu_estimated_prep_minutes: Math.max(
                      0,
                      Number(e.target.value) || 0
                    ),
                  }))
                }
                className="w-20 text-sm font-black outline-none"
              />
              <span className="text-xs font-bold text-slate-400">minutos</span>
            </div>
          </label>
        </div>

        <button
          onClick={saveSettings}
          disabled={savingSettings}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          {savingSettings ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Guardar operación
        </button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={17} className="text-violet-600" />
              <h2 className="text-base font-black text-slate-900">
                Disponibilidad rápida
              </h2>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Agota un plato o una opción sin modificar su configuración permanente.
            </p>
          </div>

          <div className="relative min-w-[220px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar plato..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-semibold outline-none"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className={`rounded-2xl border p-4 ${
                item.manual_unavailable
                  ? "border-red-100 bg-red-50/40"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{item.name}</h3>
                  <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">
                    {item.daily_stock_enabled
                      ? "Usa cupo diario"
                      : item.stock !== null
                      ? `Stock: ${item.stock}`
                      : "Sin límite de inventario"}
                  </p>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {item.available_delivery && (
                    <button
                      onClick={() => toggleDeliveryToday(item)}
                      disabled={busyId === `delivery-${item.id}`}
                      title={item.delivery_pause_reason || undefined}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black ${
                        item.delivery_paused_date
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      <PauseCircle size={12} />
                      {item.delivery_paused_date
                        ? "Delivery pausado hoy"
                        : "Pausar delivery hoy"}
                    </button>
                  )}
                  <button
                    onClick={() => toggleItem(item)}
                    disabled={busyId === item.id}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black ${
                      item.manual_unavailable
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {item.manual_unavailable ? (
                      <Ban size={12} />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    {item.manual_unavailable ? "Agotado manualmente" : "Disponible"}
                  </button>
                </div>
              </div>

              {item.delivery_paused_date && item.delivery_pause_reason && (
                <p className="mt-2 rounded-xl bg-orange-50 px-3 py-2 text-[10px] font-bold text-orange-700">
                  Delivery: {item.delivery_pause_reason}
                </p>
              )}

              {item.groups.some((g) => g.options.length > 0) && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                  {item.groups.map((group) =>
                    group.options.length === 0 ? null : (
                      <div key={group.id}>
                        <p className="text-[10px] font-black uppercase text-slate-400">
                          {group.name}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.options.map((option) => (
                            <button
                              key={option.id}
                              onClick={() =>
                                toggleOption(
                                  item.id,
                                  group.id,
                                  option.id,
                                  option.is_available
                                )
                              }
                              disabled={busyId === option.id}
                              className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${
                                option.is_available
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-red-200 bg-red-50 text-red-600 line-through"
                              }`}
                            >
                              {option.label}
                              {option.price_delta > 0
                                ? ` +$${option.price_delta.toFixed(2)}`
                                : ""}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
