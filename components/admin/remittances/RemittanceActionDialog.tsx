"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, FileText, Loader2, ShieldCheck, X, XCircle } from "lucide-react";
import { usd, type RemittanceOrder } from "./RemittanceInbox";

export type RemittanceAction = { order: RemittanceOrder; type: "confirm" | "cancel"; storeId: string };

export function receivedAmountMatches(received: string, total: number) {
  const normalized = received.trim().replace(",", ".");
  return /^\d+(?:\.\d{1,2})?$/.test(normalized) && Number(normalized) === Number(total);
}

export default function RemittanceActionDialog({ action, busy, error, onClose, onSubmit }: {
  action: RemittanceAction;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (reference: string, received: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reference, setReference] = useState("");
  const [received, setReceived] = useState("");
  const isConfirm = action.type === "confirm";
  const matches = receivedAmountMatches(received, action.order.total);
  const canSubmit = !busy && (!isConfirm || (matches && reference.trim().length >= 3 && reference.trim().length <= 120));

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (canSubmit) onSubmit(reference.trim(), received);
  }

  return <dialog ref={dialogRef} aria-labelledby="remittance-action-title" aria-describedby="remittance-action-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-sm">
    <form onSubmit={submit}>
      <div className="flex items-center justify-between px-6 pt-6"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${isConfirm ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{isConfirm ? <ShieldCheck size={23} /> : <XCircle size={23} />}</span><button type="button" disabled={busy} onClick={onClose} aria-label="Cerrar" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40"><X size={19} /></button></div>
      <div className="px-6 pb-6"><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Solicitud #{action.order.id.slice(0, 8).toUpperCase()}</p><h2 id="remittance-action-title" className="mt-2 text-xl font-extrabold tracking-tight text-[#122b4a]">{isConfirm ? "Confirmar pago y crear envío" : "Cancelar esta solicitud"}</h2><p id="remittance-action-description" className="mt-2 text-sm leading-6 text-slate-500">{isConfirm ? "Comprueba que el dinero ya ingresó antes de continuar. Se creará un único envío con los datos de esta compra." : "El pedido dejará de estar pendiente. Esta acción no creará un envío de dinero."}</p>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destinatario</p><p className="mt-1 break-words text-sm font-bold text-slate-800">{action.order.payload.recipient_name}</p></div><div className="shrink-0 text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total · USD</p><p className="mt-1 text-xl font-extrabold text-[#122b4a]">{usd(action.order.total)}</p></div></div><p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500">Remesa {usd(action.order.amount)} + comisión {usd(action.order.commission)}</p></div>
        {isConfirm && <div className="mt-5 space-y-4"><label className="block text-xs font-bold text-slate-700" htmlFor="remittance-received">Importe recibido (USD)<input id="remittance-received" inputMode="decimal" autoComplete="off" required value={received} disabled={busy} onChange={event => setReceived(event.target.value)} placeholder="Escribe el total que recibiste" aria-describedby="remittance-amount-help" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><span id="remittance-amount-help" className={`mt-1.5 block text-[11px] font-normal ${received && !matches ? "text-amber-700" : "text-slate-400"}`}>{received && !matches ? `Debe coincidir con el total: ${usd(action.order.total)}.` : "Incluye el monto de la remesa y la comisión."}</span></label><label className="block text-xs font-bold text-slate-700" htmlFor="remittance-payment-reference">Referencia del pago<input id="remittance-payment-reference" minLength={3} maxLength={120} required disabled={busy} value={reference} onChange={event => setReference(event.target.value)} placeholder="Ej. referencia de transferencia o recibo" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><span className="mt-1.5 block text-[11px] font-normal text-slate-400">Quedará guardada como evidencia de tu confirmación.</span></label><div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800"><FileText size={16} className="mt-0.5 shrink-0" /><p>Al confirmar, podrás abrir la factura y gestionar el envío sin volver a ingresar los datos.</p></div></div>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">Volver</button><button type="submit" disabled={!canSubmit} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 ${isConfirm ? "bg-blue-700 hover:bg-blue-800" : "bg-red-600 hover:bg-red-700"}`}>{busy ? <Loader2 size={16} className="animate-spin" /> : isConfirm ? <CheckCircle2 size={16} /> : <XCircle size={16} />}{busy ? "Procesando…" : isConfirm ? "Confirmar y crear envío" : "Sí, cancelar pedido"}{isConfirm && !busy && <ArrowRight size={15} />}</button></div>
    </form>
  </dialog>;
}
