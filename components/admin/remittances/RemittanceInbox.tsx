"use client";

import ManualWhatsappNotice from "@/components/admin/remittances/ManualWhatsappNotice";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, FileText, Inbox, Loader2, MapPin, RefreshCw, Search, ShieldCheck, WalletCards, XCircle } from "lucide-react";

export type RemittanceFilter = RemittanceStatus | "all";
export type RemittanceStatus = "pending" | "paid" | "cancelled";
export type RemittanceOrder = {
  id: string;
  payload: Record<string, string>;
  amount: number;
  commission: number;
  total: number;
  status: RemittanceStatus;
  shipment_id: string | null;
  payment_reference: string | null;
  created_at: string;
};

export const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const statuses = {
  all: { label: "Todas", tab: "Todas las compras", style: "border-blue-200 bg-blue-50 text-blue-800", icon: Inbox },
  pending: { label: "Pendiente de pago", tab: "Pendientes de pago", style: "border-amber-200 bg-amber-50 text-amber-800", icon: Clock3 },
  paid: { label: "Pago confirmado", tab: "Pagadas", style: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  cancelled: { label: "Cancelada", tab: "Canceladas", style: "border-slate-200 bg-slate-100 text-slate-500", icon: XCircle },
};
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";

export function ShipmentLinks({ id }: { id: string }) {
  const path = `/admin/shipping/${encodeURIComponent(id)}`;
  return <>
    <Link href={`${path}/invoice`} className={`${button} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}><FileText size={16} />Ver factura</Link>
    <Link href={`${path}/edit`} className={`${button} bg-[#122b4a] text-white hover:bg-[#1c3e65]`}>Gestionar envío<ArrowUpRight size={16} /></Link>
  </>;
}

export function RemittanceOrderCard({ order, busy, onConfirm, onCancel, whatsappStoreId }: {
  whatsappStoreId?: string;
  order: RemittanceOrder;
  busy: boolean;
  onConfirm: (order: RemittanceOrder) => void;
  onCancel: (order: RemittanceOrder) => void;
}) {
  const state = statuses[order.status];
  const StateIcon = state.icon;
  const address = [order.payload.recipient_address, order.payload.recipient_municipality, order.payload.recipient_province].filter(Boolean).join(", ");
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-100 px-5 py-3.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2.5"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${state.style}`}><StateIcon size={12} />{state.label}</span><span className="text-xs font-medium text-slate-400">Desde la web</span></div>
      <time dateTime={order.created_at} className="text-xs font-medium text-slate-500">{new Intl.DateTimeFormat("es-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(order.created_at))}</time>
    </div>
    <div className="grid lg:grid-cols-[minmax(0,1fr)_255px]">
      <div className="min-w-0 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Solicitud</span><span className="font-mono text-xs font-semibold text-slate-500">#{order.id.slice(0, 8).toUpperCase()}</span></div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 sm:gap-6">
          <div className="flex min-w-0 gap-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><ArrowUpRight size={18} /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Remitente</p><p className="mt-1 break-words text-sm font-bold leading-5 text-slate-800">{order.payload.sender_name || "Sin nombre"}</p><p className="mt-1 break-words text-xs text-slate-500">{order.payload.sender_phone || "Sin teléfono"}</p></div></div>
          <div className="flex min-w-0 gap-3"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><ArrowDownLeft size={18} /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Destinatario</p><h2 className="mt-1 break-words text-sm font-bold leading-5 text-slate-900">{order.payload.recipient_name || "Sin nombre"}</h2><p className="mt-1 break-words text-xs text-slate-500">{order.payload.recipient_phone || "Sin teléfono"}</p></div></div>
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-600"><MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" /><p className="break-words">{address || "Sin dirección indicada"}</p></div>
        {order.payload.notes && <p className="mt-3 break-words text-xs leading-5 text-slate-500"><span className="font-bold text-slate-600">Indicaciones:</span> {order.payload.notes}</p>}
        {order.payment_reference && <p className="mt-3 break-words text-xs leading-5 text-slate-500"><span className="font-bold text-slate-600">Referencia del pago:</span> {order.payment_reference}</p>}
        <details className="mt-3 text-xs text-slate-400"><summary className="w-fit cursor-pointer rounded py-1 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-600">Ver identificador completo</summary><p className="mt-1 break-all font-mono">{order.id}</p></details>
      </div>
      <div className="flex flex-col justify-center border-t border-slate-100 bg-slate-50/70 p-5 sm:p-6 lg:border-l lg:border-t-0">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">{order.status === "paid" ? "Total cobrado" : order.status === "cancelled" ? "Total del pedido" : "Total por confirmar"}</p>
        <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-[#122b4a]">{usd(order.total)}<span className="ml-2 text-[10px] font-bold tracking-normal text-slate-400">USD</span></p>
        <div className="mt-4 space-y-2 text-xs"><div className="flex justify-between gap-3 text-slate-500"><span>Para el destinatario</span><span className="font-semibold text-slate-700">{usd(order.amount)}</span></div><div className="flex justify-between gap-3 text-slate-500"><span>Comisión</span><span className="font-semibold text-slate-700">{usd(order.commission)}</span></div></div>
        <p className={`mt-4 border-t border-slate-200 pt-3 text-[11px] leading-5 ${order.status === "paid" ? "text-emerald-700" : "text-slate-500"}`}>{order.status === "pending" ? "El envío se crea al verificar el pago." : order.status === "paid" && order.shipment_id ? "Compra vinculada a un envío de dinero." : order.status === "cancelled" ? "Esta solicitud fue cancelada." : "Pago registrado. El envío aún no está disponible."}</p>
      </div>
    </div>
    <footer className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400"><ShieldCheck size={14} />{order.status === "pending" ? "Verifica el ingreso antes de continuar" : order.shipment_id ? "Conserva el vínculo con la compra original" : "Historial de la solicitud"}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {whatsappStoreId && order.status === "paid" && <ManualWhatsappNotice storeId={whatsappStoreId} sourceId={order.id} sourceKind="order" />}
        {order.status === "pending" ? <><button type="button" disabled={busy} onClick={() => onCancel(order)} className={`${button} border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700`}>Cancelar pedido</button><button type="button" disabled={busy} onClick={() => onConfirm(order)} className={`${button} bg-blue-700 text-white shadow-sm hover:bg-blue-800`}><CheckCircle2 size={16} />Confirmar pago y crear envío</button></> : order.shipment_id ? <ShipmentLinks id={order.shipment_id} /> : null}
      </div>
    </footer>
  </article>;
}

type Props = {
  whatsappStoreId?: string;
  storeName: string;
  orders: RemittanceOrder[];
  status: RemittanceFilter;
  page: number;
  search: string;
  loading: boolean;
  busy: boolean;
  error: string;
  success: { text: string; shipmentId?: string } | null;
  onStatus: (status: RemittanceFilter) => void;
  onSearch: (value: string) => void;
  onRefresh: () => void;
  onPage: (page: number) => void;
  onConfirm: (order: RemittanceOrder) => void;
  onCancel: (order: RemittanceOrder) => void;
};

export default function RemittanceInbox(props: Props) {
  const { orders, status, page, loading, busy, search } = props;
  const query = search.trim().toLocaleLowerCase();
  const visible = orders.filter(order => !query || [order.id, ...Object.values(order.payload), order.payment_reference || ""].join(" ").toLocaleLowerCase().includes(query));
  const totals = orders.reduce((sum, order) => ({ amount: sum.amount + Number(order.amount), commission: sum.commission + Number(order.commission), total: sum.total + Number(order.total) }), { amount: 0, commission: 0, total: 0 });
  return <main className="min-h-screen min-w-0 bg-[#f5f7fb] p-4 pb-28 text-slate-900 sm:p-6 sm:pb-28 lg:p-8">
    <div className="mx-auto max-w-6xl space-y-5">
      <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-medium text-slate-400"><Link href="/admin/shipping" className="hover:text-blue-700">Envíos</Link><ChevronRight size={13} /><span className="text-slate-600">Órdenes de remesas</span></nav>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-700">{props.storeName || "Operaciones"} · Solicitudes online</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#122b4a] sm:text-3xl">Órdenes de remesas</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">De la solicitud al envío de dinero, con cada paso en su lugar.</p></div>
        <Link href="/admin/shipping/shipments?content=money" className={`${button} shrink-0 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}><WalletCards size={16} />Envíos de dinero<ArrowUpRight size={14} /></Link>
      </header>
      <section aria-label="Cómo se procesa una remesa" className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3 sm:gap-6 sm:px-6">
        {[
          { title: "Solicitud recibida", text: "El cliente deja sus datos y el monto.", icon: Inbox },
          { title: "Pago verificado", text: "Confirmas el ingreso y su referencia.", icon: ShieldCheck },
          { title: "Envío y factura", text: "Gestionas la entrega desde el envío.", icon: FileText },
        ].map((step, index) => <div key={step.title} className="flex items-start gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${index === 2 ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}><step.icon size={17} /></span><div><p className="text-xs font-bold text-slate-800"><span className="mr-1.5 text-slate-400">0{index + 1}</span>{step.title}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{step.text}</p></div></div>)}
      </section>
      <section aria-label="Resumen de la página actual" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Solicitudes", value: String(orders.length).padStart(2, "0"), hint: `Página ${page + 1} · ${statuses[status].tab.toLowerCase()}`, icon: Inbox },
          { label: status === "cancelled" ? "Monto solicitado" : "A entregar", value: usd(totals.amount), hint: "Monto para destinatarios", icon: ArrowDownLeft },
          { label: "Comisiones", value: usd(totals.commission), hint: "Por el servicio de remesa", icon: CircleDollarSign },
          { label: status === "paid" ? "Cobrado" : status === "cancelled" ? "Total cancelado" : "Por confirmar", value: usd(totals.total), hint: "Remesas + comisiones", icon: WalletCards },
        ].map((stat, index) => <div key={stat.label} className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${index === 3 ? "border-[#122b4a] bg-[#122b4a] text-white" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between gap-2"><p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${index === 3 ? "text-blue-100/70" : "text-slate-400"}`}>{stat.label}</p><stat.icon size={16} className={index === 3 ? "text-blue-200" : "text-slate-300"} /></div><p className={`mt-3 break-words text-xl font-extrabold tracking-tight sm:text-2xl ${index === 3 ? "text-white" : "text-[#122b4a]"}`}>{loading ? "—" : stat.value}</p><p className={`mt-1.5 text-[10px] leading-4 ${index === 3 ? "text-blue-100/65" : "text-slate-400"}`}>{stat.hint}</p></div>)}
      </section>
      {props.success && <section role="status" className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 lg:flex-row lg:items-center"><div className="flex gap-3"><CheckCircle2 size={22} className="shrink-0 text-emerald-600" /><div><p className="text-sm font-bold text-emerald-900">{props.success.text}</p>{props.success.shipmentId && <p className="mt-1 text-xs leading-5 text-emerald-800">La compra quedó vinculada. Ya puedes consultar la factura y gestionar la entrega.</p>}</div></div>{props.success.shipmentId && <div className="flex shrink-0 flex-col gap-2 sm:flex-row"><ShipmentLinks id={props.success.shipmentId} /></div>}</section>}
      {props.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{props.error}</div>}
      <section aria-label="Listado de órdenes" className="space-y-4">
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-2 lg:flex-row lg:items-center">
          <div role="group" aria-label="Filtrar por estado" className="grid grid-cols-2 gap-1 sm:grid-cols-4">{(Object.keys(statuses) as RemittanceFilter[]).map(value => <button key={value} type="button" aria-pressed={status === value} disabled={busy} onClick={() => props.onStatus(value)} className={`min-h-11 rounded-xl px-2.5 py-2 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 sm:px-4 ${status === value ? "bg-blue-50 text-blue-800" : "text-slate-500 hover:bg-slate-50"}`}>{statuses[value].tab}</button>)}</div>
          <div className="flex min-w-0 gap-2"><label className="relative min-w-0 flex-1"><span className="sr-only">Buscar en esta página</span><Search size={15} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><input type="search" value={search} onChange={event => props.onSearch(event.target.value)} placeholder="Buscar en esta página…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:w-56" /></label><button type="button" onClick={props.onRefresh} disabled={loading || busy} aria-label="Actualizar órdenes" title="Actualizar órdenes" className={`${button} border border-slate-200 bg-white px-3 text-slate-500 hover:bg-slate-50`}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button></div>
        </div>
        <div className="flex flex-wrap justify-between gap-1 px-1 text-[11px] text-slate-400"><span>{loading ? "Cargando solicitudes…" : `${visible.length} ${visible.length === 1 ? "solicitud" : "solicitudes"}${query ? ` de ${orders.length} en esta página` : " en esta página"}`}</span><span>Resumen de la página actual · USD</span></div>
        {loading ? <div role="status" className="grid min-h-56 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500"><span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" />Cargando órdenes…</span></div> : visible.length ? <div className="space-y-4">{visible.map(order => <RemittanceOrderCard key={order.id} order={order} busy={busy} onConfirm={props.onConfirm} onCancel={props.onCancel} whatsappStoreId={props.whatsappStoreId} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Inbox size={30} className="mx-auto text-slate-300" /><h2 className="mt-4 text-base font-bold text-slate-700">{query ? "No encontramos coincidencias" : "No hay solicitudes en esta página"}</h2><p className="mt-2 text-sm text-slate-400">{query ? "Prueba con otro nombre, teléfono o referencia." : status === "pending" ? "Las nuevas compras de remesas aparecerán aquí." : "Cambia el estado o vuelve a la página anterior."}</p></div>}
        <div className="flex items-center justify-between pt-2"><button type="button" disabled={page === 0 || loading || busy} onClick={() => props.onPage(page - 1)} className={`${button} border border-slate-200 bg-white text-slate-600`}><ChevronLeft size={15} />Anterior</button><span className="text-xs font-medium text-slate-500">Página {page + 1}</span><button type="button" disabled={orders.length < 50 || loading || busy} onClick={() => props.onPage(page + 1)} className={`${button} border border-slate-200 bg-white text-slate-600`}>Siguiente<ChevronRight size={15} /></button></div>
      </section>
    </div>
  </main>;
}
