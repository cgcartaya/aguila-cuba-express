"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { printLymReceipt } from "@/lib/lym/print";
import { lymFetch } from "@/lib/lym/client";

type Line = {
  product_id: string | null;
  combo_id?: string | null;
  item_type: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal?: number;
};
type Order = {
  id: string;
  order_number: string;
  total: number;
  delivery_fee: number;
  customer_name: string;
  customer_phone: string;
  recipient_name: string;
  recipient_phone: string;
  address: string;
  zone_name: string;
  notes: string;
  created_at: string;
  deleted_at: string | null;
  status: string;
  lym_sale_state: string;
  lym_origin: string;
  lym_seller_key: string | null;
  lym_seller_name: string | null;
  lym_created_by: string | null;
  lym_confirmed_by: string | null;
  lym_confirmed_at: string | null;
  lym_version: number;
  order_items: Line[];
};
type Seller = { key: string; name: string; active: boolean; role: string };
type Product = { id: string; name: string; stock: number; price: number };
type Data = {
  orders: Order[];
  count: number;
  products: Product[];
  sellers: Seller[];
  owner: boolean;
  actor: string;
  store: { name: string; logo_url: string | null };
};
type Event = {
  actor_id: string | null;
  action: string;
  created_at: string;
  details: { reason?: string; status?: string };
};
const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const date = (s: string | null) =>
  s ? new Date(s).toLocaleString("es", { timeZone: "America/Havana" }) : "—";
const eventName = (action: string) =>
  ({
    created: "Solicitud creada",
    edited: "Solicitud editada",
    confirm: "Venta confirmada",
    delivery_status: "Estado de entrega actualizado",
    cancel: "Cancelación / devolución",
    trash: "Enviada a papelera",
    restore: "Reabierta como solicitud",
    legacy_deducted: "Inventario histórico conciliado como descontado",
    legacy_not_deducted: "Inventario histórico conciliado sin descuento",
  })[action] || action;
const stateName = (s: string) =>
  ({
    pending: "Solicitud pendiente",
    confirmed: "Venta confirmada",
    cancelled: "Cancelada / devuelta",
    legacy: "Histórica · requiere conciliación",
    in_transit: "En camino",
    delivered: "Entregada",
  })[s] || s;
const orderStateName = (o: Order) =>
  stateName(o.lym_sale_state) +
  (o.lym_sale_state === "confirmed" &&
  ["in_transit", "delivered"].includes(o.status)
    ? ` · ${stateName(o.status)}`
    : "");
const fieldClass = "w-full rounded-xl border border-slate-300 bg-white p-3";
const buttonClass =
  "rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50";

