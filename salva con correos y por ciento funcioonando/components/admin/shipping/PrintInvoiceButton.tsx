"use client";

import { Printer } from "lucide-react";

export default function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white print:hidden"
    >
      <Printer size={18} />
      Imprimir / Guardar PDF
    </button>
  );
}
