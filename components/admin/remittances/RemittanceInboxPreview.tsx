"use client";

import { useState } from "react";
import RemittanceInbox, { type RemittanceOrder, type RemittanceFilter } from "./RemittanceInbox";
import RemittanceActionDialog, { type RemittanceAction } from "./RemittanceActionDialog";

const examples: RemittanceOrder[] = [
  { id: "demo-001-aaaaaaaa", payload: { sender_name: "Cliente de ejemplo", sender_phone: "+1 305 555 0100", recipient_name: "Destinataria de ejemplo", recipient_phone: "+53 5555 0100", recipient_address: "Dirección de ejemplo", recipient_municipality: "Plaza de la Revolución", recipient_province: "La Habana" }, amount: 100, commission: 10, total: 110, status: "pending", shipment_id: null, payment_reference: null, created_at: "2026-11-03T15:30:00-05:00" },
  { id: "demo-002-bbbbbbbb", payload: { sender_name: "Otro cliente de ejemplo", sender_phone: "+1 305 555 0101", recipient_name: "Otro destinatario", recipient_phone: "+53 5555 0101", recipient_address: "Otra dirección de ejemplo", recipient_municipality: "Habana del Este", recipient_province: "La Habana", notes: "Coordinar la entrega por teléfono." }, amount: 200, commission: 16, total: 216, status: "pending", shipment_id: null, payment_reference: null, created_at: "2026-11-03T14:10:00-05:00" },
];

/** Preview-only UI fixtures. Never calls payment, order or shipment APIs. */
export default function RemittanceInboxPreview() {
  const [orders, setOrders] = useState(examples);
  const [status, setStatus] = useState<RemittanceFilter>("pending");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<RemittanceAction | null>(null);
  const [success, setSuccess] = useState<{ text: string; shipmentId?: string } | null>(null);
  return <div onClickCapture={event => {
    const anchor = (event.target as Element).closest("a");
    if (anchor?.getAttribute("href")?.startsWith("/admin/")) {
      event.preventDefault();
      setSuccess({ text: "Demostración: en la pantalla real este enlace abre la sección correspondiente." });
    }
  }}>
    <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">Vista de diseño · Datos ficticios · No registra pagos ni envíos reales</div>
    <RemittanceInbox storeName="Álvarez Travel" orders={orders.filter(order => status === "all" || order.status === status)} status={status} page={0} search={search} loading={false} busy={false} error="" success={success} onStatus={value => { setStatus(value); setSuccess(null); }} onSearch={setSearch} onRefresh={() => {}} onPage={() => {}} onConfirm={order => setAction({ order, type: "confirm", storeId: "demo" })} onCancel={order => setAction({ order, type: "cancel", storeId: "demo" })} />
    {action && <RemittanceActionDialog key={action.order.id + action.type} action={action} busy={false} error="" onClose={() => setAction(null)} onSubmit={reference => {
      setOrders(values => values.map(order => order.id !== action.order.id ? order : { ...order, status: action.type === "confirm" ? "paid" : "cancelled", shipment_id: action.type === "confirm" ? "demo-shipment" : null, payment_reference: action.type === "confirm" ? reference : null }));
      setSuccess({ text: action.type === "confirm" ? "Demostración: pago confirmado y envío creado." : "Demostración: solicitud cancelada.", shipmentId: action.type === "confirm" ? "demo-shipment" : undefined });
      setAction(null);
    }} />}
  </div>;
}
