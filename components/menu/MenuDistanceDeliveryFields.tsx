"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Crosshair, Loader2, MapPin, Search, Truck } from "lucide-react";

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
      if (!body.results?.length) setError("Esa dirección no aparece en el mapa. Toca directamente el lugar de entrega o usa tu ubicación actual.");
    } catch { setError("El buscador no respondió. Puedes tocar el lugar exacto en el mapa o usar tu ubicación actual."); }
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
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void search(); }}>
      <input inputMode="search" enterKeyHint="search" autoComplete="street-address" value={address} onChange={(event) => { onAddressChange(event.target.value); onQuote(null); setResults([]); setError(""); }} placeholder="Ej. Calle 77 entre 4 NE y 6 NE #402" className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-base font-bold outline-none" />
      <button type="submit" aria-label="Buscar dirección" disabled={searching} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1B1410] text-white disabled:opacity-50">{searching ? <Loader2 size={19} className="animate-spin" /> : <Search size={19} />}</button>
    </form>
    <p className="flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-900"><MapPin size={15} className="mt-0.5 shrink-0" /> Busca la dirección y luego confirma el punto. Si no aparece, toca el lugar exacto en el mapa.</p>
    {results.length > 0 && <div className="max-h-52 overflow-y-auto rounded-2xl border bg-white shadow-lg">{results.map((result, index) => <button type="button" key={`${result.latitude}-${result.longitude}-${index}`} onClick={() => { setResults([]); onAddressChange(result.label); void calculate(result.latitude, result.longitude, result.label); }} className="flex w-full items-start gap-2 border-b px-4 py-3 text-left text-sm font-bold active:bg-orange-100"><MapPin size={16} className="mt-0.5 shrink-0 text-orange-500" />{result.label}</button>)}</div>}
    <LocationPickerMap latitude={quote?.latitude ?? null} longitude={quote?.longitude ?? null} initialCenter={origin ? [origin.latitude, origin.longitude] : [22.145, -80.44]} initialZoom={13} enableGeolocation addressLabel={quote?.formattedAddress || address} onChange={(latitude, longitude) => void calculate(latitude, longitude)} onClear={() => onQuote(null)} />
    {quoting && <div className="flex items-center gap-2 rounded-2xl bg-blue-50 p-3 text-xs font-black text-blue-800"><Loader2 size={16} className="animate-spin" /> Calculando ruta por carretera...</div>}
    {quote && !quoting && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-900"><p className="flex items-center gap-2 font-black"><Truck size={16} /> Domicilio calculado</p><p className="mt-1">Distancia: {(quote.distanceMeters / 1000).toFixed(2)} km · Entrega: ${quote.fee.toFixed(2)}</p></div>}
    {error && <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-900"><Crosshair size={15} className="mt-0.5 shrink-0" />{error}</p>}
  </div>;
}
