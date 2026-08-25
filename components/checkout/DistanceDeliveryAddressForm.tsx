"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Loader2, MapPin, Search, Truck } from "lucide-react";
import type { CheckoutForm } from "./types";

const LocationPickerMap = dynamic(() => import("@/components/maps/LocationPickerMap"), { ssr: false });

type Result = { label: string; latitude: number; longitude: number };

export function DistanceDeliveryAddressForm({
  form,
  storeId,
  origin,
  showNotes = true,
  onChange,
  onLocationChange,
}: {
  form: CheckoutForm;
  storeId: string;
  origin: { latitude: number | null; longitude: number | null };
  showNotes?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onLocationChange: (patch: Partial<CheckoutForm>) => void;
}) {
  const [searching, setSearching] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");

  async function searchAddress() {
    if (form.exact_address.trim().length < 3) return setError("Escribe una calle, reparto, intersección o lugar conocido.");
    setSearching(true);
    setError("");
    try {
      const response = await fetch("/api/checkout/delivery-distance/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, query: form.exact_address }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No pudimos buscar la dirección.");
      setResults(payload.results || []);
      if (!payload.results?.length) setError("No encontramos coincidencias. Marca tu casa directamente en el mapa.");
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "No pudimos buscar la dirección.");
    } finally {
      setSearching(false);
    }
  }

  async function quote(latitude: number, longitude: number, label?: string) {
    onLocationChange({
      delivery_latitude: latitude,
      delivery_longitude: longitude,
      delivery_formatted_address: label || form.delivery_formatted_address || form.exact_address,
      delivery_distance_meters: null,
      delivery_quoted_fee: null,
    });
    setQuoting(true);
    setError("");
    try {
      const response = await fetch("/api/checkout/delivery-distance/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, latitude, longitude }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "No pudimos calcular el domicilio.");
      onLocationChange({
        delivery_latitude: latitude,
        delivery_longitude: longitude,
        delivery_formatted_address: label || form.delivery_formatted_address || form.exact_address,
        delivery_distance_meters: payload.distanceMeters,
        delivery_quoted_fee: payload.fee,
      });
    } catch (quoteError) {
      setError(quoteError instanceof Error ? quoteError.message : "No pudimos calcular el domicilio.");
    } finally {
      setQuoting(false);
    }
  }

  function selectResult(result: Result) {
    setResults([]);
    onLocationChange({ exact_address: result.label });
    void quote(result.latitude, result.longitude, result.label);
  }

  const hasQuote = form.delivery_distance_meters != null && form.delivery_quoted_fee != null;
  const center: [number, number] = origin.latitude != null && origin.longitude != null
    ? [origin.latitude, origin.longitude]
    : [22.145, -80.44];

  return (
    <div className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><MapPin size={20} /> Dirección de entrega</h2>
      <p className="mt-2 text-sm text-gray-500">Busca una referencia y confirma la entrada exacta moviendo el marcador.</p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <input name="city" placeholder="Ciudad *" value={form.city} onChange={onChange} className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500" />
        <input name="reference" placeholder="Referencia para el repartidor" value={form.reference} onChange={onChange} className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500" />
        <div className="relative md:col-span-2">
          <div className="flex gap-2">
            <input name="exact_address" placeholder="Calle, entrecalles, reparto o lugar conocido *" value={form.exact_address} onChange={onChange} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchAddress(); } }} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500" />
            <button type="button" onClick={searchAddress} disabled={searching} className="inline-flex items-center gap-2 rounded-xl bg-[#082b5c] px-4 font-bold text-white disabled:opacity-60">{searching ? <Loader2 className="animate-spin" size={17} /> : <Search size={17} />} Buscar</button>
          </div>
          {results.length > 0 && <div className="absolute z-[700] mt-2 w-full overflow-hidden rounded-2xl border bg-white shadow-xl">{results.map((result, index) => <button type="button" key={`${result.latitude}-${result.longitude}-${index}`} onClick={() => selectResult(result)} className="block w-full border-b px-4 py-3 text-left text-sm font-semibold hover:bg-blue-50">{result.label}</button>)}</div>}
        </div>
        <div className="md:col-span-2">
          <LocationPickerMap
            latitude={form.delivery_latitude}
            longitude={form.delivery_longitude}
            addressLabel={form.delivery_formatted_address || form.exact_address}
            initialCenter={center}
            initialZoom={13}
            enableGeolocation
            onChange={(latitude, longitude) => void quote(latitude, longitude)}
            onClear={() => onLocationChange({ delivery_latitude: null, delivery_longitude: null, delivery_formatted_address: "", delivery_distance_meters: null, delivery_quoted_fee: null })}
          />
        </div>
        {quoting && <div className="flex items-center gap-2 rounded-2xl bg-blue-50 p-4 font-bold text-blue-800 md:col-span-2"><Loader2 className="animate-spin" size={18} /> Calculando la ruta por carretera...</div>}
        {hasQuote && !quoting && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 md:col-span-2"><p className="flex items-center gap-2 font-black text-emerald-800"><Truck size={18} /> Domicilio calculado</p><div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm font-bold text-slate-700"><span>Distancia: {(form.delivery_distance_meters! / 1000).toFixed(2)} km</span><span>Entrega: {form.delivery_quoted_fee!.toFixed(2)}</span></div></div>}
        {error && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 md:col-span-2">{error}</p>}
        {showNotes && <textarea name="notes" placeholder="Notas para la entrega (opcional)" value={form.notes} onChange={onChange} rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500 md:col-span-2" />}
      </div>
    </div>
  );
}
