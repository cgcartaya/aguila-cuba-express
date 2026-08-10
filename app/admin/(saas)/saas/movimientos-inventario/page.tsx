"use client";

/* =========================================================
   MOVIMIENTOS DE INVENTARIO (SUPER ADMIN)

   2026-08-10: vista cruzada de TODAS las tiendas — entradas,
   ajustes y salidas de stock, con motivo, fecha/hora exacta y
   quién lo hizo. Sirve principalmente para detectar salidas de
   stock sin una orden real detrás (posibles ventas fuera de la
   plataforma) — filtra por "Salida" y revisa los motivos
   "Venta manual" u otros que no calcen con lo que reportan las
   órdenes de esa tienda en esas fechas.

   Esta página vive dentro de app/admin/(saas)/, así que ya queda
   protegida por AdminAccessGuard area="saas" del layout de esa
   carpeta — no requiere guardia propia.
========================================================= */

import { useEffect, useMemo, useState } from "react";
import { History, ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";

type MovementRow = {
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
  products: { name: string; store_id: string } | null;
};

type StoreOption = { id: string; name: string };

function movementLabel(type: string) {
  if (type === "entry") return "Entrada";
  if (type === "exit") return "Salida";
  if (type === "adjustment") return "Ajuste";
  return type;
}

export default function MovimientosInventarioPage() {
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      const { data: storeRows } = await supabase
        .from("stores")
        .select("id, name")
        .order("name", { ascending: true });

      const { data, error } = await supabase
        .from("inventory_movements")
        .select(
          "id, movement_type, quantity, previous_stock, new_stock, supplier, cost, reason, notes, created_by_email, created_at, products(name, store_id)"
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (!mounted) return;

      if (error) {
        console.error("Error cargando movimientos de inventario:", error);
        setErrorMessage("No se pudo cargar el historial.");
        setLoading(false);
        return;
      }

      setStores((storeRows as StoreOption[]) || []);
      setMovements(
        (data || []).map((row: any) => ({
          ...row,
          products: Array.isArray(row.products) ? row.products[0] : row.products,
        }))
      );
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const storeNameById = useMemo(() => {
    const map = new Map<string, string>();
    stores.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [stores]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (typeFilter !== "all" && m.movement_type !== typeFilter) return false;
      if (storeFilter !== "all" && m.products?.store_id !== storeFilter) {
        return false;
      }
      return true;
    });
  }, [movements, typeFilter, storeFilter]);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Panel Super Admin"
        title="Movimientos de inventario"
        description="Entradas, ajustes y salidas de stock de todas las tiendas — con motivo, fecha/hora y quién lo hizo."
        icon={History}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="rounded-xl border p-3 text-sm font-semibold"
        >
          <option value="all">Todas las tiendas</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border p-3 text-sm font-semibold"
        >
          <option value="all">Todos los tipos</option>
          <option value="entry">Entradas</option>
          <option value="adjustment">Ajustes</option>
          <option value="exit">Salidas</option>
        </select>
      </div>

      <div className="mt-6">
        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="animate-spin" size={24} />
          </div>
        )}

        {!loading && errorMessage && (
          <p className="text-sm font-semibold text-red-600">{errorMessage}</p>
        )}

        {!loading && !errorMessage && filteredMovements.length === 0 && (
          <p className="text-sm font-semibold text-slate-500">
            No hay movimientos que coincidan con el filtro.
          </p>
        )}

        {!loading && filteredMovements.length > 0 && (
          <div className="space-y-3">
            {filteredMovements.map((movement) => {
              const isEntry = movement.movement_type === "entry";
              const isExit = movement.movement_type === "exit";
              const delta = Number(movement.quantity || 0);
              const storeName = movement.products
                ? storeNameById.get(movement.products.store_id) || "Tienda"
                : "Tienda";

              return (
                <div
                  key={movement.id}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
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
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                          {storeName}
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {movement.products?.name || "Producto eliminado"}
                      </p>
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

                  {movement.supplier && (
                    <p className="mt-1 text-xs text-slate-500">
                      Proveedor: {movement.supplier}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
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
  );
}
