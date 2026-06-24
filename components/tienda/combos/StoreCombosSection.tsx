"use client";

/* =========================================================
   STORE COMBOS SECTION - TIENDA PÚBLICA

   Combos integrados como una categoría más.
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package2 } from "lucide-react";

import { getActiveCombos } from "@/lib/services/combos";
import StoreComboCard, { StoreCombo } from "./StoreComboCard";

export default function StoreCombosSection() {
  const [combos, setCombos] = useState<StoreCombo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCombos = async () => {
      const { data, error } = await getActiveCombos();

      if (error) {
        console.error("Error cargando combos públicos:", error);
        setLoading(false);
        return;
      }

      setCombos((data as StoreCombo[]) || []);
      setLoading(false);
    };

    loadCombos();
  }, []);

  if (loading) return null;
  if (combos.length === 0) return null;

  return (
    <section id="Combos" className="scroll-mt-[170px] py-6">
      {/* =========================================================
          HEADER PREMIUM DE COMBOS
      ========================================================= */}
      <div
        className="
          relative mb-5 overflow-hidden rounded-3xl
          border border-slate-200
          bg-gradient-to-r from-orange-50 to-white
          px-5 py-5 shadow-sm
          min-h-[140px]
        "
      >
        {/* Imagen de fondo (temporalmente reutilizamos alimentos) */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url('/category-banners/alimentos.png')",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "contain",
          }}
        />

        {/* Gradiente para mejorar legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-50 via-orange-50/95 to-transparent" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          {/* Lado izquierdo */}
          <div className="flex gap-4">
            <div
              className="
                flex h-12 w-12 shrink-0 items-center justify-center
                rounded-2xl bg-orange-100 text-orange-700 shadow-sm
              "
            >
              <Package2 size={24} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-[#061b3a] md:text-3xl">
                Combos
              </h2>

              <p className="mt-1 max-w-[320px] text-xs font-medium leading-snug text-slate-500 md:text-sm">
                Paquetes preparados para ahorrar dinero y enviar más a tu
                familia.
              </p>

              <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                {combos.length} combos disponibles
              </div>
            </div>
          </div>

          {/* Botón Ver Todos */}
          <Link
            href="/tienda/combos"
            className="
              flex shrink-0 items-center gap-2
              text-sm font-black text-red-600
              transition hover:text-red-700
            "
          >
            Ver todos
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* =========================================================
          LISTADO DE COMBOS
      ========================================================= */}
      <div className="flex gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {combos.slice(0, 6).map((combo) => (
          <StoreComboCard key={combo.id} combo={combo} />
        ))}
      </div>
    </section>
  );
}