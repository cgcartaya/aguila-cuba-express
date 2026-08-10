import ProductCategoryOrderManager from "@/components/admin/products/ProductCategoryOrderManager";
import ProductSectionTabs from "@/components/admin/products/ProductSectionTabs";

export default function ProductOrderPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <section className="mx-auto max-w-5xl px-4 py-5">
        <div className="mb-5">
          <p className="text-sm text-slate-500">Administración</p>
          <h1 className="text-3xl font-bold text-slate-900">
            Orden por categoría
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Selecciona una categoría y arrastra sus productos para decidir el
            orden en que aparecen en la tienda.
          </p>
        </div>

        <ProductSectionTabs />
        <ProductCategoryOrderManager />
      </section>
    </main>
  );
}
