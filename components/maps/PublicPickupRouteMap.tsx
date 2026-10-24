"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import type * as Leaflet from "leaflet";
import { progressNames, type ScheduledProgress } from "@/lib/pickups/scheduled-progress";
import "leaflet/dist/leaflet.css";

type PublicCity = { name: string; latitude: number | null; longitude: number | null; order: number };
type PublicRoute = { id: string; name: string; status: "published" | "in_progress"; cities: PublicCity[] };
const van = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 3h14v14H1zM15 8h4l3 4v5h-7"/><circle cx="5.5" cy="18" r="2.5"/><circle cx="18.5" cy="18" r="2.5"/></svg>';
function valid(value: unknown, kind: "lat" | "lng") {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) < .0001) return null;
  if (kind === "lat" && (n < -90 || n > 90)) return null;
  if (kind === "lng" && (n < -180 || n > 180)) return null;
  return n;
}

export default function PublicPickupRouteMap({ route, progress }: { route: PublicRoute; progress: ScheduledProgress | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layersRef = useRef<Leaflet.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const cities = useMemo(() => route.cities.flatMap((city, index) => {
    const lat = valid(city.latitude, "lat"), lng = valid(city.longitude, "lng");
    return lat !== null && lng !== null ? [{ ...city, lat, lng, index, position: city.order || index + 1 }] : [];
  }), [route.cities]);
  const extent = cities.map((city) => `${city.lat},${city.lng}`).join(';');

  useEffect(() => {
    if (!ref.current || !extent) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    setReady(false); setMapError(false);
    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !ref.current) return;
        const map = L.map(ref.current, { scrollWheelZoom: false, zoomControl: false });
        mapRef.current = map;
        L.control.zoom({ position: "topright" }).addTo(map);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
        layersRef.current = L.layerGroup().addTo(map);
        const points = extent.split(';').map((pair) => pair.split(',').map(Number) as [number, number]);
        if (points.length === 1) map.setView(points[0], 11);
        else map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [35, 100], paddingBottomRight: [35, 65], maxZoom: 10 });
        observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(ref.current);
        setReady(true);
      } catch { if (!cancelled) setMapError(true); }
    })();
    return () => { cancelled = true; observer?.disconnect(); mapRef.current?.remove(); mapRef.current = null; layersRef.current = null; };
  }, [route.id, extent]);

  useEffect(() => {
    if (!ready || !layersRef.current) return;
    let cancelled = false;
    let frame = 0;
    (async () => {
      const L = (await import("leaflet")).default;
      const layers = layersRef.current;
      if (cancelled || !layers) return;
      layers.clearLayers();
      // Never connect across a missing city coordinate, or guess its position.
      for (let i = 1; i < cities.length; i++) {
        const from = cities[i - 1], to = cities[i];
        if (to.index !== from.index + 1) continue;
        const points: [number, number][] = [[from.lat, from.lng], [to.lat, to.lng]];
        L.polyline(points, { color: '#334e75', weight: 4, opacity: .65, dashArray: '9 9' }).addTo(layers);
        const passed = progress?.previousIndices.includes(from.index) && (progress.previousIndices.includes(to.index) || progress.currentIndices.includes(to.index));
        if (passed) L.polyline(points, { color: '#059669', weight: 5, opacity: .9, dashArray: '9 9' }).addTo(layers);
        if (progress?.phase === 'transit' && progress.fromIndex === from.index && progress.toIndex === to.index) {
          const point: [number, number] = [from.lat + (to.lat - from.lat) * progress.fraction, from.lng + (to.lng - from.lng) * progress.fraction];
          L.polyline([points[0], point], { color: '#059669', weight: 5, dashArray: '9 9' }).addTo(layers);
          const label = document.createElement('span'); label.textContent = 'Trayecto estimado según horario · No es GPS';
          const vehicle = L.marker(point, { icon: L.divIcon({ className: 'public-route-marker public-route-marker--vehicle', html: `<span>${van}</span>`, iconSize: [42,42], iconAnchor: [21,21] }), zIndexOffset: 1000 }).addTo(layers).bindTooltip(label);
          // Smooth illustrative motion along city-centre segments; refresh recalculates every 15s.
          if (progress.travelSeconds > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const started = performance.now();
            const animate = () => {
              if (cancelled) return;
              const elapsed = Math.min(15, (performance.now() - started) / 1000);
              const fraction = Math.min(1, progress.fraction + elapsed / progress.travelSeconds);
              vehicle.setLatLng([from.lat + (to.lat - from.lat) * fraction, from.lng + (to.lng - from.lng) * fraction]);
              if (elapsed < 15 && fraction < 1) frame = requestAnimationFrame(animate);
            };
            frame = requestAnimationFrame(animate);
          }
        }
      }
      cities.forEach((city) => {
        const active = progress?.currentIndices.includes(city.index), previous = progress?.previousIndices.includes(city.index);
        const icon = L.divIcon({ className: `public-route-marker ${active ? 'public-route-marker--active' : previous ? 'public-route-marker--previous' : ''}`, html: `<span>${active ? van : city.position}</span>`, iconSize: [38,38], iconAnchor: [19,19] });
        const label = document.createElement("span"); label.textContent = `${city.name}${active ? ' · Parada prevista según horario' : ''}`;
        L.marker([city.lat, city.lng], { icon, zIndexOffset: active ? 500 : 0 }).addTo(layers).bindTooltip(label, { direction: "top", offset: [0,-20] });
      });
    })();
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [ready, cities, progress]);

  const current = progress ? progressNames(route.cities, progress.currentIndices) : '';
  const next = progress ? progressNames(route.cities, progress.nextIndices) : '';
  const estimated = progress && progress.phase !== 'unavailable';
  if (!cities.length) return <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-center"><MapPin size={38} className="text-slate-400" /><p className="mt-4 font-black text-slate-800">El recorrido todavía no tiene ubicaciones públicas.</p><p className="mt-2 text-sm text-slate-500">Consulta las ciudades y horarios en el listado.</p></div>;
  return (
    <div className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,.10)]">
      <div className="relative isolate overflow-hidden bg-slate-100">
        <div ref={ref} className="h-[390px] w-full sm:h-[480px]" aria-label={`Mapa público de ${route.name}. Ubicación estimada según horario, no GPS.`} />
        <div className="pointer-events-none absolute left-3 right-14 top-3 z-[500] w-fit max-w-[calc(100%-4.5rem)] rounded-2xl bg-white/95 px-4 py-3 shadow-lg">
          <p className="text-sm font-black text-[#071d43]">{estimated ? 'Avance según horario' : 'Recorrido programado'}</p>
          <p className="mt-1 break-words text-xs font-semibold text-slate-500">{estimated ? `${progress.previousIndices.length} de ${route.cities.length} ciudades con horario finalizado` : 'Horarios por coordinar'}</p>
        </div>
        <div className="pointer-events-none absolute bottom-6 left-3 right-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-center text-[11px] font-bold text-slate-600">Ubicación estimada · No es GPS · Centros de ciudades, no direcciones de clientes.</div>
        {!ready && <div className="absolute inset-0 z-[600] flex items-center justify-center bg-white/90 p-5 text-center text-sm font-bold">{mapError ? 'No se pudo cargar el mapa. Consulta las paradas en el listado.' : <><Loader2 className="mr-2 animate-spin" /> Cargando recorrido…</>}</div>}
      </div>
      <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-3 sm:gap-4">
        <div><p className="text-[10px] font-bold uppercase text-slate-500">Horarios anteriores</p><p className="mt-1 text-sm font-black text-[#071d43]">{estimated ? `${progress.previousIndices.length} ciudades` : 'Por coordinar'}</p></div>
        <div><p className="text-[10px] font-bold uppercase text-slate-500">{progress?.phase === 'transit' ? 'Trayecto previsto hacia' : 'Parada prevista'}</p><p className="mt-1 break-words text-sm font-black text-emerald-700">{current || (progress?.phase === 'transit' ? next : '') || (progress?.phase === 'finished' ? 'Horario finalizado' : progress?.phase === 'unavailable' ? 'Por coordinar' : 'Todavía no comienza')}</p></div>
        <div><p className="text-[10px] font-bold uppercase text-slate-500">Próxima parada</p><p className="mt-1 break-words text-sm font-black text-[#071d43]">{next || (progress?.phase === 'unavailable' ? 'Por coordinar' : 'Sin más paradas previstas')}</p></div>
      </div>
      <style jsx global>{`
        .public-route-marker{background:transparent!important;border:0!important}
        .public-route-marker span{display:flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:999px;background:#334e75;color:#fff;border:3px solid #fff;box-shadow:0 3px 12px rgba(15,23,42,.25);font-weight:900}
        .public-route-marker--previous span{background:#059669}
        .public-route-marker--active span,.public-route-marker--vehicle span{background:#00aa84;box-shadow:0 0 0 7px rgba(16,185,129,.22);animation:route-estimate-pulse 2s ease-in-out infinite}
        @keyframes route-estimate-pulse{50%{box-shadow:0 0 0 13px rgba(16,185,129,.07)}}
        @media(prefers-reduced-motion:reduce){.public-route-marker span{animation:none}}
      `}</style>
    </div>
  );
}
