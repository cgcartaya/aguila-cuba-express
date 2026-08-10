"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";

export default function PagoCanceladoPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <CircleAlert className="mx-auto mb-4 text-amber-500" size={48} />
        <h1 className="text-2xl font-black text-slate-950">Pago cancelado</h1>
        <p className="mt-2 text-slate-600">No se realizó ningún cargo. Puedes intentarlo de nuevo cuando quieras.</p>
        <Link href="/portal/mis-envios" className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
          Volver a mis envíos
        </Link>
      </div>
    </main>
  );
}
