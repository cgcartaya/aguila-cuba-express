"use client";

/* =========================================================
   STORE COMBOS SECTION - TIENDA PÚBLICA

   Sección de combos en la home de la tienda.

   Diseño:
   - Header comercial
   - Carrusel horizontal móvil
   - Tarjetas visualmente unificadas con productos
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
      {/* HEADER */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#061b3a] md:text-3xl">
            Combos para tu familia
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Ahorra comprando paquetes preparados.
          </p>
        </div>

        <Link
          href="/tienda/combos"
          className="flex shrink-0 items-center gap-1 text-sm font-black text-[#061b3a] transition hover:text-red-600"
        >
          Ver todos
          <ChevronRight size={18} />
        </Link>
      </div>

      {/* CARRUSEL */}
      <div className="flex gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {combos.slice(0, 6).map((combo) => (
          <StoreComboCard
            key={combo.id}
            combo={combo}
          />
        ))}
      </div>
    </section>
  );
}