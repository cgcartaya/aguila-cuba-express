"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package2 } from "lucide-react";

import {
  getActiveCombos,
  getActiveCombosByStoreId,
} from "@/lib/services/combos";

import StoreComboCard, {
  StoreCombo,
} from "./StoreComboCard";

type Props = {
  storeId?: string;
};

export default function StoreCombosSection({
  storeId,
}: Props) {
  const [combos, setCombos] = useState<StoreCombo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCombos = async () => {
      const { data, error } = storeId
        ? await getActiveCombosByStoreId(storeId)
        : await getActiveCombos();

      if (error) {
        console.error(
          "Error cargando combos públicos:",
          error
        );

        setLoading(false);
        return;
      }

      setCombos((data as StoreCombo[]) || []);
      setLoading(false);
    };

    loadCombos();
  }, [storeId]);

  if (loading) return null;
  if (combos.length === 0) return null;

  return (
    <section
      id="Combos"
      className="scroll-mt-[170px] py-6"
    >
      <div className="mb-5 flex items-center justify-between gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-orange-50 to-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 shadow-sm">
            <Package2 size={26} />
          </div>

          <div>
            <h2 className="text-3xl font-black text-[#061b3a]">
              Combos
            </h2>

            <p className="mt-1 max-w-[340px] text-sm font-medium leading-snug text-slate-500">
              Paquetes preparados para ahorrar
              dinero y enviar más a tu familia.
            </p>

            <div className="mt-3 inline-flex rounded-full bg-white px-4 py-1 text-sm font-black text-slate-600 shadow-sm">
              {combos.length} combos disponibles
            </div>
          </div>
        </div>

        <Link
          href="/tienda/combos"
          className="hidden shrink-0 items-center gap-2 text-sm font-black text-red-600 transition hover:text-red-700 sm:flex"
        >
          Ver todos
          <ArrowRight size={20} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {combos.slice(0, 8).map((combo) => (
          <StoreComboCard
            key={combo.id}
            combo={combo}
          />
        ))}
      </div>
    </section>
  );
}