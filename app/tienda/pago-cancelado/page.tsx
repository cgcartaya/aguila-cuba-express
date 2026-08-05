"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleAlert, ExternalLink, ShoppingBag } from "lucide-react";

function CancelledPageContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 text-center shadow-sm sm:p-8">
        <CircleAlert className="mx-auto mb-4 text-amber-500" size={64} />

        <h1 className="text-2xl font-bold text-gray-900">Pago no completado</h1>

        <p className="mt-3 text-gray-600">
          Cancelaste el pago con tarjeta. Tu pedido sigue guardado — puedes intentarlo de nuevo cuando quieras.
        </p>

        {orderNumber && (
          <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
            Número de orden:
            <strong className="mt-1 block break-all text-gray-950">{orderNumber}</strong>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {orderNumber && (
            <Link
              href={`/pedido/${encodeURIComponent(orderNumber)}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-4 font-bold text-white transition hover:bg-gray-800"
            >
              <ExternalLink size={20} />
              Ver mi pedido
            </Link>
          )}

          <Link
            href="/tienda"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-4 font-semibold text-gray-800"
          >
            <ShoppingBag size={20} />
            Volver a la tienda
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function TiendaPagoCanceladoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
          <div className="rounded-2xl bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">Cargando...</div>
        </main>
      }
    >
      <CancelledPageContent />
    </Suspense>
  );
}
