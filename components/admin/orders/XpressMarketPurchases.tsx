"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { openWhatsAppMessage } from "@/lib/utils/whatsapp";

type FruitLine = {
  id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  purchased: number;
  unit_lb: number;
};

type Adjustment = {
  id: number;
  created_at: string;
  before_total: number;
  after_total: number;
  removed: { name: string; quantity: number }[];
  refund_due: number;
  refunded_at: string | null;
};

type MarketOrder = {
  id: string;
  number: string;
  customer_name: string | null;
  customer_phone: string | null;
  editable: boolean;
  revision: number;
  items: FruitLine[];
  adjustments: Adjustment[];
};

type Estimate = Pick<Adjustment, "before_total" | "after_total" | "refund_due" | "removed"> & {
  weight_lb: number | null;
  subtotal: number;
  delivery: number;
  discount: number;
  management: number;
  cancelled: boolean;
};

type Draft = { id: string; quantity: number; purchased: number };

const money = (value: number) => new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" }).format(value);
const amount = (value: number) => new Intl.NumberFormat("es-US", { maximumFractionDigits: 3 }).format(value);
const button = "min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-100 disabled:opacity-50";

export default function XpressMarketPurchases({
  storeId, selectedId, onSelect, onSaved, orderRevision,
}: {
  storeId: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onSaved: (id: string) => Promise<void>;
  orderRevision: unknown;
}) {
  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [load, setLoad] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<MarketOrder | null>(null);
  const [draft, setDraft] = useState<Draft[]>([]);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;
    async function read() {
      const response = await supabase.rpc("xpress_market_orders", { p_store: storeId });
      if (!active) return;
      setLoaded(true);
      if (response.error) {
        setError(response.error.message);
        setOrders([]);
      } else {
        setOrders(response.data ?? []);
      }
    }
    void read();
    return () => { active = false; };
  }, [storeId, load, orderRevision]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    async function read() {
      const response = await supabase.rpc("xpress_market_orders", { p_store: storeId, p_order: selectedId });
      if (!active) return;
      const order: MarketOrder | undefined = response.data?.[0];
      if (response.error || !order) {
        setError(response.error?.message || "No se encontró la orden de frutas.");
        return;
      }
      setSelected(order);
      setDraft(order.items.map(({ id, quantity, purchased }) => ({ id, quantity, purchased })));
      setEstimate(null);
    }
    void read();
    return () => { active = false; };
  }, [storeId, selectedId, load]);

  const totals = new Map<string, { name: string; units: number; pounds: number; orders: MarketOrder[] }>();
  for (const order of orders.filter((order) => order.editable)) {
    for (const item of order.items) {
      const pending = item.quantity - item.purchased;
      if (pending <= 0) continue;
      const key = item.product_id || item.name;
      const group = totals.get(key) || { name: item.name, units: 0, pounds: 0, orders: [] };
      group.units += pending;
      group.pounds += pending * item.unit_lb;
      if (!group.orders.some(({ id }) => id === order.id)) group.orders.push(order);
      totals.set(key, group);
    }
  }
  const refunds = orders.filter((o) => o.adjustments.some((a) => a.refund_due > 0 && !a.refunded_at));
  const current = selected?.id === selectedId ? selected : null;
  const purchaseStatus = current?.items.every((item) => item.purchased === item.quantity)
    ? "Compra completada"
    : current?.items.some((item) => item.purchased > 0) ? "Compra parcial" : "Pendiente de compra";
  const changed = current?.items.some((item, index) =>
    draft[index]?.quantity !== item.quantity || draft[index]?.purchased !== item.purchased
  );

  function select(id: string | null) {
    setError("");
    setFeedback("");
    setSelected(null);
    onSelect(id);
  }

  function updateLine(index: number, patch: Partial<Draft>) {
    setDraft((lines) => lines.map((line, position) => position === index ? { ...line, ...patch } : line));
    setEstimate(null);
  }

  async function calculate(apply: boolean) {
    if (!current || busy) return;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const { data, error } = await supabase.rpc("save_xpress_market_order", {
        p_store: storeId, p_order: current.id, p_revision: current.revision, p_items: draft,
        p_apply: apply, p_expected: apply ? estimate : null,
      });
      if (error) throw new Error(error.message);
      if (apply) {
        setEstimate(null);
        setSelected(null);
        setLoad((value) => value + 1);
        setFeedback(data.removed.length
          ? "Ajuste guardado. El aviso al cliente está disponible en el historial."
          : "Compra registrada. Se actualizó la lista del mercado.");
        await onSaved(current.id);
      } else {
        setEstimate(data);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo actualizar la compra.");
    } finally {
      setBusy(false);
    }
  }

  async function markRefund(adjustment: Adjustment) {
    if (!window.confirm(`¿Ya devolviste ${money(adjustment.refund_due)} al cliente?`)) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.rpc("confirm_xpress_market_refund", {
        p_store: storeId, p_adjustment: adjustment.id,
      });
      if (error) throw new Error(error.message);
      setFeedback("Reembolso registrado.");
      setLoad((value) => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo registrar el reembolso.");
    } finally {
      setBusy(false);
    }
  }

  function notify(order: MarketOrder, adjustment: Adjustment) {
    const lines = adjustment.removed.map((line) => `${line.quantity} × ${line.name}`).join("\n");
    const refund = adjustment.refund_due > 0
      ? `\n${adjustment.refunded_at ? "Reembolso realizado" : "Reembolso pendiente"}: ${money(adjustment.refund_due)}.`
      : "";
    openWhatsAppMessage({
      app: "personal",
      phone: order.customer_phone || "",
      message: `Hola${order.customer_name ? `, ${order.customer_name}` : ""}. Ajustamos tu pedido ${order.number} de Xpress porque no conseguimos estas frutas en el mercado:\n${lines}\n\nTotal anterior: ${money(adjustment.before_total)}. Nuevo total: ${money(adjustment.after_total)}.${refund}${adjustment.after_total === 0 ? "\nEl pedido quedó cancelado." : ""}`,
    });
  }

  return (
    <section id="compras-frutas" className="mb-6 scroll-mt-4 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black">Compras de frutas</h2>
        <button className={button} type="button" disabled={busy} onClick={() => {
          setError("");
          setLoaded(false);
          setLoad((value) => value + 1);
        }}>Actualizar lista</button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!loaded && <p className="mt-3 text-sm text-slate-600">Cargando compras…</p>}
      {loaded && totals.size === 0 && !error && <p className="mt-3 text-sm text-slate-600">No hay frutas pendientes de comprar.</p>}
      {totals.size > 0 && (
        <div className="mt-3 divide-y divide-slate-200">
          {[...totals.entries()].sort(([, a], [, b]) => a.name.localeCompare(b.name, "es")).map(([key, group]) => (
            <div key={key} className="grid gap-2 py-3 sm:grid-cols-[1fr_9rem_1fr] sm:items-center">
              <span className="font-bold">{group.name}</span>
              <span className="text-sm">{amount(group.units)} ud. · {amount(group.pounds)} lb</span>
              <div className="flex flex-wrap gap-2">
                {group.orders.map((order) => <button key={order.id} type="button" disabled={busy} className={button} onClick={() => select(order.id)}>{order.number}</button>)}
              </div>
            </div>
          ))}
        </div>
      )}
      {refunds.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-amber-900">Reembolsos pendientes</span>
          {refunds.map((order) => <button key={order.id} type="button" disabled={busy} className={button} onClick={() => select(order.id)}>{order.number}</button>)}
        </div>
      )}
      {selectedId && (
        <section className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-black">{current ? `Pedido ${current.number}` : error ? "Pedido de frutas" : "Cargando pedido…"}</h3>
            <button type="button" className={button} disabled={busy} onClick={() => select(null)}>Cerrar</button>
          </div>
          {feedback && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{feedback}</p>}
          {current?.editable && current.items.length > 0 && (
            <p className="mt-2 text-sm font-bold text-slate-700">{purchaseStatus}</p>
          )}
          {current?.editable && current.items.length > 0 && (
            <fieldset disabled={busy} className="mt-3 space-y-3">
              <legend className="text-sm text-slate-600">Reduce la cantidad del pedido si falta fruta. En Compradas, registra cuántas unidades de esa presentación ya conseguiste.</legend>
              {current.items.map((item, index) => (
                <div key={item.id} className="grid items-end gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
                  <div className="self-center text-sm font-bold">{item.name}<p className="text-xs font-normal text-slate-600">{amount(item.unit_lb)} lb por unidad</p></div>
                  <label className="text-xs font-bold">
                    Cantidad del pedido
                    <input type="number" min={item.purchased} max={item.quantity} step={1} className={`${button} mt-1 w-full bg-white`} value={Number.isFinite(draft[index]?.quantity) ? draft[index].quantity : ""} onChange={(event) => {
                      const quantity = event.target.valueAsNumber;
                      updateLine(index, { quantity, purchased: Math.min(draft[index].purchased, quantity) });
                    }} />
                  </label>
                  <label className="text-xs font-bold">
                    Compradas
                    <input type="number" min={item.purchased} max={draft[index]?.quantity} step={1} className={`${button} mt-1 w-full bg-white`} value={Number.isFinite(draft[index]?.purchased) ? draft[index].purchased : ""} onChange={(event) => updateLine(index, { purchased: event.target.valueAsNumber })} />
                  </label>
                  <button type="button" className={button} disabled={item.purchased > 0 || draft[index]?.quantity === 0} onClick={() => updateLine(index, { quantity: 0, purchased: 0 })}>Retirar</button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={button} onClick={() => {
                  setDraft((lines) => lines.map((line) => ({ ...line, purchased: line.quantity })));
                  setEstimate(null);
                }}>Marcar todas compradas</button>
                <button type="button" className={button} disabled={!changed || draft.some((line, index) =>
                  !Number.isInteger(line.quantity) || !Number.isInteger(line.purchased) || line.quantity > current.items[index].quantity ||
                  line.purchased < current.items[index].purchased || line.purchased > line.quantity
                )} onClick={() => calculate(false)}>Revisar cambios</button>
              </div>
              {estimate && (
                <div className="rounded-xl border border-slate-200 p-3 text-sm">
                  {estimate.removed.length > 0 ? (
                    <>
                      <p>Productos {money(estimate.subtotal)} · Envío {money(estimate.delivery)} · Gestión {money(estimate.management)}</p>
                      {estimate.discount > 0 && <p>Descuento {money(estimate.discount)}</p>}
                      <p className="mt-1 font-bold">{money(estimate.before_total)} → {money(estimate.after_total)} · {amount(estimate.weight_lb ?? 0)} lb</p>
                      {estimate.cancelled && <p>Se cancelará el pedido.</p>}
                      {estimate.refund_due > 0 && <p>Reembolso pendiente {money(estimate.refund_due)}</p>}
                    </>
                  ) : <p>Se actualizarán las cantidades compradas.</p>}
                  <button type="button" className={`${button} mt-2 bg-slate-900 text-white hover:bg-slate-700`} onClick={() => calculate(true)}>{busy ? "Guardando…" : "Confirmar cambios"}</button>
                </div>
              )}
            </fieldset>
          )}
          {current && !current.editable && current.items.length > 0 && <p className="mt-2 text-sm text-slate-600">El estado de la orden o del pago impide ajustar la compra.</p>}
          {!!current?.adjustments.length && (
            <div className="mt-4 space-y-2">
              <h4 className="font-bold">Historial de ajustes</h4>
              {current.adjustments.map((entry) => (
                <div key={entry.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p>{new Date(entry.created_at).toLocaleString("es-US")} · {money(entry.before_total)} → {money(entry.after_total)}</p>
                  <p>{entry.removed.map((line) => `${line.quantity} × ${line.name}`).join(", ")}</p>
                  {entry.refund_due > 0 && <p className="font-bold">{entry.refunded_at ? "Reembolso registrado" : "Reembolso pendiente"} · {money(entry.refund_due)}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {current.customer_phone ? <button type="button" className={button} onClick={() => notify(current, entry)}>Avisar por WhatsApp</button> : <span>El pedido no tiene teléfono del comprador.</span>}
                    {entry.refund_due > 0 && !entry.refunded_at && <button type="button" className={button} disabled={busy} onClick={() => markRefund(entry)}>Registrar devolución</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
