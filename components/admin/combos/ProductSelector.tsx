"use client";

/* =========================================================
   PRODUCT SELECTOR - COMBOS ADMIN

   Permite seleccionar productos existentes para construir
   un combo y controlar la cantidad de cada producto.
========================================================= */

import Image from "next/image";
import { Minus, Plus, ShoppingBasket } from "lucide-react";

import type {
  ComboProduct,
  SelectedComboProduct,
} from "./types";

type ProductSelectorProps = {
  products: ComboProduct[];
  selectedProducts: SelectedComboProduct[];
  setSelectedProducts: React.Dispatch<
    React.SetStateAction<SelectedComboProduct[]>
  >;
};

/* =========================================================
   OBTENER IMAGEN PRINCIPAL DEL PRODUCTO
========================================================= */

function getMainImage(product: ComboProduct) {
  const mainImage =
    product.product_images?.find((img) => img.is_main) ||
    product.product_images
      ?.slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];

  return mainImage?.image_url || "/placeholder-product.png";
}

export default function ProductSelector({
  products,
  selectedProducts,
  setSelectedProducts,
}: ProductSelectorProps) {
  /* =========================================================
     VERIFICAR SI UN PRODUCTO YA ESTÁ EN EL COMBO
  ========================================================= */

  const getSelectedItem = (productId: string) => {
    return selectedProducts.find(
      (item) => item.product.id === productId
    );
  };

  /* =========================================================
     AGREGAR PRODUCTO AL COMBO
  ========================================================= */

  const addProduct = (product: ComboProduct) => {
    const alreadySelected = getSelectedItem(product.id);

    if (alreadySelected) return;

    setSelectedProducts((current) => [
      ...current,
      {
        product,
        quantity: 1,
      },
    ]);
  };

  /* =========================================================
     AUMENTAR CANTIDAD
  ========================================================= */

  const increaseQuantity = (productId: string) => {
    setSelectedProducts((current) =>
      current.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  };

  /* =========================================================
     DISMINUIR CANTIDAD
  ========================================================= */

  const decreaseQuantity = (productId: string) => {
    setSelectedProducts((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-[#061b3a]">
          Productos del combo
        </h2>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          Selecciona productos existentes y define cuántas unidades incluye el combo.
        </p>
      </div>

      <div className="grid gap-3">
        {products.map((product) => {
          const selectedItem = getSelectedItem(product.id);
          const isSelected = Boolean(selectedItem);

          return (
            <article
              key={product.id}
              className={`flex items-center gap-4 rounded-2xl border p-3 transition ${
                isSelected
                  ? "border-red-200 bg-red-50"
                  : "border-slate-100 bg-white hover:bg-slate-50"
              }`}
            >
              {/* IMAGEN */}
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                <Image
                  src={getMainImage(product)}
                  alt={product.name}
                  fill
                  unoptimized
                  className="object-contain p-2"
                />
              </div>

              {/* INFO */}
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-1 text-sm font-black text-[#061b3a]">
                  {product.name}
                </h3>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Stock: {product.stock} · ${Number(product.price).toFixed(2)}
                </p>

                {product.category && (
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {product.category}
                  </p>
                )}
              </div>

              {/* ACCIONES */}
              {isSelected ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => decreaseQuantity(product.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-600 shadow-sm"
                  >
                    <Minus size={16} />
                  </button>

                  <span className="min-w-6 text-center text-sm font-black text-[#061b3a]">
                    {selectedItem?.quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => increaseQuantity(product.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => addProduct(product)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#061b3a] text-white"
                >
                  <ShoppingBasket size={18} />
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}