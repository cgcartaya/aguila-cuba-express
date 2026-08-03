"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { getShipmentEvents } from "@/lib/services/shipment-events";
import { getShipmentEventLabel, type ShipmentEvent } from "@/lib/shipping/types";

export default function ShipmentHistory({
  storeId,
  shipmentId,
}: {
  storeId: string;
  shipmentId: string;
}) {
  const [events, setEvents] = useState<ShipmentEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEvents(null);
    setError(null);

    getShipmentEvents(storeId, shipmentId).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      setEvents(data || []);
    });

    return () => {
      cancelled = true;
    };
  }, [storeId, shipmentId]);

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <History className="h-4 w-4" />
        Historial
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && events === null && <p className="text-sm text-slate-500">Cargando...</p>}
      {!error && events?.length === 0 && (
        <p className="text-sm text-slate-500">Sin eventos registrados todavía.</p>
      )}

      {events && events.length > 0 && (
        <ol className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-3 text-sm">
              <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-slate-400" />
              <div>
                <p className="font-medium text-slate-800">{getShipmentEventLabel(event)}</p>
                <p className="text-xs text-slate-500">
                  {new Date(event.created_at).toLocaleString("es-ES")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
