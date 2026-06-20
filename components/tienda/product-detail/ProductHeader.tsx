"use client";

/* ==========================
   IMPORTS
========================== */

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";

/* ==========================
   PROPS
========================== */

type ProductHeaderProps = {
  cartCount: number;
};

/* ==========================
   HEADER - DETALLE DE PRODUCTO
========================== */

export default function ProductHeader({
  cartCount,
}: ProductHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link
          href="/tienda"
          className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold text-[#061b3a]"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Volver</span>
        </Link>

        <Link href="/tienda" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Águila Cuba Express"
            width={42}
            height={42}
            className="rounded-full"
          />

          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-black uppercase">
              Águila Cuba Express
            </p>
            <p className="text-xs font-bold text-slate-500">
              Tienda online
            </p>
          </div>
        </Link>

        <Link
          href="/cart"
          className="relative rounded-full border p-2 text-[#061b3a]"
        >
          <ShoppingCart size={22} />

          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white">
            {cartCount}
          </span>
        </Link>
      </div>
    </header>
  );
}