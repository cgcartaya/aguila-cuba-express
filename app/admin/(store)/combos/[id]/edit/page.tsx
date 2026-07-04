"use client";

/* =========================================================
   ADMIN - EDITAR COMBO

   Carga:
   - Combo por ID
   - Productos disponibles
   - Productos ya incluidos en el combo

   Corrección:
   - Supabase puede devolver combo_items.products como objeto o array.
   - Normalizamos esa relación.
   - Evitamos type predicates conflictivos con SelectedComboProduct.
========================================================= */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import ComboForm from "@/components/admin/combos/ComboForm";
import { getComboById } from "@/lib/services/combos";
import { getProductsForCombos } from "@/lib/services/products";

import type {
  ComboFormData,
  ComboProduct,
  SelectedComboProduct,
} from "@/components/admin/combos/types";

type ComboProductRelation = ComboProduct | ComboProduct[] | null;

type ComboItemFromDB = {
  id: string;
  quantity: number | null;
  product_id: string;
  products: ComboProductRelation;
};

type ComboFromDB = {
  id: string;
  store_id?: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number | string | null;
  is_active: boolean | null;
  created_at?: string | null;
  combo_items?: ComboItemFromDB[] | null;
};

function normalizeComboProduct(
  productRelation: ComboProductRelation
): ComboProduct | null {
  if (Array.isArray(productRelation)) {
    return productRelation[0] ?? null;
  }

  return productRelation ?? null;
}

export default function EditComboPage() {
  const params = useParams();
  const comboId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ComboProduct[]>([]);
  const [initialData, setInitialData] = useState<ComboFormData | null>(null);
  const [initialProducts, setInitialProducts] = useState<
    SelectedComboProduct[]
  >([]);

  useEffect(() => {
    const loadData = async () => {
      if (!comboId) return;

      setLoading(true);

      const [comboResponse, productsResponse] = await Promise.all([
        getComboById(comboId),
        getProductsForCombos(),
      ]);

      if (comboResponse.error || !comboResponse.data) {
        console.error("Error cargando combo:", comboResponse.error);
        setLoading(false);
        return;
      }

      if (productsResponse.error) {
        console.error(
          "Error cargando productos para combos:",
          productsResponse.error
        );
        setLoading(false);
        return;
      }

      const combo = comboResponse.data as unknown as ComboFromDB;

      setProducts((productsResponse.data as unknown as ComboProduct[]) || []);

      setInitialData({
        name: combo.name || "",
        description: combo.description || "",
        image_url: combo.image_url || "",
        price: Number(combo.price || 0),
        is_active: Boolean(combo.is_active),
      });

      const selected = (combo.combo_items || []).reduce<
        SelectedComboProduct[]
      >((acc, item) => {
        const product = normalizeComboProduct(item.products);

        if (!product) {
          return acc;
        }

        acc.push({
          combo_item_id: item.id,
          quantity: Number(item.quantity || 1),
          product,
        });

        return acc;
      }, []);

      setInitialProducts(selected);
      setLoading(false);
    };

    loadData();
  }, [comboId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-[#061b3a]">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Cargando combo...
        </div>
      </main>
    );
  }

  if (!initialData) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-[#061b3a]">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black">Combo no encontrado</h1>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            No pudimos cargar la información de este combo.
          </p>
        </div>
      </main>
    );
  }

  return (
    <ComboForm
      mode="edit"
      comboId={comboId}
      products={products}
      initialData={initialData}
      initialProducts={initialProducts}
    />
  );
}
