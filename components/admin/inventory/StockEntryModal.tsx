"use client";

/* =========================================================
   STOCK ENTRY MODAL

   Fase 3.6:
   - Actualiza stock usando product.id + product.store_id.
   - Evita tocar productos de otra tienda por accidente.
   - Actualiza estado local desde InventoryManager con onSaved.
========================================================= */

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type InventoryProduct = {
  id: string;
  name: string;
  stock: number | null;
  store_id: string;
};

export default function StockEntryModal({
  product,
  onClose,
  onSaved,
}: {
  product: InventoryProduct;
  onClose: () => void;
  onSaved?: (newStock: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [supplier, setSupplier] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveEntry() {
    if (quantity <= 0) {
      alert("La cantidad debe ser mayor que cero");
      return;
    }

    setSaving(true);

    const previousStock = Number(product.stock || 0);
    const newStock = previousStock + quantity;

    const { data: sessionData } = await supabase.auth.getSession();
    const createdByEmail = sessionData?.session?.user?.email || null;

    const { error } = await supabase
      .from("products")
      .update({
        stock: newStock,
      })
      .eq("id", product.id)
      .eq("store_id", product.store_id);

    if (error) {
      console.error("Error actualizando inventario:", error);
      alert("Error actualizando inventario");
      setSaving(false);
      return;
    }

    const { error: movementError } = await supabase
      .from("inventory_movements")
      .insert({
        product_id: product.id,
        store_id: product.store_id,
        movement_type: "entry",
        quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        supplier,
        cost: Number(cost || 0),
        notes,
        created_by_email: createdByEmail,
      });

    if (movementError) {
      console.error("Error registrando movimiento:", movementError);
      // El stock ya se actualizó (arriba), así que no revertimos la
      // operación — pero si el registro del historial falla, el
      // usuario debe enterarse en el momento, no descubrirlo meses
      // después al ver el historial vacío (como pasó con la columna
      // "supplier" que faltaba en la tabla).
      alert(
        "El stock se actualizó, pero no se pudo guardar el registro en el historial de inventario: " +
          (movementError.message || "error desconocido") +
          ". Avísale a soporte."
      );
      onSaved?.(newStock);
      setSaving(false);
      return;
    }

    alert("Entrada registrada correctamente");

    onSaved?.(newStock);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6">
        <h2 className="text-2xl font-black">Entrada de inventario</h2>

        <p className="mt-2 font-semibold">{product.name}</p>

        <div className="mt-5">
          <label className="font-bold">Cantidad a agregar</label>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </div>

        <div className="mt-4">
          <label className="font-bold">Proveedor</label>

          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </div>

        <div className="mt-4">
          <label className="font-bold">Costo total</label>

          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </div>

        <div className="mt-4">
          <label className="font-bold">Notas</label>

          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border p-3 font-bold disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={saveEntry}
            disabled={saving}
            className="flex-1 rounded-xl bg-green-600 p-3 font-bold text-white disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar entrada"}
          </button>
        </div>
      </div>
    </div>
  );
}
