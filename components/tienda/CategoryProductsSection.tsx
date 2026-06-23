"use client";

import ProductCard from "./ProductCard";

import type { Product } from "@/types/cart";

type Props = {
  title: string;
  products: Product[];
  onAddToCart: (product: Product) => void;
};

export default function CategoryProductsSection({
  title,
  products,
  onAddToCart,
}: Props) {
  if (products.length === 0) return null;

  return (
    <section
      id={title}
      className="scroll-mt-[170px] py-6"
    >
      <h2 className="mb-5 text-3xl font-black text-[#061b3a]">
        {title}
      </h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </section>
  );
}