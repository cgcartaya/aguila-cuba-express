"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Loader2, Search, Truck } from "lucide-react";

const LocationPickerMap = dynamic(() => import("@/components/maps/LocationPickerMap"), { ssr: false });

type Result = { label: string; latitude: number; longitude: number };
type Quote = { latitude: number; longitude: number; formattedAddress: string; distanceMeters: number; fee: number } | null;

export default function MenuDistanceDeliveryFields({ storeId, address, origin, quote, onAddressChange, onQuote }:
  { storeId: string; address: string; origin: { latitude: number; longitude: number } | null; quote: Quote; onAddressChange: (value: string) => void; onQuote: (value: Quote) => void }) {
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    if (address.trim().length < 3) return setError("Escribe una calle, reparto o lugar conocido.");
    setSearching(true); setError("");
    try {
      const response = await fetch("/api/checkout/delivery-distance/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId, query: address }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No pudimos buscar la dirección.");
      setResults(body.results || []);
      if (!body.results?.length) setError("No encontramos coincidencias. Marca la ubicación en el mapa.");
    } catch (searchError) { setError(searchError instanceof Error ? searchError.message : "No pudimos buscar la dirección."); }
    finally { setSearching(false); }
  }

  async function calculate(latitude: number, longitude: number, label = address) {
    setQuoting(true); setError(""); onQuote(null);
    try {
      const response = await fetch("/api/checkout/delivery-distance/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId, latitude, longitude }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No pudimos calcular el domicilio.");
      onQuote({ latitude, longitude, formattedAddress: label, distanceMeters: Number(body.distanceMeters), fee: Number(body.fee) });
    } catch (quoteError) { setError(quoteError instanceof Error ? quoteError.message : "No pudimos calcular el domicilio."); }
    finally { setQuoting(false); }
  }

  return <div className="space-y-3">
    <div className="flex gap-2">
      <input value={address} onChange={(event) => { onAddressChange(event.target.value); onQuote(null); }} placeholder="Calle, entrecalles, reparto o referencia" className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none" />
      <button type="button" onClick={search} disabled={searching} className="rounded-2xl bg-[#1B1410] px-4 text-white disabled:opacity-50">{searching ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}</button>
    </div>
    {results.length > 0 && <div className="overflow-hidden rounded-2xl border bg-white shadow-lg">{results.map((result, index) => <button type="button" key={`${result.latitude}-${result.longitude}-${index}`} onClick={() => { setResults([]); onAddressChange(result.label); void calculate(result.latitude, result.longitude, result.label); }} className="block w-full border-b px-4 py-3 text-left text-xs font-bold hover:bg-orange-50">{result.label}</button>)}</div>}
    <LocationPickerMap latitude={quote?.latitude ?? null} longitude={quote?.longitude ?? null} initialCenter={origin ? [origin.latitude, origin.longitude] : [22.145, -80.44]} initialZoom={13} enableGeolocation addressLabel={quote?.formattedAddress || address} onChange={(latitude, longitude) => void calculate(latitude, longitude)} onClear={() => onQuote(null)} />
    {quoting && <div className="flex items-center gap-2 rounded-2xl bg-blue-50 p-3 text-xs font-black text-blue-800"><Loader2 size={16} className="animate-spin" /> Calculando ruta por carretera...</div>}
    {quote && !quoting && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-900"><p className="flex items-center gap-2 font-black"><Truck size={16} /> Domicilio calculado</p><p className="mt-1">Distancia: {(quote.distanceMeters / 1000).toFixed(2)} km · Entrega: ${quote.fee.toFixed(2)}</p></div>}
    {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700">{error}</p>}
  </div>;
}
