import { MapPin } from "lucide-react";
import type { DeliveryAddressProps } from "./types";
import { DEFAULT_CUBA_PROVINCE } from "@/lib/checkout/cuba-provinces";

export function DeliveryAddressForm({
  form,
  availableZones,
  zones,
  loadingZones,
  municipalityHasNoZones,
  showNotes = true,
  onChange,
}: DeliveryAddressProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:p-6">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-gray-900">
        <MapPin size={20} />
        ¿Dónde la entregamos?
      </h2>

      <p className="mb-5 text-sm text-gray-500">
        País: Cuba · Selecciona una provincia y un municipio con entrega disponible
      </p>

      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500">País</p>
            <p className="font-bold text-gray-900">Cuba</p>
          </div>

          <div className="rounded-xl border bg-gray-50 px-4 py-3">
            <label htmlFor="checkout-province" className="text-xs font-semibold text-gray-500">Provincia *</label>
            <select id="checkout-province" name="province" value={form.province || DEFAULT_CUBA_PROVINCE} onChange={onChange} disabled={loadingZones} className="w-full bg-transparent font-bold text-gray-900">
              {Array.from(new Set(zones.map((zone) => zone.province || DEFAULT_CUBA_PROVINCE))).map((province) => <option key={province} value={province}>{province}</option>)}
            </select>
          </div>
        </div>

        <select
          name="municipality"
          value={form.municipality}
          onChange={onChange}
          disabled={loadingZones}
          className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-gray-100"
        >
          <option value="">
            {loadingZones
              ? "Cargando municipios..."
              : "Selecciona un municipio *"}
          </option>

          {Array.from(new Set(zones.filter((zone) => (zone.province || DEFAULT_CUBA_PROVINCE) === (form.province || DEFAULT_CUBA_PROVINCE)).map((zone) => zone.municipality))).map((municipality) => (
            <option key={municipality} value={municipality}>
              {municipality}
            </option>
          ))}
        </select>

        <select
          name="delivery_zone_id"
          value={form.delivery_zone_id}
          onChange={onChange}
          disabled={!form.municipality || municipalityHasNoZones}
          className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-gray-100"
        >
          <option value="">
            {form.municipality
              ? municipalityHasNoZones
                ? "Este municipio no tiene zonas configuradas"
                : "Selecciona una zona *"
              : "Primero selecciona un municipio"}
          </option>

          {availableZones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.zone_name}
            </option>
          ))}
        </select>

        {municipalityHasNoZones && (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            Este municipio todavía no tiene zonas activas. Agrégalas desde
            Administración → Ajustes → Zonas de entrega.
          </div>
        )}

        <textarea
          name="exact_address"
          placeholder="Tu dirección exacta *"
          value={form.exact_address}
          onChange={onChange}
          rows={4}
          className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />

        {showNotes && (
          <textarea
            name="notes"
            placeholder="¿Quieres aclararnos algo? Ej: Toque el timbre varias veces..."
            value={form.notes}
            onChange={onChange}
            rows={4}
            className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        )}
      </div>
    </div>
  );
}
