"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package2 } from "lucide-react";

import {
  getActiveCombos,
  getActiveCombosByStoreId,
} from "@/lib/services/combos";

import StoreComboCard, { StoreCombo } from "./StoreComboCard";

type Props = {
  storeId?: string;
  storeSlug?: string;
  /**
   * Solo usar en /tienda.
   * En /tienda/[slug] debe quedar false para evitar que cargue la tienda default
   * mientras todavía se está resolviendo el slug.
   */
  allowDefaultStore?: boolean;
};

export default function StoreCombosSection({
  storeId,
  storeSlug,
  allowDefaultStore = false,
}: Props) {
  const [combos, setCombos] = useState<StoreCombo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCombos = async () => {
      // IMPORTANTE MULTIEMPRESA:
      // En rutas por slug NO hacemos fallback a la tienda default.
      // Si no hay storeId todavía, no cargamos combos para evitar mostrar
      // combos de Águila dentro de DL Racing mientras carga el slug.
      if (!storeId && !allowDefaultStore) {
        setCombos([]);
        setLoading(false);
        return;
      }

      const { data, error } = storeId
        ? await getActiveCombosByStoreId(storeId)
        : await getActiveCombos();

      if (error) {
        console.error("Error cargando combos públicos:", error);
        setLoading(false);
        return;
      }

      setCombos((data as StoreCombo[]) || []);
      setLoading(false);
    };

    loadCombos();
  }, [storeId, allowDefaultStore]);

  if (loading) return null;
  if (combos.length === 0) return null;

  return (
    <section id="Combos" className="scroll-mt-[120px] py-3">
      <div className="mb-4 flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-orange-50 to-white px-4 py-3 shadow-sm md:px-5 md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 shadow-sm md:h-11 md:w-11">
            <Package2 size={22} />
          </div>

          <div className="min-w-0">
            <h2 className="text-2xl font-black leading-tight text-[#061b3a] md:text-3xl">
              Combos
            </h2>

            <p className="mt-0.5 max-w-[360px] text-xs font-medium leading-snug text-slate-500 md:text-sm">
              Paquetes preparados para ahorrar dinero y enviar más a tu familia.
            </p>

            <div className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
              {combos.length} combos disponibles
            </div>
          </div>
        </div>

        <Link
          href={storeSlug ? `/tienda/${storeSlug}/combos` : "/tienda/combos"}
          className="hidden shrink-0 items-center gap-2 text-xs font-black text-red-600 transition hover:text-red-700 sm:flex md:text-sm"
        >
          Ver todos
          <ArrowRight size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {combos.slice(0, 8).map((combo) => (
          <StoreComboCard key={combo.id} combo={combo} storeSlug={storeSlug} />
        ))}
      </div>
    </section>
  );
}