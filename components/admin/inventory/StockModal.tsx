"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StockModal({
  product,
  onClose,
}: {
  product: any;
  onClose: () => void;
}) {
  const [stock, setStock] = useState(product.stock);
  const [notes, setNotes] = useState("");

  async function save() {
    const previousStock = product.stock;

    const { error } = await supabase
      .from("products")
      .update({
        stock,
      })
      .eq("id", product.id);

    if (error) {
      alert("Error actualizando stock");
      return;
    }

    await supabase
      .from("inventory_movements")
      .insert({
        product_id: product.id,
        movement_type: "adjustment",
        quantity: stock - previousStock,
        previous_stock: previousStock,
        new_stock: stock,
        notes,
      });

    alert("Stock actualizado");

    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

      <div className="w-full max-w-md rounded-3xl bg-white p-6">

        <h2 className="text-2xl font-black">
          Ajustar Inventario
        </h2>

        <p className="mt-2 font-semibold">
          {product.name}
        </p>

        <div className="mt-6">

          <label className="font-bold">
            Nuevo stock
          </label>

          <input
            type="number"
            value={stock}
            onChange={(e) =>
              setStock(Number(e.target.value))
            }
            className="mt-2 w-full rounded-xl border p-3"
          />
        </div>

        <div className="mt-4">

          <label className="font-bold">
            Motivo
          </label>

          <textarea
            value={notes}
            onChange={(e) =>
              setNotes(e.target.value)
            }
            rows={3}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </div>

        <div className="mt-6 flex gap-3">

          <button
            onClick={onClose}
            className="flex-1 rounded-xl border p-3 font-bold"
          >
            Cancelar
          </button>

          <button
            onClick={save}
            className="flex-1 rounded-xl bg-[#061b3a] p-3 font-bold text-white"
          >
            Guardar
          </button>

        </div>
      </div>
    </div>
  );
}