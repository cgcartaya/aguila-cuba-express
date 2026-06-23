import Image from "next/image";
import Link from "next/link";
import { Package, Pencil, AlertTriangle } from "lucide-react";
import type { Product } from "./types";

type Props = {
  product: Product;
  children?: React.ReactNode;
};

export default function ProductCard({
  product,
  children,
}: Props) {
  /* =========================================================
     ESTADO DEL INVENTARIO
  ========================================================= */

  const isOutOfStock = product.stock === 0;
  const isLowStock =
    product.stock > 0 && product.stock <= 5;

  return (
    <div
      className={`
        relative rounded-2xl p-3 shadow-sm transition
        ${
          isOutOfStock
            ? "border-2 border-red-200 bg-red-50"
            : "bg-white"
        }
      `}
    >
      {/* BADGE AGOTADO */}

      {isOutOfStock && (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white shadow">
          <AlertTriangle size={13} />
          AGOTADO
        </div>
      )}

      <div className="flex gap-3">
        {/* IMAGEN */}

        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              unoptimized
              className={`object-cover ${
                isOutOfStock
                  ? "opacity-60 grayscale"
                  : ""
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package
                size={26}
                className="text-slate-400"
              />
            </div>
          )}
        </div>

        {/* CONTENIDO */}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="pr-2">
              <h3 className="line-clamp-1 font-semibold text-slate-900">
                {product.name}
              </h3>

              <p className="text-xs text-slate-500">
                SKU: {product.sku || "Sin SKU"}
              </p>
            </div>

            {/* ACTIVO / INACTIVO */}

            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                product.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {product.is_active
                ? "Activo"
                : "Inactivo"}
            </span>
          </div>

          {/* TAGS */}

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
              {product.category}
            </span>

            <span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">
              ${Number(product.price).toFixed(2)}
            </span>

            {/* STOCK */}

            <span
              className={`rounded-full px-2 py-1 font-bold ${
                isOutOfStock
                  ? "bg-red-100 text-red-700"
                  : isLowStock
                  ? "bg-orange-100 text-orange-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {isOutOfStock
                ? "Agotado"
                : isLowStock
                ? `Bajo stock (${product.stock})`
                : `Stock: ${product.stock}`}
            </span>
          </div>

          {/* ALERTA VISUAL */}

          {isLowStock && (
            <div className="mt-3 rounded-xl bg-orange-100 px-3 py-2 text-xs font-semibold text-orange-700">
              ?? Quedan pocas unidades disponibles.
            </div>
          )}

          {isOutOfStock && (
            <div className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">
              ? Producto agotado. Reponer inventario.
            </div>
          )}

          {/* ACCIONES */}

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