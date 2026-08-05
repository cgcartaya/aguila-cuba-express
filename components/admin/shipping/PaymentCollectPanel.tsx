"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Loader2,
  MessageCircle,
  QrCode,
  Smartphone,
  Tablet,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { openWhatsAppMessage } from "@/lib/utils/whatsapp";

type CardMode = null | "choose" | "customer-link";

export type PaymentCollectShipment = {
  id: string;
  trackingCode: string;
  servicePrice: number;
  customerPhone?: string;
};

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token || ""}`, "Content-Type": "application/json" };
}

function currency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

// Panel de cobro reutilizable: efectivo, tarjeta en el mismo dispositivo,
// o tarjeta en el teléfono del cliente (QR + WhatsApp, con un solo link
// generado). Se usa tanto en la pantalla de recogida como en el botón
// "Cobrar" de cualquier lista de envíos.
export default function PaymentCollectPanel({
  shipment,
  onPaid,
}: {
  shipment: PaymentCollectShipment;
  onPaid: (folio: string | null) => void;
}) {
  const [payError, setPayError] = useState("");
  const [payBusy, setPayBusy] = useState<"cash" | "card" | null>(null);
  const [cardMode, setCardMode] = useState<CardMode>(null);
  const [cardCheckoutUrl, setCardCheckoutUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cardMode !== "customer-link") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    async function poll() {
      const headers = await authHeaders();
      const res = await fetch(`/api/admin/shipping/payment-status?shipmentId=${encodeURIComponent(shipment.id)}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (json.paymentStatus === "paid") {
        onPaid(json.folio || null);
      }
    }

    pollRef.current = setInterval(() => void poll(), 4000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardMode, shipment.id]);

  async function payCash() {
    setPayBusy("cash");
    setPayError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/shipping/mark-paid-cash", {
        method: "POST",
        headers,
        body: JSON.stringify({ shipmentId: shipment.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo marcar el pago en efectivo.");
      onPaid(json.folio || null);
    } catch (e) {
      setPayError((e as Error).message);
    } finally {
      setPayBusy(null);
    }
  }

  async function payCardOnTablet() {
    setPayBusy("card");
    setPayError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/shipping/charge-card", {
        method: "POST",
        headers,
        body: JSON.stringify({ shipmentId: shipment.id, deliveryChannel: "tablet" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo iniciar el cobro con tarjeta.");
      window.location.href = json.url;
    } catch (e) {
      setPayError((e as Error).message);
      setPayBusy(null);
    }
  }

  async function generateCustomerLink() {
    setPayBusy("card");
    setPayError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/shipping/charge-card", {
        method: "POST",
        headers,
        body: JSON.stringify({ shipmentId: shipment.id, deliveryChannel: "customer" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo generar el link de pago.");

      setCardCheckoutUrl(json.url);
      const dataUrl = await QRCode.toDataURL(json.url, { width: 320, margin: 1 });
      setQrDataUrl(dataUrl);
      setCardMode("customer-link");
    } catch (e) {
      setPayError((e as Error).message);
    } finally {
      setPayBusy(null);
    }
  }

  function sendCheckoutByWhatsApp() {
    if (!cardCheckoutUrl) return;
    if (!shipment.customerPhone) {
      setPayError("No hay un teléfono guardado para este cliente — usa el QR en su lugar, o escríbelo a mano en WhatsApp.");
      return;
    }
    try {
      openWhatsAppMessage({
        app: "personal",
        phone: shipment.customerPhone,
        message: `Hola! Para completar el pago de tu envío ${shipment.trackingCode} (${currency(shipment.servicePrice)}) con Aguila Express USA, paga aquí con tu tarjeta: ${cardCheckoutUrl}`,
      });
    } catch (e) {
      setPayError((e as Error).message);
    }
  }

  function backToCardChoice() {
    setCardMode(null);
    setCardCheckoutUrl(null);
    setQrDataUrl(null);
    setPayError("");
  }

  if (cardMode === "customer-link") {
    return (
      <div>
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[.16em] text-violet-700">Envío {shipment.trackingCode}</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Pago desde su teléfono — {currency(shipment.servicePrice)}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Esto se actualiza solo en cuanto el cliente termine de pagar.</p>
        </div>

        {payError && <div className="mx-auto mt-5 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm font-bold text-rose-700">{payError}</div>}

        <div className="mx-auto mt-6 flex max-w-xs flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="Código QR para pagar" className="h-52 w-52 rounded-2xl border border-slate-200 bg-white p-2" />
          ) : (
            <div className="flex h-52 w-52 items-center justify-center rounded-2xl border border-dashed border-slate-300">
              <QrCode size={40} className="text-slate-300" />
            </div>
          )}
          <p className="text-center text-xs font-bold uppercase tracking-wide text-slate-400">Que el cliente escanee con la cámara de su teléfono</p>
        </div>

        <div className="mx-auto mt-6 flex max-w-xs flex-col gap-3">
          <button
            type="button"
            onClick={sendCheckoutByWhatsApp}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            <MessageCircle size={18} /> Enviar por WhatsApp
          </button>

          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-3 text-center text-xs font-semibold text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Esperando confirmación de pago...
          </div>

          <button type="button" onClick={backToCardChoice} className="mx-auto mt-1 flex items-center gap-2 text-sm font-bold text-slate-500">
            <ArrowLeft size={16} /> Volver a las opciones de cobro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">Envío {shipment.trackingCode}</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Cobrar {currency(shipment.servicePrice)}</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          {cardMode === "choose" ? "¿Dónde va a pagar con tarjeta?" : "Elige cómo te está pagando el cliente."}
        </p>
      </div>

      {payError && <div className="mx-auto mt-5 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm font-bold text-rose-700">{payError}</div>}

      {cardMode !== "choose" ? (
        <div className="mx-auto mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={payCash}
            disabled={payBusy !== null}
            className="flex flex-col items-center gap-3 rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-7 text-emerald-800 transition hover:border-emerald-400 disabled:opacity-50"
          >
            {payBusy === "cash" ? <Loader2 size={36} className="animate-spin" /> : <Banknote size={36} />}
            <span className="text-base font-black">Efectivo</span>
          </button>

          <button
            type="button"
            onClick={() => setCardMode("choose")}
            disabled={payBusy !== null}
            className="flex flex-col items-center gap-3 rounded-3xl border-2 border-blue-200 bg-blue-50 p-7 text-blue-800 transition hover:border-blue-400 disabled:opacity-50"
          >
            <CreditCard size={36} />
            <span className="text-base font-black">Tarjeta</span>
          </button>
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={payCardOnTablet}
              disabled={payBusy !== null}
              className="flex flex-col items-center gap-3 rounded-3xl border-2 border-blue-200 bg-blue-50 p-7 text-blue-800 transition hover:border-blue-400 disabled:opacity-50"
            >
              {payBusy === "card" ? <Loader2 size={32} className="animate-spin" /> : <Tablet size={32} />}
              <span className="text-center text-sm font-black">En este dispositivo</span>
              <span className="text-center text-xs font-semibold text-blue-700/70">El cliente teclea su tarjeta aquí mismo.</span>
            </button>

            <button
              type="button"
              onClick={generateCustomerLink}
              disabled={payBusy !== null}
              className="flex flex-col items-center gap-3 rounded-3xl border-2 border-violet-200 bg-violet-50 p-7 text-violet-800 transition hover:border-violet-400 disabled:opacity-50"
            >
              {payBusy === "card" ? <Loader2 size={32} className="animate-spin" /> : <Smartphone size={32} />}
              <span className="text-center text-sm font-black">En su teléfono</span>
              <span className="text-center text-xs font-semibold text-violet-700/70">WhatsApp o QR.</span>
            </button>
          </div>

          <button type="button" onClick={() => setCardMode(null)} className="mx-auto mt-4 flex items-center gap-2 text-sm font-bold text-slate-500">
            <ArrowLeft size={16} /> Volver
          </button>
        </div>
      )}
    </div>
  );
}
