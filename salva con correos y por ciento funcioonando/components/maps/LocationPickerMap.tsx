"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Crosshair, Loader2, LocateFixed, Move, RotateCcw } from "lucide-react";
import "leaflet/dist/leaflet.css";

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
  onClear: () => void;
  enableGeolocation?: boolean;
  addressLabel?: string;
  startLocked?: boolean;
};

const SOUTH_CAROLINA_CENTER: [number, number] = [33.8361, -80.8987];

export default function LocationPickerMap({ latitude, longitude, onChange, onClear, enableGeolocation = false, addressLabel = "", startLocked = false }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const callbackRef = useRef(onChange);
  const editingRef = useRef(!startLocked);
  const [editing, setEditing] = useState(!startLocked);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");
  callbackRef.current = onChange;
  editingRef.current = editing;

  function setMarkerDraggable(value: boolean) {
    const marker = markerRef.current;
    if (!marker?.dragging) return;
    if (value) marker.dragging.enable();
    else marker.dragging.disable();
  }

  function placeMarker(lat: number, lng: number, zoom = 17) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const icon = L.divIcon({ className: "perla-location-pin", html: "<span></span>", iconSize: [30, 38], iconAnchor: [15, 38] });
    if (!markerRef.current) markerRef.current = L.marker([lat, lng], { icon, draggable: editingRef.current }).addTo(map);
    else markerRef.current.setLatLng([lat, lng]);
    setMarkerDraggable(editingRef.current);
    markerRef.current.off("dragend").on("dragend", () => {
      const point = markerRef.current.getLatLng();
      callbackRef.current(Number(point.lat.toFixed(7)), Number(point.lng.toFixed(7)));
    });
    map.setView([lat, lng], zoom);
  }

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    async function initialize() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      const hasPoint = latitude != null && longitude != null;
      const initial: [number, number] = hasPoint ? [latitude, longitude] : SOUTH_CAROLINA_CENTER;
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(initial, hasPoint ? 17 : 7);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.on("click", (event: any) => {
        if (!editingRef.current) return;
        placeMarker(event.latlng.lat, event.latlng.lng, Math.max(map.getZoom(), 16));
        callbackRef.current(Number(event.latlng.lat.toFixed(7)), Number(event.latlng.lng.toFixed(7)));
      });
      if (hasPoint) placeMarker(latitude, longitude);
      window.setTimeout(() => map.invalidateSize(), 120);
      setLoading(false);
    }
    initialize().catch(() => setLoading(false));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (latitude != null && longitude != null) placeMarker(latitude, longitude);
    else if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  }, [latitude, longitude]);

  useEffect(() => {
    setMarkerDraggable(editing);
  }, [editing]);

  function recenter() {
    if (latitude != null && longitude != null) mapRef.current?.setView([latitude, longitude], 17);
    else mapRef.current?.setView(SOUTH_CAROLINA_CENTER, 7);
  }

  function useCurrentLocation() {
    setGeoError("");
    if (!navigator.geolocation) return setGeoError("Este dispositivo no permite obtener la ubicación.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(7));
        const lng = Number(position.coords.longitude.toFixed(7));
        setEditing(true);
        placeMarker(lat, lng);
        callbackRef.current(lat, lng);
        setLocating(false);
      },
      () => { setGeoError("No pudimos obtener tu ubicación. Revisa el permiso del navegador."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  const hasPoint = latitude != null && longitude != null;

  return (
    <div className="space-y-3">
      {hasPoint ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 font-black text-emerald-800"><CheckCircle2 size={19} /> Encontramos tu dirección</p>
          {addressLabel && <p className="mt-1 text-sm font-semibold text-slate-600">{addressLabel}</p>}
          <p className="mt-2 text-sm font-bold text-slate-600">¿El marcador está en la entrada correcta? Si está bien, continúa. Solo muévelo si hace falta.</p>
        </div>
      ) : (
        <p className="flex items-start gap-2 text-sm font-bold text-slate-600"><Crosshair className="mt-0.5 shrink-0 text-blue-600" size={17} /> Todavía no encontramos un punto para esta dirección.</p>
      )}
      <div className="relative overflow-hidden rounded-2xl border bg-slate-100">
        <div ref={containerRef} className="h-[310px] w-full" />
        {loading && <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/80"><Loader2 className="animate-spin" /></div>}
        {!editing && hasPoint && <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[450] mx-auto w-fit rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-black text-white">Mapa bloqueado para evitar movimientos accidentales</div>}
      </div>
      {geoError && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">{geoError}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-500">{hasPoint ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : "Ubicación todavía no seleccionada"}</span>
        <div className="flex flex-wrap gap-2">
          {hasPoint && !editing && <button type="button" onClick={() => setEditing(true)} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-800"><Move size={15} className="mr-1 inline" />Mover marcador</button>}
          {hasPoint && editing && <button type="button" onClick={() => setEditing(false)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white"><CheckCircle2 size={15} className="mr-1 inline" />Listo</button>}
          {enableGeolocation && <button type="button" onClick={useCurrentLocation} disabled={locating} className="rounded-xl bg-[#082b5c] px-3 py-2 text-sm font-black text-white disabled:opacity-60">{locating ? <Loader2 size={15} className="mr-1 inline animate-spin" /> : <LocateFixed size={15} className="mr-1 inline" />}Usar mi ubicación</button>}
          <button type="button" onClick={recenter} className="rounded-xl border px-3 py-2 text-sm font-black"><Crosshair size={15} className="mr-1 inline" />Centrar</button>
          {hasPoint && <button type="button" onClick={onClear} className="rounded-xl border px-3 py-2 text-sm font-black text-red-600"><RotateCcw size={15} className="mr-1 inline" />Quitar punto</button>}
        </div>
      </div>
      <style jsx global>{`.perla-location-pin{background:transparent;border:0}.perla-location-pin span{display:block;width:30px;height:30px;border-radius:50% 50% 50% 0;background:#ef4444;border:3px solid white;box-shadow:0 3px 10px rgba(15,23,42,.35);transform:rotate(-45deg)}.perla-location-pin span:after{content:"";display:block;width:8px;height:8px;margin:8px;border-radius:999px;background:white}`}</style>
    </div>
  );
}
