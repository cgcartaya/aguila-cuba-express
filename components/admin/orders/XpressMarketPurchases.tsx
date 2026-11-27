"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleHelp, RefreshCw, ShoppingBasket } from "lucide-react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedId && !dialog.open) dialog.showModal();
    if (!selectedId && dialog.open) dialog.close();
  }, [selectedId]);

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

  const totals = new Map<string, { name: string; units: number; pounds: number; orders: { order: MarketOrder; pending: number }[] }>();
  for (const order of orders.filter((order) => order.editable)) {
    for (const item of order.items) {
      const pending = item.quantity - item.purchased;
      if (pending <= 0) continue;
      const key = item.product_id || item.name;
      const group = totals.get(key) || { name: item.name, units: 0, pounds: 0, orders: [] };
      group.units += pending;
      group.pounds += pending * item.unit_lb;
      const pendingOrder = group.orders.find((entry) => entry.order.id === order.id);
      if (pendingOrder) pendingOrder.pending += pending;
      else group.orders.push({ order, pending });
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
    <section className="mb-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <ShoppingBasket aria-hidden size={22} className="mt-1 shrink-0 text-emerald-700" />
          <div>
            <h2 className="text-xl font-black">Compras de frutas</h2>
            <p className="mt-1 text-sm text-slate-600">Lista para el mercado con lo que falta por comprar para los pedidos de Xpress.</p>
          </div>
        </div>
        <button className={`${button} inline-flex items-center gap-2`} type="button" disabled={busy || !loaded} onClick={() => {
          setError("");
          setLoaded(false);
          setLoad((value) => value + 1);
        }}><RefreshCw aria-hidden size={15} /> Actualizar lista</button>
      </header>

      <details className="group mx-4 mb-4 rounded-2xl bg-emerald-50 text-emerald-950 sm:mx-6">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
          <CircleHelp aria-hidden size={17} className="shrink-0" />
          ¿Cómo se usa esta lista?
          <ChevronDown aria-hidden size={17} className="ml-auto shrink-0 group-open:rotate-180" />
        </summary>
        <ol className="list-decimal space-y-2 pb-4 pl-9 pr-4 text-sm leading-relaxed">
          <li><strong>Antes de ir al mercado.</strong> Usa las libras pendientes para saber cuánto comprar. Una unidad es una presentación del catálogo. Por ejemplo, 3 unidades de fresas de 2.5 lb suman 7.5 lb.</li>
          <li><strong>Al regresar.</strong> Abre el producto y elige un pedido. En <strong>Unidades compradas</strong>, registra el total que conseguiste para ese pedido. Los cambios guardados se descuentan de la lista.</li>
          <li><strong>Si faltó producto.</strong> Reduce las <strong>Unidades del pedido</strong> o pulsa <strong>Retirar del pedido</strong>. Revisa el nuevo envío y total antes de confirmar. Luego puedes avisar al cliente por WhatsApp desde el historial.</li>
        </ol>
      </details>

      {!selectedId && error && <p role="alert" className="mx-4 mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 sm:mx-6">{error}</p>}
      {!loaded && <p role="status" className="px-4 pb-5 text-sm text-slate-600 sm:px-6">Cargando compras…</p>}
      {loaded && totals.size === 0 && !error && <p className="px-4 pb-5 text-sm text-slate-600 sm:px-6">No hay frutas pendientes de comprar.</p>}
      {totals.size > 0 && (
        <div className="mx-4 mb-5 overflow-hidden rounded-2xl border border-slate-200 sm:mx-6">
          <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_9rem_8rem_9rem] gap-4 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 md:grid">
            <span>Producto</span><span>Peso pendiente</span><span>Unidades</span><span>Pedidos</span>
          </div>
          <div className="divide-y divide-slate-200">
            {[...totals.entries()].sort(([, a], [, b]) => a.name.localeCompare(b.name, "es")).map(([key, group]) => (
              <details key={key} className="group border-t border-slate-100 first:border-t-0">
                <summary className="grid min-h-14 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_8rem_6rem_7rem] sm:gap-x-4 [&::-webkit-details-marker]:hidden">
                  <span className="col-span-2 min-w-0 break-words font-bold md:col-span-1">{group.name}</span>
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <strong className="text-emerald-800">{amount(group.pounds)} lb</strong>
                    <span className="sr-only">pendientes</span>
                    <span className="text-slate-600 md:hidden">· {amount(group.units)} ud.</span>
                  </span>
                  <span className="hidden text-slate-600 md:inline">{amount(group.units)} ud.</span>
                  <span className="flex items-center justify-between gap-2 font-semibold text-slate-700">
                    {group.orders.length} {group.orders.length === 1 ? "pedido" : "pedidos"}
                    <ChevronDown aria-hidden size={16} className="shrink-0 group-open:rotate-180" />
                  </span>
                </summary>
                <ul className="space-y-2 border-t border-slate-100 bg-slate-50 p-3 sm:px-4">
                  {group.orders.map(({ order, pending }) => (
                    <li key={order.id}>
                      <button type="button" disabled={busy} onClick={() => select(order.id)}
                        className={`${button} flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-white text-left`}>
                        <span className="break-all">{order.number}</span>
                        <span className="font-medium text-slate-600">{amount(pending)} ud. pendientes <span className="ml-2 font-bold text-emerald-800">Abrir pedido</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      )}
      {refunds.length > 0 && (
        <div className="mx-4 mb-4 flex flex-wrap items-center gap-2 sm:mx-6">
          <span className="text-sm font-bold text-amber-900">Reembolsos pendientes</span>
          {refunds.map((order) => <button key={order.id} type="button" disabled={busy} className={button} onClick={() => select(order.id)}>{order.number}</button>)}
        </div>
      )}
      <dialog ref={dialogRef} aria-labelledby="xpress-market-dialog-title"
        onCancel={(event) => { event.preventDefault(); if (!busy) select(null); }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_1rem)] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50">
        {selectedId && (
          <section className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="xpress-market-dialog-title" className="break-all text-lg font-black">{current ? `Pedido ${current.number}` : error ? "Pedido de frutas" : "Cargando pedido…"}</h3>
              <button type="button" className={button} disabled={busy} onClick={() => select(null)}>Cerrar</button>
            </div>
            {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {feedback && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{feedback}</p>}
            {current?.editable && current.items.length > 0 && (
              <p className="mt-2 text-sm font-bold text-slate-700">{purchaseStatus}</p>
            )}
            {current?.editable && current.items.length > 0 && (
              <fieldset disabled={busy} className="mt-3 space-y-3">
                <legend className="text-sm text-slate-600">Registra cuántas unidades conseguiste para este pedido. Si faltó producto, ajusta la cantidad que vas a entregar.</legend>
                {current.items.map((item, index) => (
                  <div key={item.id} className="grid items-end gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_8rem_8rem_auto]">
                    <div className="self-center text-sm font-bold">{item.name}<p className="text-xs font-normal text-slate-600">{amount(item.unit_lb)} lb por unidad</p></div>
                    <label className="text-xs font-bold">
                      Unidades del pedido
                      <input type="number" min={item.purchased} max={item.quantity} step={1} className={`${button} mt-1 w-full bg-white`} value={Number.isFinite(draft[index]?.quantity) ? draft[index].quantity : ""} onChange={(event) => {
                        const quantity = event.target.valueAsNumber;
                        updateLine(index, { quantity, purchased: Math.min(draft[index].purchased, quantity) });
                      }} />
                    </label>
                    <label className="text-xs font-bold">
                      Unidades compradas
                      <input type="number" min={item.purchased} max={draft[index]?.quantity} step={1} className={`${button} mt-1 w-full bg-white`} value={Number.isFinite(draft[index]?.purchased) ? draft[index].purchased : ""} onChange={(event) => updateLine(index, { purchased: event.target.valueAsNumber })} />
                    </label>
                    <button type="button" className={button} disabled={item.purchased > 0 || draft[index]?.quantity === 0} onClick={() => updateLine(index, { quantity: 0, purchased: 0 })}>Retirar del pedido</button>
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
      </dialog>
    </section>
  );
}
