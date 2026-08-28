"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, RefreshCw, Save } from "lucide-react";

import { getStoreSettings, saveStoreSettings } from "@/lib/services/settings";
import { supabase } from "@/lib/supabase";

type Props = {
  storeId: string;
};

type CurrencyState = {
  enabled: boolean;
  rate: string;
  source: "manual" | "eltoque";
  updatedAt: string | null;
};

const EMPTY_STATE: CurrencyState = {
  enabled: false,
  rate: "",
  source: "manual",
  updatedAt: null,
};

export default function MenuCurrencySettings({ storeId }: Props) {
  const [state, setState] = useState<CurrencyState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const numericRate = useMemo(() => Number(state.rate.replace(",", ".")), [state.rate]);
  const validRate = Number.isFinite(numericRate) && numericRate > 0;

  const reload = async () => {
    const { data, error } = await getStoreSettings(storeId);
    if (error) throw error;
    setState({
      enabled: data?.menu_show_usd_equivalent === true,
      rate: data?.menu_cup_per_usd ? String(data.menu_cup_per_usd) : "",
      source: data?.menu_exchange_rate_source === "eltoque" ? "eltoque" : "manual",
      updatedAt: data?.menu_exchange_rate_updated_at || null,
    });
  };

  useEffect(() => {
    let active = true;
    setLoading(true);

    getStoreSettings(storeId)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setMessage("No se pudo cargar la configuración de moneda.");
          return;
        }
        setState({
          enabled: data?.menu_show_usd_equivalent === true,
          rate: data?.menu_cup_per_usd ? String(data.menu_cup_per_usd) : "",
          source: data?.menu_exchange_rate_source === "eltoque" ? "eltoque" : "manual",
          updatedAt: data?.menu_exchange_rate_updated_at || null,
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [storeId]);

  const refreshElToque = async () => {
    setRefreshing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("No hay una sesión válida para actualizar la tasa.");

      const response = await fetch("/api/admin/menu/eltoque-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storeId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No se pudo actualizar desde elTOQUE.");

      await reload();
      setMessage(`Tasa actualizada desde elTOQUE: 1 USD = ${data.rate} CUP.`);
      return true;
    } catch (error) {
      setMessage(
        `${error instanceof Error ? error.message : "No se pudo actualizar desde elTOQUE."} Se conserva la última tasa válida.`
      );
      return false;
    } finally {
      setRefreshing(false);
    }
  };

  const save = async () => {
    if (state.source === "manual" && state.enabled && !validRate) {
      setMessage("Escribe una tasa válida, por ejemplo 420.");
      return;
    }

    setSaving(true);
    setMessage(null);
    const now = new Date().toISOString();

    const { error } = await saveStoreSettings(
      {
        menu_show_usd_equivalent: state.enabled,
        menu_cup_per_usd: state.source === "manual" ? (validRate ? numericRate : null) : undefined,
        menu_exchange_rate_source: state.source,
        menu_exchange_rate_updated_at:
          state.source === "manual" ? (validRate ? now : null) : undefined,
      },
      storeId
    );

    if (error) {
      setMessage("No se pudo guardar la tasa de cambio.");
      setSaving(false);
      return;
    }

    if (state.source === "manual") {
      setState((current) => ({ ...current, updatedAt: validRate ? now : null }));
      setMessage("Configuración guardada. El menú público ya puede mostrar el equivalente USD.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setMessage("Fuente elTOQUE guardada. Buscando la tasa actual...");
    await refreshElToque();
  };

  if (loading) {
    return (
      <section className="mt-5 rounded-3xl border border-slate-200/80 bg-white p-5 text-sm font-semibold text-slate-500 shadow-[0_8px_28px_rgba(15,23,42,.04)]">
        Cargando configuración de moneda...
      </section>
    );
  }

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_8px_28px_rgba(15,23,42,.04)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <BadgeDollarSign size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#071B35]">Precio de referencia en USD</h2>
            <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
              Mantiene el precio real del menú en CUP y muestra debajo un equivalente aproximado en USD.
            </p>
          </div>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(event) => setState((current) => ({ ...current, enabled: event.target.checked }))}
            className="h-4 w-4 accent-emerald-600"
          />
          <span className="text-sm font-black text-slate-700">Mostrar USD en el menú</span>
        </label>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <label>
          <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Tasa de cambio</span>
          <div className="flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-emerald-300">
            <span className="border-r border-slate-200 px-3 py-3 text-sm font-black text-slate-500">1 USD =</span>
            <input
              inputMode="decimal"
              value={state.rate}
              disabled={state.source === "eltoque"}
              onChange={(event) => setState((current) => ({ ...current, rate: event.target.value }))}
              placeholder="420"
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base font-black text-[#071B35] outline-none disabled:cursor-not-allowed disabled:text-slate-400"
            />
            <span className="px-3 py-3 text-sm font-black text-slate-500">CUP</span>
          </div>
          {state.source === "eltoque" && (
            <p className="mt-1.5 text-[10px] font-semibold text-emerald-700">
              Tasa controlada automáticamente por elTOQUE.
            </p>
          )}
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Fuente</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setState((current) => ({ ...current, source: "manual" }))}
              className={`rounded-2xl border px-4 py-3 text-sm font-black ${state.source === "manual" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500"}`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setState((current) => ({ ...current, source: "eltoque" }))}
              className={`rounded-2xl border px-4 py-3 text-sm font-black ${state.source === "eltoque" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500"}`}
              title="Actualización automática diaria desde elTOQUE"
            >
              elTOQUE
            </button>
          </div>
          <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
            Manual: tú controlas la tasa. elTOQUE: se actualiza al guardar y luego automáticamente una vez al día.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#071B35] px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60"
          >
            {saving || refreshing ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Guardando..." : refreshing ? "Consultando elTOQUE..." : "Guardar"}
          </button>
          {state.source === "eltoque" && (
            <button
              type="button"
              onClick={refreshElToque}
              disabled={saving || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs font-black text-emerald-800 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Actualizar ahora
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
          Vista previa: {validRate ? (
            <><strong className="text-[#071B35]">1,650 CUP</strong> · ≈ <strong className="text-emerald-700">${(1650 / numericRate).toFixed(2)} USD</strong></>
          ) : (
            state.source === "eltoque" ? "esperando la primera tasa automática de elTOQUE" : "escribe una tasa para ver la conversión"
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-400">
          <span>
            Fuente activa: <strong className="text-slate-600">{state.source === "eltoque" ? "elTOQUE · automática" : "Manual"}</strong>
          </span>
          {state.updatedAt && (
            <span>· Última actualización: {new Date(state.updatedAt).toLocaleString("es-CU")}</span>
          )}
        </div>
        {message && <p className="mt-2 text-xs font-bold text-emerald-700">{message}</p>}
      </div>
    </section>
  );
}
