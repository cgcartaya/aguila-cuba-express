import Image from "next/image";
import Link from "next/link";
import { Package, Pencil } from "lucide-react";
import type { Product } from "./types";

type Props = {
  product: Product;
  children?: React.ReactNode;
};

export default function ProductCard({ product, children }: Props) {
  return (
    <div className="relative rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package size={26} className="text-slate-400" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="line-clamp-1 font-semibold text-slate-900">
                {product.name}
              </h3>
              <p className="text-xs text-slate-500">
                SKU: {product.sku || "Sin SKU"}
              </p>
            </div>

            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                product.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {product.is_active ? "Activo" : "Inactivo"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
              {product.category}
            </span>

            <span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">
              ${Number(product.price).toFixed(2)}
            </span>

            <span
              className={`rounded-full px-2 py-1 font-semibold ${
                product.stock <= 5
                  ? "bg-orange-100 text-orange-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Existencias: {product.stock}
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <Link
              href={`/admin/products/${product.id}/edit`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-slate-700"
            >
              <Pencil size={15} />
              Editar
            </Link>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}