export default function LymOrders({ storeId }: { storeId: string }) {
  const [seller, setSeller] = useState("");
  const [state, setState] = useState("");
  const [trash, setTrash] = useState(false);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const requestKey = useRef("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    recipient_name: "",
    recipient_phone: "",
    address: "",
    delivery_place: "",
    notes: "",
    seller_key: "",
    delivery_fee: 0,
  });
  const [shortages, setShortages] = useState<
    Array<{ name: string; available: number; requested: number }>
  >([]);
  const loadSequence = useRef(0);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    try {
      const result = await lymFetch(
        `?${new URLSearchParams({ storeId, seller, state, trash: String(trash), page: String(page) })}`,
      );
      if (sequence === loadSequence.current) setData(result);
    } catch (e) {
      if (sequence !== loadSequence.current) return;
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar las órdenes.",
      );
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [storeId, seller, state, trash, page]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("orderId");
    if (orderId && /^[0-9a-f-]{36}$/i.test(orderId)) void open(orderId);
    // Read the requested order once when entering this store from its sales report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);
  async function open(id: string) {
    setError("");
    setShortages([]);
    try {
      const result = await lymFetch(`?storeId=${storeId}&orderId=${id}`);
      if (!result.orders?.[0]) throw new Error("Orden no encontrada.");
      setSelected(result.orders[0]);
      setEvents(result.audit || []);
      setActorNames(result.actorNames || {});
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando la orden.");
    }
  }
  function edit(order: Order | null) {
    setSelected(order);
    setEditing(true);
    setError("");
    setShortages([]);
    setQuery("");
    requestKey.current = crypto.randomUUID();
    setLines(order ? order.order_items.map((x) => ({ ...x })) : []);
    setForm({
      customer_name: order?.customer_name || "",
      customer_phone: order?.customer_phone || "",
      recipient_name: order?.recipient_name || "",
      recipient_phone: order?.recipient_phone || "",
      address: order?.address || "",
      delivery_place: order?.zone_name || "",
      notes: order?.notes || "",
      seller_key:
        order?.lym_seller_key ||
        (order || !data?.sellers.some((s) => s.key === `user:${data.actor}`)
          ? ""
          : `user:${data.actor}`),
      delivery_fee: Number(order?.delivery_fee || 0),
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await lymFetch("", {
        storeId,
        action: "save",
        orderId: selected?.id,
        version: selected?.lym_version || 0,
        requestKey: requestKey.current,
        payload: form,
        items: lines,
      });
      await load();
      await open(result.order.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function action(order: Order, action: string, status?: string) {
    if (lock.current) return;
    const reason = [
      "cancel",
      "trash",
      "legacy_deducted",
      "legacy_not_deducted",
    ].includes(action)
      ? window.prompt("Motivo de la operación (obligatorio):")
      : "";
    if (reason === null) return;
    if (
      action === "confirm" &&
      !window.confirm(
        "¿Confirmar esta venta y descontar el inventario una sola vez? Revisa productos, cantidades, precios y responsable antes de continuar.",
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    setShortages([]);
    try {
      const result = await lymFetch("", {
        storeId,
        action,
        orderId: order.id,
        version: order.lym_version,
        reason,
        status,
      });
      if (result.success === false) {
        setShortages(result.inventory || []);
        setError(
          "Faltan existencias. Edita las cantidades o ajusta el inventario antes de confirmar.",
        );
        return;
      }
      await load();
      await open(order.id);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la operación.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const total =
    lines.reduce((s, x) => s + Number(x.quantity) * Number(x.price), 0) +
    Number(form.delivery_fee || 0);
  const displayActor = (id: string | null) =>
    id
      ? actorNames[id] ||
        data?.sellers.find((s) => s.key === `user:${id}`)?.name ||
        id
      : "Web / sin registro histórico";
  return (
    <section className="space-y-5 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>Pedidos de la web y órdenes manuales · LYM</p>
        <button
          className="rounded-xl bg-blue-950 px-5 py-3 font-bold text-white"
          onClick={() => edit(null)}
        >
          Crear orden manual
        </button>
      </div>
      <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4">
        <label>
          Venta de
          <select
            className={fieldClass}
            value={seller}
            onChange={(e) => {
              setSeller(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            <option value="unassigned">Sin atribuir</option>
            {data?.sellers.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name} · {s.role}
                {!s.active ? " (inactivo)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select
            className={fieldClass}
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todos</option>
            {[
              "pending",
              "confirmed",
              "in_transit",
              "delivered",
              "cancelled",
              "legacy",
            ].map((s) => (
              <option key={s} value={s}>
                {s === "confirmed"
                  ? "Ventas confirmadas (todas)"
                  : stateName(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={trash}
            onChange={(e) => {
              setTrash(e.target.checked);
              setPage(0);
            }}
          />
          Papelera
        </label>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {shortages.length > 0 && (
        <ul role="alert" className="rounded-xl bg-amber-50 p-4">
          {shortages.map((s, i) => (
            <li key={i}>
              {s.name}: solicitado {s.requested}, disponible {s.available}
            </li>
          ))}
        </ul>
      )}
      <h2 className="text-xl font-black">
        {trash ? "Papelera" : "Todas las órdenes"}{" "}
        <span className="text-sm font-normal">({data?.count || 0})</span>
      </h2>
      {loading && <p aria-live="polite">Cargando…</p>}
      <div className="grid gap-3">
        {data?.orders.map((o) => (
          <button
            className="rounded-2xl border bg-white p-4 text-left"
            key={o.id}
            onClick={() => void open(o.id)}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <strong>{o.order_number}</strong>
              <strong>{money(o.total)}</strong>
            </div>
            <p>
              {o.customer_name} · {o.lym_seller_name || "Sin atribuir"} ·{" "}
              {o.lym_origin === "manual"
                ? "Manual"
                : o.lym_origin === "legacy"
                  ? "Histórica"
                  : "Web"}
            </p>
            <p className="text-sm text-blue-800">
              {orderStateName(o)} · {date(o.created_at)}
            </p>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          className={buttonClass}
          disabled={!page || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <span>Página {page + 1}</span>
        <button
          className={buttonClass}
          disabled={loading || (page + 1) * 30 >= (data?.count || 0)}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </button>
      </div>
      {(selected || editing) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 sm:p-6">
          <div className="mx-auto max-w-4xl rounded-2xl bg-white p-5">
            <div className="lym-no-print mb-4 flex justify-between gap-3">
              <h2 className="text-xl font-black">
                {editing
                  ? selected
                    ? "Revisar y editar solicitud"
                    : "Crear orden manual"
                  : selected?.order_number}
              </h2>
              <button
                className={buttonClass}
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  setEditing(false);
                }}
              >
                Cerrar
              </button>
            </div>
            {error && (
              <p
                role="alert"
                className="lym-no-print my-3 rounded-xl bg-red-50 p-3 text-red-800"
              >
                {error}
              </p>
            )}
            {shortages.length > 0 && (
              <ul className="lym-no-print my-3 rounded-xl bg-amber-50 p-3">
                {shortages.map((s, i) => (
                  <li key={i}>
                    {s.name}: {s.available} disponibles / {s.requested}{" "}
                    solicitados
                  </li>
                ))}
              </ul>
            )}
            {editing ? (
              <form onSubmit={save} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries({
                    customer_name: "Comprador",
                    customer_phone: "Teléfono comprador",
                    recipient_name: "Destinatario",
                    recipient_phone: "Teléfono destinatario",
                    address: "Dirección de entrega",
                    delivery_place: "Lugar de entrega",
                    notes: "Notas",
                  }).map(([k, label]) => (
                    <label key={k}>
                      {label}
                      <input
                        className={fieldClass}
                        required={!["notes", "delivery_place"].includes(k)}
                        value={String(form[k as keyof typeof form])}
                        onChange={(e) =>
                          setForm({ ...form, [k]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    Venta de
                    <select
                      className={fieldClass}
                      value={form.seller_key || "unassigned"}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          seller_key:
                            e.target.value === "unassigned"
                              ? ""
                              : e.target.value,
                        })
                      }
                    >
                      <option value="unassigned">Sin atribuir</option>
                      {data?.sellers
                        .filter((s) => s.active || s.key === form.seller_key)
                        .map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.name} · {s.role}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Entrega ($)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={fieldClass}
                      value={form.delivery_fee}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          delivery_fee: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <label className="block">
                  Buscar productos
                  <input
                    className={fieldClass}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nombre del producto"
                  />
                </label>
                {query && (
                  <ul className="max-h-56 overflow-y-auto rounded-xl border">
                    {data?.products
                      .filter((p) =>
                        p.name
                          .toLocaleLowerCase()
                          .includes(query.toLocaleLowerCase()),
                      )
                      .slice(0, 50)
                      .map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="w-full border-b p-3 text-left"
                            onClick={() => {
                              setLines((prev) => [
                                ...prev,
                                {
                                  product_id: p.id,
                                  product_name: p.name,
                                  item_type: "product",
                                  quantity: 1,
                                  price: Number(p.price),
                                },
                              ]);
                              setQuery("");
                            }}
                          >
                            {p.name} · {money(p.price)} · Existencias: {p.stock}
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th>Producto / existencias</th>
                        <th>Cantidad</th>
                        <th>Precio ($)</th>
                        <th>Importe</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => (
                        <tr className="border-b" key={i}>
                          <td className="p-2">
                            {l.product_name}
                            <small className="block">
                              {l.item_type === "combo"
                                ? "Combo · se valida al confirmar"
                                : `Existencias: ${data?.products.find((p) => p.id === l.product_id)?.stock ?? "No disponible"}`}
                            </small>
                          </td>
                          <td className="p-2">
                            <input
                              aria-label={`Cantidad ${l.product_name}`}
                              className="w-20 rounded border p-2"
                              type="number"
                              required
                              min="1"
                              step="1"
                              value={l.quantity}
                              onChange={(e) =>
                                setLines(
                                  lines.map((x, j) =>
                                    j === i
                                      ? {
                                          ...x,
                                          quantity: Number(e.target.value),
                                        }
                                      : x,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="p-2">
                            <input
                              aria-label={`Precio ${l.product_name}`}
                              className="w-24 rounded border p-2"
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={l.price}
                              onChange={(e) =>
                                setLines(
                                  lines.map((x, j) =>
                                    j === i
                                      ? { ...x, price: Number(e.target.value) }
                                      : x,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td>{money(l.quantity * l.price)}</td>
                          <td>
                            <button
                              type="button"
                              className="p-2 text-red-700"
                              onClick={() =>
                                setLines(lines.filter((_, j) => j !== i))
                              }
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-right text-xl font-bold">
                  Total: {money(total)}
                </p>
                <p>
                  Guardar mantiene la solicitud pendiente y no descuenta
                  inventario.
                </p>
                <button
                  disabled={busy || !lines.length}
                  className="rounded-xl bg-blue-950 p-3 font-bold text-white disabled:opacity-50"
                >
                  {busy ? "Guardando…" : "Guardar solicitud pendiente"}
                </button>
              </form>
            ) : (
              selected && (
                <>
                  <div id="lym-receipt" className="space-y-4">
                    <h2 className="text-2xl font-black">
                      {data?.store.name || "LYM"} · Comprobante
                    </h2>
                    <p>
                      <strong>{selected.order_number}</strong> ·{" "}
                      {date(selected.created_at)}
                    </p>
                    <p className="rounded border-2 border-black p-3 font-bold">
                      {orderStateName(selected)}
                      {selected.deleted_at ? " · EN PAPELERA" : ""}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <p>
                        Comprador: {selected.customer_name}
                        <br />
                        Teléfono: {selected.customer_phone}
                      </p>
                      <p>
                        Destinatario: {selected.recipient_name}
                        <br />
                        Teléfono: {selected.recipient_phone}
                      </p>
                    </div>
                    <p>
                      Entrega: {selected.address}
                      <br />
                      {selected.zone_name}
                    </p>
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Precio</th>
                          <th>Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.order_items.map((l, i) => (
                          <tr className="border-b" key={i}>
                            <td className="py-2">{l.product_name}</td>
                            <td>{l.quantity}</td>
                            <td>{money(l.price)}</td>
                            <td>{money(l.subtotal ?? l.quantity * l.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-right">
                      Entrega: {money(selected.delivery_fee)}
                    </p>
                    <p className="text-right text-xl font-black">
                      Total: {money(selected.total)}
                    </p>
                    <p>{selected.notes}</p>
                    <p>
                      Venta de: {selected.lym_seller_name || "Sin atribuir"}
                      <br />
                      Creada por: {displayActor(selected.lym_created_by)}
                      <br />
                      Confirmada por: {displayActor(
                        selected.lym_confirmed_by,
                      )}{" "}
                      · {date(selected.lym_confirmed_at)}
                    </p>
                    {selected.lym_sale_state === "pending" && (
                      <p>
                        Solicitud sujeta a disponibilidad y confirmación de LYM.
                        No acredita una venta confirmada.
                      </p>
                    )}
                  </div>
                  <div className="lym-no-print mt-5 flex flex-wrap gap-3">
                    <button className={buttonClass} onClick={printLymReceipt}>
                      Imprimir comprobante
                    </button>
                    {selected.lym_sale_state === "pending" &&
                      !selected.deleted_at && (
                        <>
                          <button
                            className={buttonClass}
                            disabled={busy}
                            onClick={() => edit(selected)}
                          >
                            Revisar productos, cantidades y precios
                          </button>
                          <button
                            className="rounded-xl bg-green-800 p-3 font-bold text-white disabled:opacity-50"
                            disabled={busy}
                            onClick={() => void action(selected, "confirm")}
                          >
                            Confirmar venta y descontar inventario
                          </button>
                        </>
                      )}
                    {selected.lym_sale_state === "confirmed" &&
                      !selected.deleted_at && (
                        <label>
                          Estado de entrega
                          <select
                            className={fieldClass}
                            aria-label="Estado de entrega"
                            value={selected.status}
                            disabled={busy}
                            onChange={(e) =>
                              void action(
                                selected,
                                "delivery_status",
                                e.target.value,
                              )
                            }
                          >
                            <option value="confirmed">Confirmada</option>
                            <option value="in_transit">En camino</option>
                            <option value="delivered">Entregada</option>
                          </select>
                        </label>
                      )}
                    {["pending", "confirmed"].includes(
                      selected.lym_sale_state,
                    ) &&
                      !selected.deleted_at && (
                        <>
                          <button
                            className={buttonClass}
                            disabled={busy}
                            onClick={() => void action(selected, "cancel")}
                          >
                            Cancelar / devolución completa
                          </button>
                          <button
                            className={buttonClass}
                            disabled={busy}
                            onClick={() => void action(selected, "trash")}
                          >
                            Enviar a papelera
                          </button>
                        </>
                      )}
                    {selected.lym_sale_state === "cancelled" && (
                      <>
                        <button
                          className={buttonClass}
                          disabled={busy}
                          onClick={() => void action(selected, "restore")}
                        >
                          Reabrir como solicitud sin descontar
                        </button>
                        {!selected.deleted_at && (
                          <button
                            className={buttonClass}
                            disabled={busy}
                            onClick={() => void action(selected, "trash")}
                          >
                            Enviar a papelera
                          </button>
                        )}
                      </>
                    )}
                    {selected.lym_sale_state === "legacy" && data?.owner && (
                      <div className="rounded-xl bg-amber-50 p-4">
                        <p className="mb-3">
                          Orden anterior al nuevo flujo. Verifica el inventario
                          y registra la conciliación. Esto no mueve existencias
                          ni inventa una fecha de confirmación.
                        </p>
                        <button
                          className={buttonClass}
                          disabled={busy}
                          onClick={() =>
                            void action(selected, "legacy_deducted")
                          }
                        >
                          Ya se descontó el inventario
                        </button>
                        <button
                          className={buttonClass}
                          disabled={busy}
                          onClick={() =>
                            void action(selected, "legacy_not_deducted")
                          }
                        >
                          No hay inventario descontado
                        </button>
                      </div>
                    )}
                  </div>
                  <details className="lym-no-print mt-5">
                    <summary className="font-bold">
                      Historial de la orden
                    </summary>
                    <ul>
                      {events.map((e, i) => (
                        <li className="border-t py-2 text-sm" key={i}>
                          {date(e.created_at)} · {displayActor(e.actor_id)} ·{" "}
                          {eventName(e.action)}{" "}
                          {e.details.status &&
                            `· ${stateName(e.details.status)}`}
                          {e.details.reason && `· ${e.details.reason}`}
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}
