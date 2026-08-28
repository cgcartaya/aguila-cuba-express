"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  PauseCircle,
  PlayCircle,
  Save,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
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

type Props = { storeId: string };

const REASONS = [
  "No apto para transportar",
  "Falta de envases",
  "Debe consumirse recién preparado",
];

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
  const [restaurantOnlyItem, setRestaurantOnlyItem] = useState<OperationMenuItem | null>(null);
  const [reason, setReason] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  const setUnavailable = async (item: OperationMenuItem, unavailable: boolean) => {
    if (item.manual_unavailable === unavailable) return;
    setBusyId(item.id);
    const { error } = await setMenuItemManualUnavailable(item.id, unavailable);
    setBusyId(null);
    if (error) return alert("No se pudo cambiar la disponibilidad.");
    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id ? { ...current, manual_unavailable: unavailable } : current
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

  const applyRestaurantOnly = async (
    item: OperationMenuItem,
    paused: boolean,
    selectedReason?: string
  ) => {
    setBusyId(`delivery-${item.id}`);
    const { data, error } = await setMenuItemDeliveryPausedToday(
      storeId,
      item.id,
      paused,
      selectedReason
    );
    setBusyId(null);
    if (error || !data) return alert("No se pudo cambiar la disponibilidad del plato.");
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
    setRestaurantOnlyItem(null);
    setReason("");
  };

  const makeAvailable = async (item: OperationMenuItem) => {
    if (item.manual_unavailable) await setUnavailable(item, false);
    if (item.delivery_paused_date) await applyRestaurantOnly(item, false);
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
              {settings.menu_orders_paused ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900">Pedidos en línea</h2>
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
                setSettings((prev) => ({ ...prev, menu_pause_message: e.target.value }))
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
                    menu_estimated_prep_minutes: Math.max(0, Number(e.target.value) || 0),
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
          {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar operación
        </button>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={19} className="text-violet-600" />
                <h2 className="text-lg font-black text-slate-900">Disponibilidad rápida</h2>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Controla al instante qué platos están disponibles para pedidos o solo para consumo en el restaurante.
              </p>
            </div>
            <div className="relative w-full lg:w-72">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar plato..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-50"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm"><ShoppingCart size={18} /></span>
                <div><p className="text-sm font-black text-emerald-800">Disponible para pedidos</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-600">Disponible para delivery y recogida.</p></div>
              </div>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-orange-600 shadow-sm"><UtensilsCrossed size={18} /></span>
                <div><p className="text-sm font-black text-orange-800">Solo en restaurante hoy</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-600">Visible en el menú, pero no se puede pedir online.</p></div>
              </div>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-red-600 shadow-sm"><Ban size={18} /></span>
                <div><p className="text-sm font-black text-red-800">Agotado / No disponible</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-600">No se puede pedir online hasta volver a habilitarlo.</p></div>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden grid-cols-[minmax(220px,1.2fr)_minmax(190px,.8fr)_minmax(390px,1.2fr)_48px] gap-4 border-y border-slate-100 bg-slate-50/80 px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 lg:grid">
          <span>Plato</span><span>Estado actual</span><span>Acciones rápidas</span><span />
        </div>

        <div className="divide-y divide-slate-100 px-4 sm:px-6">
          {filteredItems.map((item) => {
            const isSoldOut = item.manual_unavailable || (item.stock !== null && item.stock <= 0);
            const isRestaurantOnly = !isSoldOut && Boolean(item.delivery_paused_date);
            const statusLabel = isSoldOut
              ? "Agotado / No disponible"
              : isRestaurantOnly
                ? "Solo en restaurante hoy"
                : "Disponible para pedidos";
            const hasDetails = item.groups.some((group) => group.options.length > 0);

            return (
              <article key={item.id} className="py-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(220px,1.2fr)_minmax(190px,.8fr)_minmax(390px,1.2fr)_48px] lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 object-cover" />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><UtensilsCrossed size={19} /></span>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-slate-900">{item.name}</h3>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {item.daily_stock_enabled
                          ? "Usa cupo diario"
                          : item.stock !== null
                            ? `Stock: ${item.stock}`
                            : "Sin límite de inventario"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black ${isSoldOut ? "bg-red-50 text-red-700" : isRestaurantOnly ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"}`}>
                      <span className={`h-2 w-2 rounded-full ${isSoldOut ? "bg-red-500" : isRestaurantOnly ? "bg-orange-500" : "bg-emerald-500"}`} />
                      {statusLabel}
                    </span>
                    <p className="mt-1.5 text-[10px] font-semibold text-slate-500">
                      {isSoldOut
                        ? "No disponible para pedidos"
                        : isRestaurantOnly
                          ? item.delivery_pause_reason || "No disponible para pedidos online"
                          : "Delivery y recogida"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                      onClick={() => void makeAvailable(item)}
                      disabled={busyId === item.id || busyId === `delivery-${item.id}` || (!item.manual_unavailable && !item.delivery_paused_date)}
                      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-[10px] font-black transition ${!isSoldOut && !isRestaurantOnly ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"} disabled:cursor-default disabled:opacity-100`}
                    >
                      <ShoppingCart size={13} /> Disponible
                    </button>
                    <button
                      onClick={() => {
                        if (item.delivery_paused_date) void applyRestaurantOnly(item, false);
                        else {
                          setRestaurantOnlyItem(item);
                          setReason("");
                        }
                      }}
                      disabled={busyId === `delivery-${item.id}` || isSoldOut}
                      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-[10px] font-black transition ${isRestaurantOnly ? "border-orange-300 bg-orange-50 text-orange-700" : "border-orange-200 bg-white text-orange-700 hover:bg-orange-50"} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <UtensilsCrossed size={13} /> Solo en restaurante
                    </button>
                    <button
                      onClick={() => void setUnavailable(item, !item.manual_unavailable)}
                      disabled={busyId === item.id || (item.stock !== null && item.stock <= 0)}
                      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-[10px] font-black transition ${isSoldOut ? "border-red-300 bg-red-50 text-red-700" : "border-red-200 bg-white text-red-700 hover:bg-red-50"} disabled:cursor-not-allowed`}
                    >
                      <Ban size={13} /> Agotado
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => hasDetails && setExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                    disabled={!hasDetails}
                    title={hasDetails ? "Ver modificadores" : "Sin modificadores"}
                    className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-25 lg:inline-flex"
                  >
                    {expanded[item.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {hasDetails && (
                  <button type="button" onClick={() => setExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }))} className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-slate-500 lg:hidden">
                    {expanded[item.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Modificadores
                  </button>
                )}

                {expanded[item.id] && hasDetails && (
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Disponibilidad de modificadores</p>
                    <div className="space-y-3">
                      {item.groups.map((group) =>
                        group.options.length === 0 ? null : (
                          <div key={group.id}>
                            <p className="text-[10px] font-black uppercase text-slate-500">{group.name}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {group.options.map((option) => (
                                <button
                                  key={option.id}
                                  onClick={() => toggleOption(item.id, group.id, option.id, option.is_available)}
                                  disabled={busyId === option.id}
                                  className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${option.is_available ? "border-emerald-200 bg-white text-emerald-700" : "border-red-200 bg-red-50 text-red-600 line-through"}`}
                                >
                                  {option.label}{option.price_delta > 0 ? ` +$${option.price_delta.toFixed(2)}` : ""}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="py-12 text-center text-sm font-semibold text-slate-400">No encontramos platos con esa búsqueda.</div>
          )}
        </div>
      </section>

      {restaurantOnlyItem && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Solo disponible en el restaurante</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  {restaurantOnlyItem.name} seguirá visible en el menú, pero hoy no podrá agregarse a pedidos para recoger ni delivery.
                </p>
              </div>
              <button onClick={() => setRestaurantOnlyItem(null)} className="rounded-full bg-slate-100 p-2 text-slate-500"><X size={16} /></button>
            </div>
            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Motivo opcional</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {REASONS.map((value) => (
                  <button key={value} type="button" onClick={() => setReason(value)} className={`rounded-full border px-3 py-2 text-[10px] font-black ${reason === value ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600"}`}>{value}</button>
                ))}
              </div>
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={160} placeholder="Otro motivo (opcional)" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-orange-300" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setRestaurantOnlyItem(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600">Cancelar</button>
              <button onClick={() => void applyRestaurantOnly(restaurantOnlyItem, true, reason)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white">Aplicar por hoy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
