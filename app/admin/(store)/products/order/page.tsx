import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProductCategoryOrderManager from "@/components/admin/products/ProductCategoryOrderManager";

export default function ProductOrderPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <section className="mx-auto max-w-4xl px-4 py-5">
        <Link
          href="/admin/products"
          className="mb-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
        >
          <ArrowLeft size={17} />
          Volver a productos
        </Link>

        <div className="mb-5">
          <p className="text-sm text-slate-500">Administración</p>
          <h1 className="text-3xl font-bold text-slate-900">
            Orden de productos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Elige qué productos aparecen primero en cada categoría y cuáles se
            muestran entre los cuatro destacados de la portada.
          </p>
        </div>

        <ProductCategoryOrderManager />
      </section>
    </main>
  );
}
