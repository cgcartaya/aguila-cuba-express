"use client";

/* =========================================================
   CATEGORY SHOWCASE CARD

   Diseño inspirado en Walmart:
   - Encabezado coloreado por categoría.
   - Fondo suave según categoría.
   - Productos en mini cards individuales.
   - Compatible con móvil y desktop.
========================================================= */

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { Product } from "@/types/cart";

type Props = {
  category: string;
  products: Product[];
};

/* =========================================================
   COLORES DEL ENCABEZADO
========================================================= */

const CATEGORY_COLORS: Record<string, string> = {
  Combos: "bg-[#061b3a] text-white",
  Alimentos: "bg-green-500 text-white",
  Electrónicos: "bg-blue-500 text-white",
  Medicinas: "bg-purple-600 text-white",
  Hogar: "bg-orange-500 text-white",
  Aseo: "bg-cyan-500 text-white",
  Carnicería: "bg-emerald-700 text-white",
  Bebidas: "bg-yellow-400 text-[#061b3a]",
  Congelados: "bg-sky-500 text-white",
  Mascotas: "bg-amber-500 text-white",
  Bebés: "bg-pink-500 text-white",
  Ropa: "bg-fuchsia-500 text-white",
};

/* =========================================================
   FONDO SUAVE DE LA CUADRÍCULA
========================================================= */

const CATEGORY_BACKGROUNDS: Record<string, string> = {
  Combos: "bg-blue-50",
  Alimentos: "bg-green-50",
  Electrónicos: "bg-blue-50",
  Medicinas: "bg-purple-50",
  Hogar: "bg-orange-50",
  Aseo: "bg-cyan-50",
  Carnicería: "bg-emerald-50",
  Bebidas: "bg-yellow-50",
  Congelados: "bg-sky-50",
  Mascotas: "bg-amber-50",
  Bebés: "bg-pink-50",
  Ropa: "bg-fuchsia-50",
};

export default function CategoryShowcaseCard({
  category,
  products,
}: Props) {
  const previewProducts = products.slice(0, 4);
  const categorySlug = encodeURIComponent(category.toLowerCase());

  const colorClass =
    CATEGORY_COLORS[category] || "bg-blue-500 text-white";

  const backgroundClass =
    CATEGORY_BACKGROUNDS[category] || "bg-slate-50";

  return (
    <Link
      href={`/tienda/categorias/${categorySlug}`}
      className={`
        min-w-[85%]
        snap-start
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        p-2
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-lg
        sm:min-w-[420px]
        ${backgroundClass}
      `}
    >
      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <div
        className={`
          mb-2
          flex
          items-center
          justify-between
          rounded-xl
          px-4
          py-3
          ${colorClass}
        `}
      >
        <h3 className="text-lg font-black">
          {category}
        </h3>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <ChevronRight size={22} />
        </div>
      </div>

      {/* =====================================================
          CUADRÍCULA DE PRODUCTOS
      ===================================================== */}

      <div
  className={`
    grid
    grid-cols-2
    gap-3
    rounded-xl
    p-3
    ${backgroundClass}
  `}
>
        {previewProducts.map((product) => (
          <div
            key={product.id}
           className="
  overflow-hidden
  rounded-xl
  border
  border-slate-200
  bg-white
  p-3
  shadow-sm
  transition-all
  duration-300
  hover:-translate-y-1
  hover:shadow-md
"
          >
            {/* IMAGEN */}

            <div className="relative h-24 w-full rounded-lg bg-white">
              <Image
                src={product.image_url || "/placeholder-product.png"}
                alt={product.name}
                fill
                unoptimized
                className="object-contain"
              />
            </div>

            {/* NOMBRE */}

            <p className="mt-3 line-clamp-2 min-h-[42px] text-sm font-bold text-[#061b3a]">
              {product.name}
            </p>

            {/* TEXTO PROMOCIONAL */}

            <p className="mt-1 text-sm font-black text-red-600">
              Ahorra más
            </p>
          </div>
        ))}
      </div>
    </Link>
  );
}