"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const groupUrl = "https://app.timelines.ai/chat/57099880/messages/";
const button = "rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-50";

export default function ManualWhatsappNotice({ storeId, sourceId, sourceKind }: {
  storeId: string;
  sourceId: string;
  sourceKind: "order" | "shipment";
}) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function act(action: "prepare_manual" | "confirm_manual" | "release_manual") {
    if (action === "confirm_manual" && !window.confirm("¿Confirmas que el mensaje ya aparece en el grupo Entrada de pedidos?")) return;
    setBusy(true);
    setFeedback("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/remittances/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ action, storeId, sourceId, sourceKind }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar el aviso.");
      setState(result.state);
      setMessage(result.message ?? "");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo actualizar el aviso.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setFeedback("Mensaje copiado. Pégalo en Entrada de pedidos.");
    } catch {
      setFeedback("Selecciona el texto y cópialo manualmente.");
    }
  }

  return <div className="my-2 min-w-0 space-y-2 text-left">
    {state === "manual_sent" ? <p className="text-sm text-emerald-700">Enviado manualmente</p>
      : state === "accepted" ? <p className="text-sm text-emerald-700">Aviso aceptado por el proveedor</p>
      : !message ? <button type="button" className={button} disabled={busy} onClick={() => void act("prepare_manual")}>
        Enviar manualmente por WhatsApp
      </button>
      : <>
        <p className="text-sm">Revisa el grupo antes de pegar el mensaje para evitar duplicados.</p>
        <textarea aria-label="Mensaje de WhatsApp" className="w-full rounded-lg border p-2 text-sm" rows={6} readOnly value={message} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={busy} onClick={() => void copy()}>Copiar mensaje</button>
          <a href={groupUrl} target="_blank" rel="noopener noreferrer" className={button}>Abrir Entrada de pedidos</a>
          <button type="button" className={button} disabled={busy} onClick={() => void act("confirm_manual")}>Marcar como enviado manualmente</button>
          <button type="button" className={button} disabled={busy} onClick={() => void act("release_manual")}>Cerrar sin confirmar</button>
        </div>
      </>}
    {feedback && <p role="status" className="text-sm">{feedback}</p>}
  </div>;
}
