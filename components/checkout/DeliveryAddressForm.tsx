import { MapPin } from "lucide-react";
import type { DeliveryAddressProps } from "./types";
import { CIENFUEGOS_MUNICIPALITIES } from "@/lib/utils/checkout";

export function DeliveryAddressForm({
  form,
  availableZones,
  loadingZones,
  municipalityHasNoZones,
  onChange,
}: DeliveryAddressProps) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-gray-900">
        <MapPin size={20} />
        ¿Dónde la entregamos?
      </h2>

      <p className="mb-5 text-sm text-gray-500">
        País fijo: Cuba · Provincia fija: Cienfuegos
      </p>

      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500">País</p>
            <p className="font-bold text-gray-900">Cuba</p>
          </div>

          <div className="rounded-xl border bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500">Provincia</p>
            <p className="font-bold text-gray-900">Cienfuegos</p>
          </div>
        </div>

        <select
          name="municipality"
          value={form.municipality}
          onChange={onChange}
          disabled={loadingZones}
          className="rounded-xl border px-4 py-3 outline-none focus:border-black disabled:bg-gray-100"
        >
          <option value="">
            {loadingZones
              ? "Cargando municipios..."
              : "Selecciona un municipio *"}
          </option>

          {CIENFUEGOS_MUNICIPALITIES.map((municipality) => (
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
          className="rounded-xl border px-4 py-3 outline-none focus:border-black disabled:bg-gray-100"
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
          className="rounded-xl border px-4 py-3 outline-none focus:border-black"
        />

        <textarea
          name="notes"
          placeholder="¿Quieres aclararnos algo? Ej: Toque el timbre varias veces..."
          value={form.notes}
          onChange={onChange}
          rows={4}
          className="rounded-xl border px-4 py-3 outline-none focus:border-black"
        />
      </div>
    </div>
  );
}