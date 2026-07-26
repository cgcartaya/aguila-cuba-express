"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, MapPin } from "lucide-react";
import type { PickupRouteStop } from "@/lib/pickups/types";

declare global { interface Window { google?: any; __perlaGoogleMapsPromise?: Promise<any>; } }

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window.__perlaGoogleMapsPromise) return window.__perlaGoogleMapsPromise;
  window.__perlaGoogleMapsPromise = new Promise((resolve, reject) => {
    const callback = `__perlaMapsReady_${Date.now()}`;
    (window as any)[callback] = () => { resolve(window.google.maps); delete (window as any)[callback]; };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callback}&v=weekly`;
    script.async = true; script.defer = true;
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps."));
    document.head.appendChild(script);
  });
  return window.__perlaGoogleMapsPromise;
}

export default function PickupRouteMap({ stops }: { stops: PickupRouteStop[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const located = useMemo(() => stops.filter((s) => Number.isFinite(Number(s.pickup_request?.latitude)) && Number.isFinite(Number(s.pickup_request?.longitude))), [stops]);
  const missing = stops.length - located.length;

  useEffect(() => {
    if (!mapRef.current) return;
    if (!apiKey) { setError("Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY."); setLoading(false); return; }
    let cancelled = false;
    loadGoogleMaps(apiKey).then((maps) => {
      if (cancelled || !mapRef.current) return;
      if (!located.length) { setError("Estas paradas todavía no tienen coordenadas. Edita una parada manual o valida la dirección desde la landing."); setLoading(false); return; }
      const bounds = new maps.LatLngBounds();
      const map = new maps.Map(mapRef.current, { mapTypeControl: false, streetViewControl: false, fullscreenControl: true });
      located.forEach((stop) => {
        const item = stop.pickup_request!;
        const position = { lat: Number(item.latitude), lng: Number(item.longitude) };
        bounds.extend(position);
        const marker = new maps.Marker({ map, position, label: String(stop.stop_order || located.indexOf(stop) + 1), title: item.customer_name });
        const address = item.formatted_address || [item.address_line_1, item.city, item.region, item.postal_code].filter(Boolean).join(", ");
        const info = new maps.InfoWindow({ content: `<div style="max-width:240px"><b>${escapeHtml(item.customer_name)}</b><br/><span>${escapeHtml(address)}</span></div>` });
        marker.addListener("click", () => info.open({ anchor: marker, map }));
      });
      map.fitBounds(bounds, 50);
      if (located.length === 1) map.setZoom(13);
      setLoading(false);
    }).catch((e) => { setError(e instanceof Error ? e.message : "No se pudo cargar el mapa."); setLoading(false); });
    return () => { cancelled = true; };
  }, [apiKey, located]);

  return <div className="space-y-3">
    {missing > 0 && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800"><AlertTriangle className="mt-0.5 shrink-0" size={18}/><span>{missing} parada(s) no aparecen en el mapa porque todavía no tienen coordenadas.</span></div>}
    <div className="relative min-h-[430px] overflow-hidden rounded-[1.5rem] border bg-slate-100">
      <div ref={mapRef} className="h-[430px] w-full" />
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/80"><Loader2 className="animate-spin text-blue-600"/><span className="ml-2 font-black">Cargando mapa…</span></div>}
      {error && <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"><MapPin size={36} className="text-slate-400"/><p className="mt-3 max-w-lg font-black text-slate-700">{error}</p></div>}
    </div>
    {located.length > 0 && <a href={buildDirectionsUrl(located)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white"><ExternalLink size={18}/> Abrir recorrido en Google Maps</a>}
  </div>;
}

function buildDirectionsUrl(stops: PickupRouteStop[]) {
  const addresses = stops.map((s) => s.pickup_request?.formatted_address || [s.pickup_request?.address_line_1, s.pickup_request?.city, s.pickup_request?.region, s.pickup_request?.postal_code].filter(Boolean).join(", "));
  if (addresses.length === 1) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addresses[0])}`;
  const origin = addresses[0], destination = addresses[addresses.length - 1], waypoints = addresses.slice(1, -1).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}&travelmode=driving`;
}
function escapeHtml(value: string) { return String(value).replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c] || c)); }
