"use client";

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
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#061b3a]">Combos</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Ahorra comprando paquetes preparados para tu familia.
          </p>
        </div>

        <Link
          href="/tienda/combos"
          className="hidden shrink-0 items-center gap-2 text-sm font-black text-red-600 sm:flex"
        >
          Ver todos
          <ArrowRight size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {combos.slice(0, 6).map((combo) => (
          <StoreComboCard key={combo.id} combo={combo} />
        ))}
      </div>
    </section>
  );
}