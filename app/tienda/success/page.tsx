"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ExternalLink, MessageCircle, ShoppingBag } from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { trackPendingMetaPurchase } from "@/lib/analytics/meta-pixel";

type PendingWhatsappOrder = {
  orderNumber: string;
  orderUrl: string;
  storeUrl: string;
  businessWhatsapp: string;
  whatsappMessage: string;
};

const STORAGE_KEY = "perla_pending_whatsapp_order";

function normalizeWhatsappPhone(value: string) {
  let digits = value.replace(/\D/g, "");

  // Acepta números escritos como 0018032623676.
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Si tiene 10 dígitos, se interpreta como EE. UU./Canadá y se añade +1.
  if (digits.length === 10) {
    return `1${digits}`;
  }

  return digits;
}

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [pendingOrder, setPendingOrder] = useState<PendingWhatsappOrder | null>(null);

  useEffect(() => {
    // La orden ya fue confirmada antes de llegar aquí.
    // Limpiamos de nuevo como protección adicional por si esta pantalla
    // se abrió directamente, se recargó o el cambio de ruta ocurrió muy rápido.
    clearCart();

    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as PendingWhatsappOrder;
      if (
        parsed?.orderNumber &&
        parsed?.businessWhatsapp &&
        parsed?.whatsappMessage
      ) {
        setPendingOrder(parsed);
      }
    } catch (error) {
      console.error("No se pudo recuperar la orden para WhatsApp:", error);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderNumber = pendingOrder?.orderNumber || searchParams.get("order") || "";
  const orderUrl = pendingOrder?.orderUrl || (orderNumber ? `/pedido/${orderNumber}` : "/tienda");
  const storeUrl = pendingOrder?.storeUrl || "/tienda";

  const whatsappUrl = useMemo(() => {
    if (!pendingOrder) return "";

    const phone = normalizeWhatsappPhone(pendingOrder.businessWhatsapp);
    return `https://wa.me/${phone}?text=${pendingOrder.whatsappMessage}`;
  }, [pendingOrder]);

  useEffect(() => {
    if (orderNumber) trackPendingMetaPurchase(orderNumber);
  }, [orderNumber]);

  function handleViewOrder() {
    window.location.assign(orderUrl);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 text-center shadow-sm sm:p-8">
        <CheckCircle className="mx-auto mb-4 text-green-600" size={64} />

        <h1 className="text-2xl font-bold text-gray-900">
          Pedido creado correctamente
        </h1>

        <p className="mt-3 text-gray-600">
          Tu pedido ya fue guardado correctamente. Puedes enviarlo por WhatsApp,
          ver el pedido o volver a la tienda para seguir comprando.
        </p>

        {orderNumber && (
          <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
            Número de orden:
            <strong className="mt-1 block break-all text-gray-950">{orderNumber}</strong>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-4 font-bold text-white transition hover:bg-green-700"
            >
              <MessageCircle size={21} />
              Abrir WhatsApp para enviar el pedido
            </a>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No se pudo recuperar el mensaje de WhatsApp. La orden sí fue creada y
              puedes abrirla con el botón de abajo.
            </div>
          )}

          <button
            type="button"
            onClick={handleViewOrder}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-4 font-bold text-white transition hover:bg-gray-800"
          >
            <ExternalLink size={20} />
            Ver pedido guardado
          </button>

          <Link
            href={storeUrl}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-4 font-semibold text-gray-800"
          >
            <ShoppingBag size={20} />
            Volver a la tienda
          </Link>
        </div>

        <p className="mt-5 text-xs leading-5 text-gray-500">
          La compra ya quedó registrada y el carrito fue vaciado para evitar
          pedidos duplicados. Abrir WhatsApp no cambia ni elimina la orden guardada.
        </p>
      </div>
    </main>
  );
}


export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
          <div className="rounded-2xl bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">
            Cargando pedido...
          </div>
        </main>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}
