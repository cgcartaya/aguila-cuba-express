"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, MapPin, MessageCircle, Truck } from "lucide-react";
import "leaflet/dist/leaflet.css";

type PublicCity = { name: string; latitude: number | null; longitude: number | null; order: number };
type PublicRoute = { id: string; name: string; status: "published" | "in_progress"; cities: PublicCity[] };

function valid(value: unknown, kind: "lat" | "lng") {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (kind === "lat" && (n < -90 || n > 90)) return null;
  if (kind === "lng" && (n < -180 || n > 180)) return null;
  if (Math.abs(n) < 0.0001) return null;
  return n;
}

export default function PublicPickupRouteMap({ route }: { route: PublicRoute }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const instance = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const cities = useMemo(() => route.cities.flatMap((city, index) => {
    const lat = valid(city.latitude, "lat");
    const lng = valid(city.longitude, "lng");
    return lat !== null && lng !== null ? [{ ...city, lat, lng, position: city.order || index + 1 }] : [];
  }).sort((a, b) => a.position - b.position), [route.cities]);

  useEffect(() => {
    if (!ref.current || !cities.length) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !ref.current) return;
        instance.current?.remove();
        const map = L.map(ref.current, { scrollWheelZoom: false, dragging: true, zoomControl: true });
        instance.current = map;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        const points = cities.map((city) => [city.lat, city.lng] as [number, number]);
        if (points.length > 1) L.polyline(points, { color: "#dc2626", weight: 6, opacity: .78, dashArray: "10 8", lineCap: "round", lineJoin: "round" }).addTo(map);
        const bounds = L.latLngBounds([]);
        cities.forEach((city, index) => {
          const type = index === 0 ? "start" : index === cities.length - 1 ? "end" : "stop";
          const icon = L.divIcon({ className: `public-route-marker public-route-marker--${type}`, html: `<span>${city.position}</span>`, iconSize: [38,38], iconAnchor: [19,38] });
          L.marker([city.lat, city.lng], { icon }).addTo(map).bindTooltip(city.name, { direction: "top", offset: [0,-34] });
          bounds.extend([city.lat, city.lng]);
        });
        if (cities.length === 1) map.setView(points[0], 11);
        else map.fitBounds(bounds, { padding: [42,42], maxZoom: 10 });
        window.setTimeout(() => map.invalidateSize(), 150);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; instance.current?.remove(); instance.current = null; };
  }, [cities]);

  if (!cities.length) return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-center">
      <MapPin size={38} className="text-slate-400" />
      <p className="mt-4 font-black text-slate-800">El recorrido todavía no tiene ubicaciones públicas.</p>
      <p className="mt-2 max-w-md text-sm font-semibold text-slate-500">Las ciudades aparecerán aquí cuando YOYO complete su ubicación en la planificación.</p>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,.10)]">
      <div className="relative overflow-hidden bg-slate-100">
      <div ref={ref} className="h-[350px] w-full sm:h-[380px]" aria-label={`Mapa público de ${route.name}`} />
      <div className="absolute left-5 top-5 z-[500] rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[.15em] text-slate-400">Recorrido público</p>
        <p className="mt-1 font-black text-slate-900">{route.name} · {cities.length} ciudades</p>
      </div>
      <div className="absolute bottom-3 left-3 right-3 z-[500] rounded-xl bg-white/90 px-3 py-2 text-center text-[11px] font-bold text-slate-500 backdrop-blur">Mostramos ciudades del recorrido, nunca direcciones privadas de clientes.</div>
      {loading && <div className="absolute inset-0 z-[600] flex items-center justify-center bg-white/80"><Loader2 className="animate-spin text-red-600" /><span className="ml-2 font-black">Cargando recorrido…</span></div>}
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-white px-2 py-4 sm:px-4">
        <div className="px-2 text-center"><Truck size={18} className="mx-auto text-blue-700" /><p className="mt-1 text-[10px] font-black uppercase tracking-[.08em] text-slate-700">Puerta a puerta</p></div>
        <div className="px-2 text-center"><MessageCircle size={18} className="mx-auto text-emerald-600" /><p className="mt-1 text-[10px] font-black uppercase tracking-[.08em] text-slate-700">Confirmación</p></div>
        <div className="px-2 text-center"><CheckCircle2 size={18} className="mx-auto text-red-600" /><p className="mt-1 text-[10px] font-black uppercase tracking-[.08em] text-slate-700">Reserva fácil</p></div>
      </div>
      <style jsx global>{`
        .public-route-marker{background:transparent!important;border:0!important}
        .public-route-marker span{display:flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:999px;background:#dc2626;color:#fff;border:3px solid #fff;box-shadow:0 3px 12px rgba(15,23,42,.35);font-weight:900}
        .public-route-marker--start span{background:#059669}
        .public-route-marker--end span{background:#dc2626}
      `}</style>
    </div>
  );
}
