"use client";

/* =========================================================
   HISTORIAL DE MOVIMIENTOS DE INVENTARIO

   El botón "Historial" en InventoryManager ya existía en la
   interfaz pero no tenía ninguna acción — no mostraba nada.
   Mientras tanto, StockModal y StockEntryModal SÍ llevaban rato
   guardando cada entrada y ajuste en `inventory_movements`
   (proveedor, costo, motivo, stock anterior/nuevo). Ese historial
   ya existía en la base de datos, solo nunca se veía en ningún
   lado. Este modal lo conecta.
========================================================= */

import { useEffect, useState } from "react";
import { X, ArrowDownCircle, ArrowUpCircle, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";

type InventoryMovement = {
  id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number | null;
  new_stock: number | null;
  supplier: string | null;
  cost: number | null;
  reason: string | null;
  notes: string | null;
  created_by_email: string | null;
  created_at: string;
};

function movementLabel(type: string) {
  if (type === "entry") return "Entrada";
  if (type === "exit") return "Salida";
  if (type === "adjustment") return "Ajuste";
  return type;
}

export default function StockHistoryModal({
  product,
  onClose,
}: {
  product: { id: string; name: string };
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("inventory_movements")
        .select(
          "id, movement_type, quantity, previous_stock, new_stock, supplier, cost, reason, notes, created_by_email, created_at"
        )
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!mounted) return;

      if (error) {
        console.error("Error cargando historial de inventario:", error);
        setErrorMessage("No se pudo cargar el historial.");
        setLoading(false);
        return;
      }

      setMovements((data as InventoryMovement[]) || []);
      setLoading(false);
    }

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [product.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b p-6">
          <div>
            <h2 className="text-xl font-black text-[#061b3a]">
              Historial de inventario
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {product.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="animate-spin" size={24} />
            </div>
          )}

          {!loading && errorMessage && (
            <p className="text-sm font-semibold text-red-600">
              {errorMessage}
            </p>
          )}

          {!loading && !errorMessage && movements.length === 0 && (
            <p className="text-sm font-semibold text-slate-500">
              Todavía no hay movimientos registrados para este producto.
            </p>
          )}

          {!loading && movements.length > 0 && (
            <div className="space-y-3">
              {movements.map((movement) => {
                const isEntry = movement.movement_type === "entry";
                const isExit = movement.movement_type === "exit";
                const delta = Number(movement.quantity || 0);

                return (
                  <div
                    key={movement.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isEntry ? (
                          <ArrowUpCircle size={18} className="text-green-600" />
                        ) : (
                          <ArrowDownCircle
                            size={18}
                            className={isExit ? "text-red-600" : "text-amber-600"}
                          />
                        )}
                        <span className="text-sm font-black text-[#061b3a]">
                          {movementLabel(movement.movement_type)}
                        </span>
                      </div>

                      <span
                        className={`text-sm font-black ${
                          delta >= 0 ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {delta >= 0 ? "+" : ""}
                        {delta}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Stock: {movement.previous_stock ?? "-"} → {movement.new_stock ?? "-"}
                    </p>

                    {movement.supplier && (
                      <p className="mt-1 text-xs text-slate-500">
                        Proveedor: {movement.supplier}
                      </p>
                    )}

                    {movement.cost != null && Number(movement.cost) > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Costo: ${Number(movement.cost).toFixed(2)}
                      </p>
                    )}

                    {movement.reason && (
                      <p className="mt-1 text-xs font-bold text-slate-600">
                        Motivo: {movement.reason}
                      </p>
                    )}

                    {movement.notes && (
                      <p className="mt-1 text-xs text-slate-500">
                        Notas: {movement.notes}
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-slate-400">
                        {new Date(movement.created_at).toLocaleString("es")}
                      </p>

                      {movement.created_by_email && (
                        <p className="text-[11px] font-semibold text-slate-400">
                          {movement.created_by_email}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
