"use client";

import { useState } from "react";
import {
  Building2,
  ExternalLink,
  FileDown,
  MessageCircle,
  Printer,
  Share2,
  X,
} from "lucide-react";

import type { Shipment } from "@/lib/shipping/types";

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function currency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getPublicBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (configured) return configured;

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

function buildInvoiceMessage(shipment: Shipment) {
  const baseUrl = getPublicBaseUrl();
  const trackingCode = shipment.tracking_code || shipment.id;

  const invoiceUrl =
    `${baseUrl}/factura/${encodeURIComponent(trackingCode)}`;

  const trackingUrl =
    `${baseUrl}/rastrear/${encodeURIComponent(trackingCode)}`;

  return [
    "🧾 *Águila Cuba Express*",
    "",
    `Hola ${shipment.sender_name || ""}, aquí tiene la información de su operación.`,
    "",
    `Código de rastreo: *${trackingCode}*`,
    `Destinatario: ${shipment.recipient_name || "Sin especificar"}`,
    `Total de la factura: *${currency(shipment.service_price)}*`,
    `Saldo pendiente: *${currency(shipment.balance_due)}*`,
    "",
    "📄 *Ver o descargar factura:*",
    invoiceUrl,
    "",
    "📦 *Rastrear el envío:*",
    trackingUrl,
  ].join("\n");
}

function openWhatsApp(
  type: "normal" | "business",
  phone: string,
  message: string
) {
  const cleanPhone = onlyDigits(phone);
  const encodedMessage = encodeURIComponent(message);
  const webFallback = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

  if (/Android/i.test(navigator.userAgent)) {
    const packageName =
      type === "business" ? "com.whatsapp.w4b" : "com.whatsapp";

    const intentUrl =
      `intent://send?phone=${cleanPhone}&text=${encodedMessage}` +
      `#Intent;scheme=whatsapp;package=${packageName};` +
      `S.browser_fallback_url=${encodeURIComponent(webFallback)};end`;

    window.location.href = intentUrl;
    return;
  }

  window.open(webFallback, "_blank", "noopener,noreferrer");
}

export default function InvoiceActions({
  shipment,
  compact = false,
}: {
  shipment: Shipment;
  compact?: boolean;
}) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  const phone = shipment.sender_phone || "";
  const trackingCode = shipment.tracking_code || shipment.id;
  const publicInvoiceUrl =
    `/factura/${encodeURIComponent(trackingCode)}`;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <a
          href={publicInvoiceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50"
        >
          <Printer size={17} />
          {compact ? "Factura" : "Ver factura"}
        </a>

        <button
          type="button"
          onClick={() => setSelectorOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <Share2 size={17} />
          {compact ? "WhatsApp" : "Compartir factura"}
        </button>
      </div>

      {selectorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-700">
                  Compartir operación
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-slate-950">
                  Elige WhatsApp
                </h2>

                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  El mensaje incluirá el enlace de la factura descargable,
                  el código y el enlace público de rastreo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectorOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {!phone && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                Este envío no tiene teléfono del remitente.
              </div>
            )}

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                disabled={!phone}
                onClick={() =>
                  openWhatsApp(
                    "normal",
                    phone,
                    buildInvoiceMessage(shipment)
                  )
                }
                className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <MessageCircle size={22} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-emerald-950">
                    WhatsApp normal
                  </span>
                  <span className="text-sm font-medium text-emerald-800/70">
                    Cuenta personal o WhatsApp Web
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={!phone}
                onClick={() =>
                  openWhatsApp(
                    "business",
                    phone,
                    buildInvoiceMessage(shipment)
                  )
                }
                className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-white">
                  <Building2 size={22} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-blue-950">
                    WhatsApp Business
                  </span>
                  <span className="text-sm font-medium text-blue-800/70">
                    En Android intenta abrir Business directamente
                  </span>
                </span>
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <FileDown size={17} className="text-blue-700" />
                Factura descargable desde la web
              </div>

              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                <ExternalLink size={17} className="text-blue-700" />
                Rastreo público incluido
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
