"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, MapPin, MessageCircle, Navigation } from "lucide-react";
import type { PickupRouteStop } from "@/lib/pickups/types";
import "leaflet/dist/leaflet.css";

type LocatedStop = PickupRouteStop & { _lat: number; _lng: number };

function validCoordinate(value: unknown, kind: "lat" | "lng") {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (kind === "lat" && (number < -90 || number > 90)) return null;
  if (kind === "lng" && (number < -180 || number > 180)) return null;
  return number;
}

function isRealLocation(lat: number, lng: number) {
  return !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001);
}

export default function PickupRouteMap({ stops }: { stops: PickupRouteStop[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const located = useMemo<LocatedStop[]>(() => stops.flatMap((stop) => {
    const lat = validCoordinate(stop.pickup_request?.latitude, "lat");
    const lng = validCoordinate(stop.pickup_request?.longitude, "lng");
    return lat !== null && lng !== null && isRealLocation(lat, lng)
      ? [{ ...stop, _lat: lat, _lng: lng }]
      : [];
  }).sort((a, b) => Number(a.stop_order || 0) - Number(b.stop_order || 0)), [stops]);

  const missing = stops.length - located.length;
  const manualCount = stops.filter((stop) => stop.pickup_request?.request_source === "manual").length;
  const webCount = stops.length - manualCount;
  const completedCount = stops.filter((stop) => stop.status === "completed" || stop.status === "picked_up").length;
  const pendingCount = Math.max(0, stops.length - completedCount);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    async function renderMap() {
      setLoading(true);
      setError("");
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !mapRef.current) return;
        mapInstance.current?.remove();
        mapInstance.current = null;

        if (!located.length) {
          setError("Ninguna parada tiene una ubicación válida. Edita una parada y marca su punto en el mapa.");
          return;
        }

        const map = L.map(mapRef.current, { scrollWheelZoom: true, zoomControl: true });
        mapInstance.current = map;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        const points = located.map((stop) => [stop._lat, stop._lng] as [number, number]);
        if (points.length > 1) {
          L.polyline(points, { color: "#2563eb", weight: 5, opacity: 0.8, dashArray: "10 8" }).addTo(map);
        }

        const bounds = L.latLngBounds([]);
        located.forEach((stop, index) => {
          const item = stop.pickup_request!;
          const order = Number(stop.stop_order) || index + 1;
          const address = item.formatted_address || [item.address_line_1, item.city, item.region, item.postal_code].filter(Boolean).join(", ");
          const markerType = index === 0 ? "start" : index === located.length - 1 ? "end" : "stop";
          const icon = L.divIcon({
            className: `perla-route-marker perla-route-marker--${markerType}`,
            html: `<span>${order}</span>`,
            iconSize: [38, 38],
            iconAnchor: [19, 38],
            popupAnchor: [0, -38],
          });
          const phone = String(item.phone || "").replace(/\D/g, "");
          const popup = `
            <div class="perla-map-popup">
              <strong>${escapeHtml(item.customer_name || "Cliente")}</strong>
              <span>${escapeHtml(address)}</span>
              ${item.phone ? `<span>${escapeHtml(item.phone)}</span>` : ""}
              <div>
                <a href="${buildSingleDirectionsUrl(address)}" target="_blank" rel="noreferrer">Navegar</a>
                ${phone ? `<a href="https://wa.me/${phone}" target="_blank" rel="noreferrer">WhatsApp</a>` : ""}
              </div>
            </div>`;
          L.marker([stop._lat, stop._lng], { icon }).addTo(map).bindPopup(popup);
          bounds.extend([stop._lat, stop._lng]);
        });

        if (located.length === 1) map.setView(points[0], 14);
        else map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 });
        window.setTimeout(() => map.invalidateSize(), 150);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar el mapa.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderMap();
    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [located]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metric label="Paradas" value={stops.length} />
        <Metric label="Manuales" value={manualCount} />
        <Metric label="Web" value={webCount} />
        <Metric label="Pendientes" value={pendingCount} />
        <Metric label="Completadas" value={completedCount} />
      </div>

      {missing > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <span>{missing} parada(s) no aparecen porque no tienen una ubicación válida. Edítalas y marca el punto correcto.</span>
        </div>
      )}

      <div className="relative min-h-[470px] overflow-hidden rounded-[1.5rem] border bg-slate-100">
        <div ref={mapRef} className="h-[470px] w-full" />
        {loading && <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/80"><Loader2 className="animate-spin text-blue-600" /><span className="ml-2 font-black">Cargando mapa…</span></div>}
        {error && <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-white p-8 text-center"><MapPin size={36} className="text-slate-400" /><p className="mt-3 max-w-lg font-black text-slate-700">{error}</p></div>}
      </div>

      {located.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <a href={buildDirectionsUrl(located)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white"><Navigation size={18} /> Abrir recorrido en Google Maps</a>
          <span className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold text-slate-600"><ExternalLink size={17} /> Google Maps abre fuera del sistema sin API ni facturación</span>
        </div>
      )}

      <style jsx global>{`
        .perla-route-marker{background:transparent!important;border:0!important}
        .perla-route-marker span{display:flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:999px;background:#2563eb;color:#fff;border:3px solid #fff;box-shadow:0 3px 12px rgba(15,23,42,.38);font-weight:900}
        .perla-route-marker--start span{background:#16a34a}
        .perla-route-marker--end span{background:#dc2626}
        .perla-map-popup{display:grid;gap:5px;min-width:210px;font-family:inherit}
        .perla-map-popup strong{font-size:14px;color:#0f172a}
        .perla-map-popup span{font-size:12px;color:#475569}
        .perla-map-popup div{display:flex;gap:8px;margin-top:5px}
        .perla-map-popup a{border-radius:8px;background:#2563eb;color:#fff!important;padding:7px 10px;text-decoration:none;font-weight:800;font-size:12px}
        .perla-map-popup a:last-child{background:#16a34a}
      `}</style>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border bg-white px-4 py-3"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></div>;
}

function buildSingleDirectionsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}
function buildDirectionsUrl(stops: LocatedStop[]) {
  const addresses = stops.map((s) => s.pickup_request?.formatted_address || [s.pickup_request?.address_line_1, s.pickup_request?.city, s.pickup_request?.region, s.pickup_request?.postal_code].filter(Boolean).join(", "));
  if (addresses.length === 1) return buildSingleDirectionsUrl(addresses[0]);
  const origin = addresses[0];
  const destination = addresses[addresses.length - 1];
  const waypoints = addresses.slice(1, -1).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}&travelmode=driving`;
}
function escapeHtml(value: string) {
  return String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] || c));
}
