"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { Product } from "@/types/cart";

type Props = {
  category: string;
  products: Product[];
};

export default function CategoryShowcaseCard({
  category,
  products,
}: Props) {
  const previewProducts = products.slice(0, 4);
  const categorySlug = encodeURIComponent(category.toLowerCase());

  return (
    <Link
      href={`/tienda/categorias/${categorySlug}`}
      className="min-w-[85%] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:min-w-[420px]"
    >
      <div className="flex items-center justify-between bg-blue-700 px-4 py-3 text-white">
        <h3 className="text-lg font-black">{category}</h3>
        <ChevronRight size={22} />
      </div>

      <div className="grid grid-cols-2 gap-0">
        {previewProducts.map((product) => (
          <div
            key={product.id}
            className="border-r border-t border-slate-100 p-3"
          >
            <div className="relative h-24 w-full">
              <Image
                src={product.image_url || "/placeholder-product.png"}
                alt={product.name}
                fill
                unoptimized
                className="object-contain"
              />
            </div>

            <p className="mt-2 line-clamp-1 text-sm font-bold text-[#061b3a]">
              {product.name}
            </p>

            <p className="mt-1 text-sm font-black text-red-600">
              Ahorra más
            </p>
          </div>
        ))}
      </div>
    </Link>
  );
}