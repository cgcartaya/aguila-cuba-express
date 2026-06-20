import { Package } from "lucide-react";

export default function ProductsEmptyState() {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
      <Package className="mx-auto mb-3 text-slate-400" size={36} />

      <h2 className="font-semibold text-slate-800">
        No hay productos encontrados
      </h2>

      <p className="text-sm text-slate-500">
        Prueba cambiando los filtros o agrega un producto nuevo.
      </p>
    </div>
  );
}