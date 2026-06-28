"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StockEntryModal({
  product,
  onClose,
}: {
  product: any;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [supplier, setSupplier] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  async function saveEntry() {
    if (quantity <= 0) {
      alert("La cantidad debe ser mayor que cero");
      return;
    }

    const previousStock = product.stock;
    const newStock = previousStock + quantity;

    // Actualizar stock
    const { error } = await supabase
      .from("products")
      .update({
        stock: newStock,
      })
      .eq("id", product.id);

    if (error) {
      alert("Error actualizando inventario");
      return;
    }

    // Registrar movimiento
    await supabase
      .from("inventory_movements")
      .insert({
        product_id: product.id,
        movement_type: "entry",
        quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        supplier,
        cost: Number(cost || 0),
        notes,
      });

    alert("Entrada registrada correctamente");

    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

      <div className="w-full max-w-md rounded-3xl bg-white p-6">

        <h2 className="text-2xl font-black">
          Entrada de inventario
        </h2>

        <p className="mt-2 font-semibold">
          {product.name}
        </p>

        <div className="mt-5">
          <label className="font-bold">
            Cantidad a agregar
          </label>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) =>
              setQuantity(Number(e.target.value))
            }
            className="mt-2 w-full rounded-xl border p-3"
          />
        </div>

        <div className="mt-4">
          <label className="font-bold">
            Proveedor
          </label>

          <input
            value={supplier}
            onChange={(e) =>
              setSupplier(e.target.value)
            }
            className="mt-2 w-full rounded-xl border p-3"
          />
        </div>

        <div className="mt-4">
          <label className="font-bold">
            Costo total
          </label>

          <input
            type="number"
            value={cost}
            onChange={(e) =>
              setCost(e.target.value)
            }
            className="mt-2 w-full rounded-xl border p-3"
          />
        </div>

        <div className="mt-4">
          <label className="font-bold">
            Notas
          </label>

          <textarea
            rows={3}
            value={notes}
            onChange={(e) =>
              setNotes(e.target.value)
            }
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
            onClick={saveEntry}
            className="flex-1 rounded-xl bg-green-600 p-3 font-bold text-white"
          >
            Guardar entrada
          </button>
        </div>
      </div>
    </div>
  );
}