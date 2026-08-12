"use client";

/* =========================================================
   AJUSTAR INVENTARIO

   2026-08-10: si el nuevo stock es MENOR al actual, ahora es
   obligatorio elegir un motivo de una lista fija (antes era un
   textarea libre y opcional — por eso un dueño de tienda podía
   bajar stock sin dejar ningún rastro real de por qué). Para
   subidas de stock el motivo sigue siendo opcional.

   Se guarda también quién hizo el cambio (created_by_email),
   tomado de la sesión activa, para poder auditarlo después desde
   el panel de super admin.
========================================================= */

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const EXIT_REASONS = [
  { value: "merma", label: "Merma / producto dañado o vencido" },
  { value: "regalo", label: "Regalo / cortesía" },
  { value: "error_conteo", label: "Error de conteo / ajuste de inventario físico" },
  { value: "venta_manual", label: "Venta manual (efectivo, Zelle, fuera de la plataforma)" },
  { value: "otro", label: "Otro" },
];

export default function StockModal({
  product,
  onClose,
  onSaved,
}: {
  product: any;
  onClose: () => void;
  onSaved?: (newStock: number) => void;
}) {
  const [stock, setStock] = useState(product.stock);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const previousStock = Number(product.stock || 0);
  const isDecrease = Number(stock) < previousStock;

  async function save() {
    setError("");

    if (isDecrease && !reason) {
      setError("Selecciona el motivo de la baja de stock.");
      return;
    }

    setSaving(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const createdByEmail = sessionData?.session?.user?.email || null;

    const { error: updateError } = await supabase
      .from("products")
      .update({ stock })
      .eq("id", product.id);

    if (updateError) {
      setError("Error actualizando stock.");
      setSaving(false);
      return;
    }

    const reasonLabel = isDecrease
      ? EXIT_REASONS.find((r) => r.value === reason)?.label || reason
      : null;

    const { error: movementError } = await supabase
      .from("inventory_movements")
      .insert({
        product_id: product.id,
        movement_type: isDecrease ? "exit" : "adjustment",
        quantity: stock - previousStock,
        previous_stock: previousStock,
        new_stock: stock,
        reason: reasonLabel,
        notes,
        created_by_email: createdByEmail,
      });

    if (movementError) {
      console.error("Error registrando movimiento de inventario:", movementError);
      // El stock ya se actualizó arriba, así que no revertimos —
      // pero antes esto fallaba 100% en silencio (ni siquiera se
      // capturaba el error), por eso un ajuste real podía no dejar
      // ningún rastro en el historial sin que nadie se enterara.
      alert(
        "El stock se actualizó, pero no se pudo guardar el registro en el historial de inventario: " +
          (movementError.message || "error desconocido") +
          ". Avísale a soporte."
      );
      setSaving(false);
      onSaved?.(stock);
      return;
    }

    setSaving(false);
    onSaved?.(stock);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6">
        <h2 className="text-2xl font-black">Ajustar Inventario</h2>

        <p className="mt-2 font-semibold">{product.name}</p>

        <div className="mt-6">
          <label className="font-bold">Nuevo stock</label>

          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </div>

        {isDecrease && (
          <div className="mt-4">
            <label className="font-bold">
              Motivo de la baja <span className="text-red-600">*</span>
            </label>

            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 w-full rounded-xl border p-3"
            >
              <option value="">Selecciona un motivo...</option>
              {EXIT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-4">
          <label className="font-bold">
            Notas {isDecrease ? "(opcional, detalle adicional)" : ""}
          </label>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm font-bold text-red-600">{error}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border p-3 font-bold disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-xl bg-[#061b3a] p-3 font-bold text-white disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
