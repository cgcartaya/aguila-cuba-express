"use client";

/* =========================================================
   TIENDA - COMBOS PÚBLICOS

   Página completa para mostrar todos los combos activos.
========================================================= */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Gift } from "lucide-react";

import { getActiveCombosByStoreId } from "@/lib/services/combos";
import { useStore } from "@/hooks/useStore";
import StoreComboCard, {
  StoreCombo,
} from "@/components/tienda/combos/StoreComboCard";

export default function StoreCombosPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { store, loading: storeLoading } = useStore();

  const [combos, setCombos] = useState<StoreCombo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCombos = async () => {
      if (storeLoading) return;

      if (!store?.id) {
        setCombos([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await getActiveCombosByStoreId(store.id);

      if (error) {
        console.error("Error cargando combos públicos:", error);
        setLoading(false);
        return;
      }

      const normalizedCombos: StoreCombo[] = (data || []).map((combo) => ({
        id: String(combo.id),
        name: combo.name,
        description: combo.description,
        image_url: combo.image_url,
        price: Number(combo.price || 0),
        combo_items: (combo.combo_items || []).map((item) => {
          const relatedProduct = Array.isArray(item.products)
            ? item.products[0] ?? null
            : item.products ?? null;

          return {
            id: String(item.id),
            quantity: Number(item.quantity || 1),
            products: relatedProduct
              ? {
                  id: String(relatedProduct.id),
                  name: relatedProduct.name,
                  price: Number(relatedProduct.price || 0),
                }
              : null,
          };
        }),
      }));

      setCombos(normalizedCombos);
      setLoading(false);
    };

    loadCombos();
  }, [store?.id, storeLoading]);

  return (
    <main className="pb-6">
      {/* =====================================================
          TÍTULO
      ===================================================== */}
      <section className="mt-4">
        <h1 className="text-3xl font-black text-[#061b3a]">
          Combos
        </h1>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          Ahorra comprando paquetes preparados para tu familia.
        </p>
      </section>

      {/* =====================================================
          LOADING
      ===================================================== */}
      {loading && (
        <div className="mt-6 rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Cargando combos...
        </div>
      )}

      {/* =====================================================
          VACÍO
      ===================================================== */}
      {!loading && combos.length === 0 && (
        <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Gift size={32} />
          </div>

          <h2 className="text-xl font-black text-[#061b3a]">
            No hay combos disponibles
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
            Próximamente agregaremos combos de alimentos,
            hogar, medicinas y más.
          </p>
        </div>
      )}

      {/* =====================================================
          GRID
      ===================================================== */}
      {!loading && combos.length > 0 && (
        <section className="mt-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {combos.map((combo) => (
              <StoreComboCard
                key={combo.id}
                combo={combo}
                storeSlug={slug}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}