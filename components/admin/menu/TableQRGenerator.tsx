"use client";

import { useMemo, useState } from "react";
import { Download, Printer, QrCode } from "lucide-react";

const PLATFORM_DOMAIN = "perlamarketplace.com";

// API pública de generación de QR — se pide como <img>, no hace falta
// instalar ninguna librería ni generar el QR en el servidor. Es el
// mismo servicio que ya usan miles de negocios para imprimir mesas.
function qrImageUrl(data: string, size = 480) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(
    data
  )}`;
}

type Props = {
  storeSlug: string;
  storeName: string;
  /** Dominio propio de la tienda si lo tiene (ej. depariscuba.com). */
  customDomain?: string | null;
};

/**
 * Genera un código QR por cada mesa, que apunta directo a la carta
 * digital con la mesa ya identificada (/menu/slug?mesa=N) — el
 * cliente escanea, cae directo en el menú y el pedido ya sale marcado
 * "En el restaurante, Mesa N" sin que tenga que escribir nada. Este es
 * el flujo que ya usan la mayoría de los bares y restaurantes en Cuba.
 *
 * Cada tarjeta se puede descargar individualmente, o imprimir todas
 * juntas en una hoja lista para recortar y plastificar.
 */
export default function TableQRGenerator({ storeSlug, storeName, customDomain }: Props) {
  const [tableCount, setTableCount] = useState(10);
  const [startAt, setStartAt] = useState(1);

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const host = customDomain?.trim() || `${storeSlug}.${PLATFORM_DOMAIN}`;
    return `https://${host}`;
  }, [customDomain, storeSlug]);

  const tables = useMemo(() => {
    const count = Math.min(Math.max(tableCount, 1), 60);
    const start = Math.max(startAt, 1);
    return Array.from({ length: count }, (_, i) => start + i);
  }, [tableCount, startAt]);

  const urlForTable = (table: number) => `${baseUrl}/menu/${storeSlug}?mesa=${table}`;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <QrCode size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900">Códigos QR de mesa</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Cada QR abre la carta de {storeName} directo en la mesa correspondiente —
            imprímelos y pégalos en cada mesa o en la barra.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-4 border-t border-slate-100 pt-5 print:hidden">
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          Mesa inicial
          <input
            type="number"
            min={1}
            value={startAt}
            onChange={(e) => setStartAt(Number(e.target.value) || 1)}
            className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          Cantidad de mesas
          <input
            type="number"
            min={1}
            max={60}
            value={tableCount}
            onChange={(e) => setTableCount(Number(e.target.value) || 1)}
            className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#061b3a] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <Printer size={17} />
          Imprimir todas
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-6">
        {tables.map((table) => (
          <div
            key={table}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 p-4 text-center print:break-inside-avoid"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl(urlForTable(table))}
              alt={`QR mesa ${table}`}
              className="h-32 w-32 sm:h-36 sm:w-36"
            />
            <p className="text-sm font-black text-slate-900">Mesa {table}</p>
            <p className="break-all text-[10px] font-semibold text-slate-400 print:hidden">
              {urlForTable(table)}
            </p>
            <a
              href={qrImageUrl(urlForTable(table), 800)}
              download={`mesa-${table}-${storeSlug}.png`}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800 print:hidden"
            >
              <Download size={13} /> Descargar
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
