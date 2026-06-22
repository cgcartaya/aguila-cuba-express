"use client";

/* =========================================================
   STORE COMBOS SECTION - TIENDA PÚBLICA

   Sección de combos para mostrar en la home de la tienda.
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";

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
    <section className="mt-8">
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#061b3a]">
            Combos para tu familia
          </h2>

          <p className="text-sm font-semibold text-slate-500">
            Ahorra comprando paquetes preparados.
          </p>
        </div>

        <Link
          href="/tienda/combos"
          className="shrink-0 text-sm font-black text-[#061b3a]"
        >
          Ver todos ❯
        </Link>
      </div>

      {/* CARRUSEL */}
      <div className="flex gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {combos.slice(0, 6).map((combo) => (
          <StoreComboCard key={combo.id} combo={combo} />
        ))}
      </div>
    </section>
  );
}