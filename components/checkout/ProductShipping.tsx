"use client";
import { useEffect, useMemo, useState } from "react";
import type { ShippingCartItem } from "@/lib/shipping/cart-shipping";
import { XPRESS_FRESH_DELIVERY, XPRESS_FRESH_SERVICE, XPRESS_PACKAGING_NOTICE } from "@/lib/shipping/xpress-checkout";
export type ProductShippingQuote = {
  amount: number;
  weight_lb: number;
  billable_weight_lb: number;
  service_name: string;
  transport_mode: string;
  destination: string;
  rate_per_lb: number;
};
type Option = {
  id: string;
  service: string;
  serviceCode: string;
  mode: string;
  destination: string;
  rate_per_lb: number;
  minimum_weight_lb: number;
  minimum_charge: number;
  fixed_fee: number;
};
const modes: Record<string, string> = {
  air: "Aéreo",
  sea: "Marítimo",
  express: "Express",
  ground: "Terrestre",
  other: "Otro",
};
export function useProductShipping(
  storeId: string | undefined,
  items: ShippingCartItem[],
  freshExpressRequired = false,
) {
  const [requestedShipping, setEnabled] = useState(false);
  const [loadedStoreId, setLoadedStoreId] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedRateId, setRateId] = useState("");
  const [configError, setConfigError] = useState("");
  const [result, setResult] = useState<{
    key: string;
    quote?: ProductShippingQuote;
    error?: string;
  } | null>(null);
  const availableOptions = freshExpressRequired
    ? options.filter((option) => option.serviceCode === XPRESS_FRESH_SERVICE && option.mode === "express")
    : options;
  const rateId = availableOptions.some((option) => option.id === selectedRateId) ? selectedRateId : "";
  const enabled = freshExpressRequired || requestedShipping;
  const key = JSON.stringify({ storeId, items, rateId, enabled });
  useEffect(() => {
    setLoadedStoreId("");
    setEnabled(false);
    setRateId("");
    setOptions([]);
    setConfigError("");
    if (!storeId) return;
    const controller = new AbortController();
    fetch(
      `/api/checkout/product-shipping?storeId=${encodeURIComponent(storeId)}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        const nextOptions: Option[] = data.options || [];
        setOptions(nextOptions);
        try {
          const saved = JSON.parse(
            sessionStorage.getItem(`checkout-product-shipping:${storeId}`) ||
              "null",
          );
          if (saved?.enabled && nextOptions.length) {
            setEnabled(true);
            setRateId(
              nextOptions.some((option) => option.id === saved.rateId)
                ? saved.rateId
                : "",
            );
          }
        } catch {
          /* Checkout remains usable if session storage is unavailable. */
        }
        setLoadedStoreId(storeId);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setConfigError(
            "No se pudieron cargar las modalidades. Recarga la página.",
          );
      });
    return () => controller.abort();
  }, [storeId]);
  useEffect(() => {
    if (!storeId || loadedStoreId !== storeId) return;
    try {
      sessionStorage.setItem(
        `checkout-product-shipping:${storeId}`,
        JSON.stringify({ enabled: requestedShipping, rateId: selectedRateId }),
      );
    } catch {
      /* Optional draft persistence. */
    }
  }, [storeId, loadedStoreId, requestedShipping, selectedRateId]);
  const clearSelection = () => {
    if (storeId)
      try {
        sessionStorage.removeItem(`checkout-product-shipping:${storeId}`);
      } catch {
        /* Optional draft persistence. */
      }
  };
  useEffect(() => {
    if (!enabled || !rateId || !storeId) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        fetch("/api/checkout/product-shipping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: (() => {
            const request = JSON.parse(key);
            return JSON.stringify({
              storeId: request.storeId,
              items: request.items,
              selection: { rate_id: request.rateId },
            });
          })(),
        })
          .then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.error);
            setResult({ key, quote: data });
          })
          .catch((e) => {
            if (e.name !== "AbortError") setResult({ key, error: e.message });
          }),
      200,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, enabled, rateId, storeId]); // key includes the current cart; stale quotes never qualify.
  const quote = result?.key === key ? result.quote : undefined;
  return {
    clearSelection,
    enabled,
    setEnabled,
    options: availableOptions,
    freshExpressRequired,
    rateId,
    setRateId,
    quote,
    error: configError || (result?.key === key ? result.error : ""),
    ready: !enabled || Boolean(quote),
    loading: enabled && Boolean(rateId) && result?.key !== key,
  };
}
export default function ProductShipping({
  shipping,
}: {
  shipping: ReturnType<typeof useProductShipping>;
}) {
  const {
    options,
    enabled,
    setEnabled,
    freshExpressRequired,
    rateId,
    setRateId,
    quote,
    error,
    loading,
  } = shipping;
  const selected = options.find((x) => x.id === rateId);
  const services = useMemo(
    () => [...new Set(options.map((x) => x.service))],
    [options],
  );
  const [service, setService] = useState("");
  const [mode, setMode] = useState("");
  const currentService = selected?.service || (freshExpressRequired ? options[0]?.service || "" : service);
  const currentMode = selected?.mode || (freshExpressRequired ? "express" : mode);
  if (!options.length && !freshExpressRequired)
    return error ? (
      <p role="alert" className="text-sm text-red-600">
        {error}
      </p>
    ) : null;
  return (
    <section className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
      {freshExpressRequired ? (
        <div>
          <p className="font-bold">Envío Express de frutas</p>
          <p className="text-sm text-slate-600">{XPRESS_FRESH_DELIVERY}</p>
          <p className="mt-2 text-sm text-slate-700">{XPRESS_PACKAGING_NOTICE}</p>
        </div>
      ) : (
        <label className="flex items-center gap-3 font-bold">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Estos productos son para enviar
        </label>
      )}
      {enabled && (
        <>
          <p className="text-sm text-slate-600">
            {freshExpressRequired
              ? "Selecciona el municipio de entrega. El costo se calcula por peso más el cargo del municipio."
              : "Selecciona el servicio y el destino para calcular el envío por peso."}
          </p>
          {!freshExpressRequired && (
            <>
              <label className="block text-sm">
                Servicio
                <select
                  className="mt-1 w-full rounded-xl border bg-white p-3"
                  value={currentService}
                  onChange={(e) => {
                    setService(e.target.value);
                    setMode("");
                    setRateId("");
                  }}
                >
                  <option value="">Selecciona el servicio</option>
                  {services.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Modalidad
                <select
                  className="mt-1 w-full rounded-xl border bg-white p-3"
                  value={currentMode}
                  onChange={(e) => {
                    setMode(e.target.value);
                    setRateId("");
                  }}
                >
                  <option value="">Selecciona la modalidad</option>
                  {[
                    ...new Set(
                      options
                        .filter((o) => o.service === currentService)
                        .map((o) => o.mode),
                    ),
                  ].map((m) => (
                    <option key={m} value={m}>
                      {modes[m] || m}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label className="block text-sm">
            Destino y tarifa
            <select
              className="mt-1 w-full rounded-xl border bg-white p-3"
              value={rateId}
              onChange={(e) => setRateId(e.target.value)}
            >
              <option value="">Selecciona el destino</option>
              {options
                .filter(
                  (o) => o.service === currentService && o.mode === currentMode,
                )
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.destination} · ${Number(o.rate_per_lb).toFixed(2)}/lb{Number(o.fixed_fee) > 0 ? ` + $${Number(o.fixed_fee).toFixed(2)}` : ""}
                  </option>
                ))}
            </select>
          </label>
          {selected && (
            <p className="text-xs text-slate-600">
              Mínimo facturable: {Number(selected.minimum_weight_lb)} lb. Cargo
              mínimo: ${Number(selected.minimum_charge).toFixed(2)}. Cargo fijo:
              ${Number(selected.fixed_fee).toFixed(2)}.
            </p>
          )}
          {loading && <p role="status">Calculando envío…</p>}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {quote && (
            <p className="rounded-xl bg-white p-3 text-sm">
              <strong>Envío: ${quote.amount.toFixed(2)} USD</strong>
              <br />
              Peso: {quote.weight_lb.toFixed(3)} lb · Peso facturable:{" "}
              {quote.billable_weight_lb.toFixed(3)} lb
              <br />
              {quote.service_name} · {modes[quote.transport_mode]} ·{" "}
              {quote.destination}
            </p>
          )}
        </>
      )}
    </section>
  );
}
