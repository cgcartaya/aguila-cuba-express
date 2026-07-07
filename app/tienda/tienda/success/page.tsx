import Link from "next/link";
import { CheckCircle, ShoppingBag } from "lucide-react";

export default function SuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <CheckCircle className="mx-auto mb-4 text-green-600" size={64} />

        <h1 className="text-2xl font-bold text-gray-900">
          Orden creada correctamente
        </h1>

        <p className="mt-3 text-gray-600">
          Hemos recibido tu pedido. Próximamente conectaremos el pago real con
          Stripe.
        </p>

        <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
          Estado actual: <strong>Pendiente de pago</strong>
        </div>

        <Link
          href="/tienda"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 font-bold text-white"
        >
          <ShoppingBag size={20} />
          Volver a la tienda
        </Link>
      </div>
    </main>
  );
}