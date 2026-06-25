"use client";

/* =========================================================
   CATEGORY PRODUCTS SECTION - PREMIUM

   Header con:
   - Icono por categoría
   - Descripción
   - Cantidad de productos
   - Imagen de fondo integrada
   - Botón Ver todos
   - Animación simple y segura con Tailwind
========================================================= */

import Link from "next/link";
import {
  ArrowRight,
  Baby,
  Beef,
  Beer,
  Home,
  Package,
  Pill,
  Shirt,
  ShoppingBasket,
  Snowflake,
  SprayCan,
  Smartphone,
} from "lucide-react";

import ProductCard from "./ProductCard";
import type { Product } from "@/types/cart";

type Props = {
  title: string;
  products: Product[];
  onAddToCart: (product: Product) => void;
};

const CATEGORY_META = {
  Alimentos: {
    description: "Arroz, aceite, carnes y productos básicos para tu familia.",
    icon: ShoppingBasket,
    bg: "from-green-50 to-white",
    iconBg: "bg-green-100 text-green-700",
    image: "/category-banners/alimentos.png",
  },
  Medicinas: {
    description: "Medicamentos y productos de salud y bienestar.",
    icon: Pill,
    bg: "from-emerald-50 to-white",
    iconBg: "bg-emerald-100 text-emerald-700",
    image: "/category-banners/medicinas.png",
  },
  Electrónicos: {
    description: "Equipos, accesorios y tecnología para el hogar.",
    icon: Smartphone,
    bg: "from-blue-50 to-white",
    iconBg: "bg-blue-100 text-blue-700",
    image: "/category-banners/electronicos.png",
  },
  Hogar: {
    description: "Productos esenciales para la casa.",
    icon: Home,
    bg: "from-slate-50 to-white",
    iconBg: "bg-slate-100 text-slate-700",
    image: "/category-banners/hogar.png",
  },
  Aseo: {
    description: "Limpieza, higiene y cuidado del hogar.",
    icon: SprayCan,
    bg: "from-cyan-50 to-white",
    iconBg: "bg-cyan-100 text-cyan-700",
    image: "/category-banners/aseo.png",
  },
  Bebidas: {
    description: "Bebidas y productos para acompañar tus comidas.",
    icon: Beer,
    bg: "from-orange-50 to-white",
    iconBg: "bg-orange-100 text-orange-700",
    image: "",
  },
  Carnicería: {
    description: "Carnes y proteínas para tus comidas.",
    icon: Beef,
    bg: "from-red-50 to-white",
    iconBg: "bg-red-100 text-red-700",
    image: "",
  },
  Congelados: {
    description: "Productos congelados listos para conservar.",
    icon: Snowflake,
    bg: "from-sky-50 to-white",
    iconBg: "bg-sky-100 text-sky-700",
    image: "",
  },
  Mascotas: {
    description: "Productos para mascotas y animales del hogar.",
    icon: Package,
    bg: "from-yellow-50 to-white",
    iconBg: "bg-yellow-100 text-yellow-700",
    image: "",
  },
  Bebés: {
    description: "Productos para bebés y cuidado infantil.",
    icon: Baby,
    bg: "from-pink-50 to-white",
    iconBg: "bg-pink-100 text-pink-700",
    image: "",
  },
  Ropa: {
    description: "Prendas y accesorios para toda la familia.",
    icon: Shirt,
    bg: "from-purple-50 to-white",
    iconBg: "bg-purple-100 text-purple-700",
    image: "",
  },
} as const;

export default function CategoryProductsSection({
  title,
  products,
  onAddToCart,
}: Props) {
  if (products.length === 0) return null;

  const previewProducts = products.slice(0, 4);
  const categorySlug = encodeURIComponent(title.toLowerCase());

  const meta =
    CATEGORY_META[title as keyof typeof CATEGORY_META] || {
      description: "Productos disponibles para tu familia.",
      icon: Package,
      bg: "from-slate-50 to-white",
      iconBg: "bg-slate-100 text-slate-700",
      image: "",
    };

  const Icon = meta.icon;
  const categoryImage = meta.image || "";

  return (
    <section id={title} className="scroll-mt-[170px] py-6">
      <div
        className={`
          relative mb-5 overflow-hidden rounded-3xl
          border border-slate-200
          bg-gradient-to-r ${meta.bg}
          px-5 py-4 shadow-sm
        `}
      >
        {categoryImage && (
          <>
            <img
              src={categoryImage}
              alt=""
              aria-hidden="true"
              className="
                pointer-events-none
                absolute inset-y-0 right-0
                h-full w-[70%]
                object-cover object-right
                opacity-25
                md:w-[52%]
                md:opacity-45
              "
            />

            <div
              className="
                pointer-events-none
                absolute inset-y-0 right-0
                w-full
                bg-gradient-to-r
                from-white/95
                via-white/75
                to-white/20
                md:w-[65%]
                md:from-white/95
                md:via-white/55
                md:to-white/5
              "
            />
          </>
        )}

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div
              className={`
                flex h-12 w-12 shrink-0 items-center justify-center
                rounded-2xl shadow-sm
                transition-transform duration-300
                hover:-translate-y-1
                ${meta.iconBg}
              `}
            >
              <Icon size={24} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-[#061b3a] md:text-3xl">
                {title}
              </h2>

              <p className="mt-1 max-w-[320px] text-xs font-medium leading-snug text-slate-500 md:text-sm">
                {meta.description}
              </p>

              <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                {products.length} productos disponibles
              </div>
            </div>
          </div>

          <Link
            href={`/tienda/categorias/${categorySlug}`}
            className="relative z-20 flex shrink-0 items-center gap-2 text-sm font-black text-red-600 hover:text-red-700"
          >
            Ver todos
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {previewProducts.map((product) => (
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