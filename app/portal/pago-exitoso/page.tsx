"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

function PagoExitosoContent() {
  const searchParams = useSearchParams();
  const tracking = searchParams.get("tracking");

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={48} />
        <h1 className="text-2xl font-black text-slate-950">¡Pago recibido!</h1>
        <p className="mt-2 text-slate-600">
          {tracking ? `El saldo del envío ${tracking} quedó saldado.` : "Tu pago se procesó correctamente."}
        </p>
        <Link href="/portal/mis-envios" className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
          Volver a mis envíos
        </Link>
      </div>
    </main>
  );
}

export default function PagoExitosoPage() {
  return (
    <Suspense fallback={null}>
      <PagoExitosoContent />
    </Suspense>
  );
}
