"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, RotateCcw } from "lucide-react";
import "leaflet/dist/leaflet.css";

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
  onClear: () => void;
};

const SOUTH_CAROLINA_CENTER: [number, number] = [33.8361, -80.8987];

export default function LocationPickerMap({ latitude, longitude, onChange, onClear }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const callbackRef = useRef(onChange);
  const [loading, setLoading] = useState(true);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    async function initialize() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      const initial: [number, number] = latitude != null && longitude != null ? [latitude, longitude] : SOUTH_CAROLINA_CENTER;
      const map = L.map(containerRef.current).setView(initial, latitude != null ? 15 : 7);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const icon = L.divIcon({ className: "perla-location-pin", html: "<span></span>", iconSize: [30, 38], iconAnchor: [15, 38] });
      if (latitude != null && longitude != null) markerRef.current = L.marker(initial, { icon, draggable: true }).addTo(map);
      const place = (lat: number, lng: number) => {
        if (!markerRef.current) markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
        else markerRef.current.setLatLng([lat, lng]);
        markerRef.current.off("dragend").on("dragend", () => {
          const point = markerRef.current.getLatLng();
          callbackRef.current(Number(point.lat.toFixed(7)), Number(point.lng.toFixed(7)));
        });
        callbackRef.current(Number(lat.toFixed(7)), Number(lng.toFixed(7)));
      };
      map.on("click", (event: any) => place(event.latlng.lat, event.latlng.lng));
      if (markerRef.current) place(latitude!, longitude!);
      window.setTimeout(() => map.invalidateSize(), 100);
      setLoading(false);
    }
    initialize().catch(() => setLoading(false));
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  function recenter() {
    if (latitude != null && longitude != null) mapRef.current?.setView([latitude, longitude], 16);
    else mapRef.current?.setView(SOUTH_CAROLINA_CENTER, 7);
  }

  return <div className="space-y-3">
    <p className="flex items-start gap-2 text-sm font-bold text-slate-600"><Crosshair className="mt-0.5 shrink-0 text-blue-600" size={17}/>Busca visualmente la calle y toca el punto exacto. También puedes arrastrar el marcador.</p>
    <div className="relative overflow-hidden rounded-2xl border bg-slate-100">
      <div ref={containerRef} className="h-[310px] w-full" />
      {loading && <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/80"><Loader2 className="animate-spin"/></div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs font-bold text-slate-500">{latitude != null && longitude != null ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : "Ubicación todavía no seleccionada"}</span>
      <div className="flex gap-2"><button type="button" onClick={recenter} className="rounded-xl border px-3 py-2 text-sm font-black"><Crosshair size={15} className="mr-1 inline"/>Centrar</button>{latitude != null && <button type="button" onClick={onClear} className="rounded-xl border px-3 py-2 text-sm font-black text-red-600"><RotateCcw size={15} className="mr-1 inline"/>Quitar punto</button>}</div>
    </div>
    <style jsx global>{`.perla-location-pin{background:transparent;border:0}.perla-location-pin span{display:block;width:30px;height:30px;border-radius:50% 50% 50% 0;background:#f97316;border:3px solid white;box-shadow:0 3px 10px rgba(15,23,42,.35);transform:rotate(-45deg)}.perla-location-pin span:after{content:"";display:block;width:8px;height:8px;margin:8px;border-radius:999px;background:white}`}</style>
  </div>;
}
