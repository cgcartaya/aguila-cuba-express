"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, MapPin } from "lucide-react";
import type { PickupRouteStop } from "@/lib/pickups/types";
import "leaflet/dist/leaflet.css";

export default function PickupRouteMap({ stops }: { stops: PickupRouteStop[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const located = useMemo(
    () => stops.filter((s) => Number.isFinite(Number(s.pickup_request?.latitude)) && Number.isFinite(Number(s.pickup_request?.longitude))),
    [stops]
  );
  const missing = stops.length - located.length;

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    async function renderMap() {
      setLoading(true);
      setError("");
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !mapRef.current) return;
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }
        if (!located.length) {
          setError("Estas paradas todavía no tienen una ubicación marcada. Edita cada parada y selecciona su punto en el mapa.");
          return;
        }

        const map = L.map(mapRef.current, { scrollWheelZoom: true });
        mapInstance.current = map;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        const bounds = L.latLngBounds([]);
        located.forEach((stop, index) => {
          const item = stop.pickup_request!;
          const lat = Number(item.latitude);
          const lng = Number(item.longitude);
          const order = stop.stop_order || index + 1;
          const address = item.formatted_address || [item.address_line_1, item.city, item.region, item.postal_code].filter(Boolean).join(", ");
          const icon = L.divIcon({
            className: "perla-route-marker",
            html: `<span>${order}</span>`,
            iconSize: [34, 34],
            iconAnchor: [17, 34],
            popupAnchor: [0, -34],
          });
          L.marker([lat, lng], { icon })
            .addTo(map)
            .bindPopup(`<div style="max-width:250px"><b>${escapeHtml(item.customer_name)}</b><br/><span>${escapeHtml(address)}</span><br/><a href="${buildSingleDirectionsUrl(address)}" target="_blank" rel="noreferrer">Abrir en Google Maps</a></div>`);
          bounds.extend([lat, lng]);
        });
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
        window.setTimeout(() => map.invalidateSize(), 100);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar el mapa.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderMap();
    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [located]);

  return <div className="space-y-3">
    {missing > 0 && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800"><AlertTriangle className="mt-0.5 shrink-0" size={18}/><span>{missing} parada(s) no aparecen todavía. Edítalas y usa “Seleccionar ubicación en el mapa”.</span></div>}
    <div className="relative min-h-[430px] overflow-hidden rounded-[1.5rem] border bg-slate-100">
      <div ref={mapRef} className="h-[430px] w-full" />
      {loading && <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/80"><Loader2 className="animate-spin text-blue-600"/><span className="ml-2 font-black">Cargando mapa…</span></div>}
      {error && <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-white p-8 text-center"><MapPin size={36} className="text-slate-400"/><p className="mt-3 max-w-lg font-black text-slate-700">{error}</p></div>}
    </div>
    {located.length > 0 && <a href={buildDirectionsUrl(located)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white"><ExternalLink size={18}/> Abrir recorrido en Google Maps</a>}
    <style jsx global>{`.perla-route-marker{background:transparent;border:0}.perla-route-marker span{display:flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:999px;background:#2563eb;color:#fff;border:3px solid #fff;box-shadow:0 3px 10px rgba(15,23,42,.35);font-weight:900}`}</style>
  </div>;
}

function buildSingleDirectionsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}
function buildDirectionsUrl(stops: PickupRouteStop[]) {
  const addresses = stops.map((s) => s.pickup_request?.formatted_address || [s.pickup_request?.address_line_1, s.pickup_request?.city, s.pickup_request?.region, s.pickup_request?.postal_code].filter(Boolean).join(", "));
  if (addresses.length === 1) return buildSingleDirectionsUrl(addresses[0]);
  const origin = addresses[0], destination = addresses[addresses.length - 1], waypoints = addresses.slice(1, -1).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}&travelmode=driving`;
}
function escapeHtml(value: string) { return String(value).replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c] || c)); }
