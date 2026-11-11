"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Shipment, ShippingDriver } from "@/lib/shipping/types";

type Assignment = Pick<Shipment, "id" | "assigned_staff_id" | "assigned_driver_id" | "assigned_driver_name">;

export default function ShipmentDriverSelect({ shipment, drivers, onAssigned }: {
  shipment: Shipment;
  drivers: ShippingDriver[];
  onAssigned: (assignment: Assignment) => void;
}) {
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const current = shipment.assigned_staff_id || drivers.find(driver =>
    (shipment.assigned_driver_id && driver.legacy_driver_id === shipment.assigned_driver_id)
    || (!shipment.assigned_staff_id && driver.name === shipment.assigned_driver_name)
  )?.id || (shipment.assigned_driver_name ? "legacy" : "");
  const available = drivers.filter(driver => driver.is_active || driver.id === current);

  async function assign(value: string) {
    if (busy.current || value === "legacy" || value === current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data, error: failure } = await supabase.rpc("assign_shipment_driver", {
        p_store_id: shipment.store_id,
        p_shipment_id: shipment.id,
        p_staff_id: value || null,
      });
      if (failure) throw failure;
      if (!data?.id) throw new Error("No se pudo confirmar la asignación. Recarga e inténtalo otra vez.");
      onAssigned(data as Assignment);
      setNotice("Guardado");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : (failure as { message?: string })?.message || "No se pudo guardar. Inténtalo otra vez.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return <div className="mt-2 min-w-0">
    <label className="mb-1 block text-[10px] font-extrabold uppercase text-slate-500" htmlFor={`driver-${shipment.id}`}>Repartidor</label>
    <select id={`driver-${shipment.id}`} aria-label={`Repartidor del envío ${shipment.order_number || shipment.tracking_code || shipment.id}`} value={current} disabled={saving} onChange={event => void assign(event.target.value)} className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 disabled:opacity-60">
      <option value="">Sin repartidor</option>
      {current && !available.some(driver => driver.id === current) && <option value={current} disabled>{shipment.assigned_driver_name || "Repartidor actual"}</option>}
      {available.map(driver => <option key={driver.id} value={driver.id} disabled={!driver.is_active}>{driver.name}{driver.is_active ? "" : " (inactivo)"}</option>)}
    </select>
    <p role="status" aria-live="polite" className="mt-1 text-[11px] font-semibold text-emerald-700">{saving ? "Guardando…" : notice}</p>
    {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
  </div>;
}
