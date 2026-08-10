"use client";

import { Download, Printer } from "lucide-react";

export default function PublicInvoiceButtons() {
  return (
    <div className="invoice-no-print flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
      >
        <Download size={18} />
        Descargar como PDF
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
      >
        <Printer size={18} />
        Imprimir
      </button>
    </div>
  );
}
