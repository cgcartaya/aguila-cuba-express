"use client";

/* =========================================================
   TIENDA - COMBOS PÚBLICOS

   Página completa para mostrar todos los combos activos.
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift } from "lucide-react";

import { getActiveCombos } from "@/lib/services/combos";
import StoreComboCard, {
  StoreCombo,
} from "@/components/tienda/combos/StoreComboCard";

export default function StoreCombosPage() {
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

  return (
    <main className="pb-6">
      {/* HEADER */}
      <section className="mt-4 rounded-3xl bg-[#061b3a] px-5 py-6 text-white shadow-sm">
        <Link
          href="/tienda"
          className="mb-4 inline-flex items-center gap-2 text-sm font-black text-white/80"
        >
          <ArrowLeft size={18} />
          Volver a la tienda
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Gift size={30} />
          </div>

          <div>
            <h1 className="text-3xl font-black">
              Combos para tu familia
            </h1>

            <p className="mt-1 text-sm font-semibold text-white/70">
              Paquetes preparados con productos esenciales para Cuba.
            </p>
          </div>
        </div>
      </section>

      {/* LOADING */}
      {loading && (
        <div className="mt-6 rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Cargando combos...
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && combos.length === 0 && (
        <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Gift size={32} />
          </div>

          <h2 className="text-xl font-black text-[#061b3a]">
            No hay combos disponibles
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
            Próximamente agregaremos combos de alimentos, hogar, medicinas y más.
          </p>
        </div>
      )}

      {/* GRID */}
      {!loading && combos.length > 0 && (
        <section className="mt-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {combos.map((combo) => (
              <StoreComboCard key={combo.id} combo={combo} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}