"use client";

/* =========================================================
   ADMIN - ZONAS DE ENTREGA

   Permite administrar:
   - Municipio
   - Zona
   - Costo de domicilio
   - Compra mínima
   - Domicilio gratis desde
   - Estado activo/inactivo
   - Orden visual

   Esta pantalla alimenta directamente el checkout público.
========================================================= */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  MapPinned,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  createDeliveryZone,
  deleteDeliveryZone,
  getDeliveryZones,
  updateDeliveryZone,
  type DeliveryZone,
} from "@/lib/services/settings";

/* =========================================================
   MUNICIPIOS INICIALES DE CIENFUEGOS

   Por ahora el SaaS trabaja con:
   - País fijo: Cuba
   - Provincia fija: Cienfuegos

   Más adelante esto se puede mover a una tabla propia:
   provinces / municipalities.
========================================================= */

const MUNICIPALITIES = [
  "Cienfuegos",
  "Aguada de Pasajeros",
  "Rodas",
  "Palmira",
  "Lajas",
  "Cruces",
  "Cumanayagua",
  "Abreus",
];

const emptyForm = {
  municipality: "Cienfuegos",
  zone_name: "",
  delivery_fee: "0",
  minimum_order: "0",
  free_delivery_from: "0",
  is_active: true,
  sort_order: "0",
};

export default function AdminDeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const groupedZones = useMemo(() => {
    return zones.reduce<Record<string, DeliveryZone[]>>((acc, zone) => {
      if (!acc[zone.municipality]) acc[zone.municipality] = [];
      acc[zone.municipality].push(zone);
      return acc;
    }, {});
  }, [zones]);

  useEffect(() => {
    loadZones();
  }, []);

  async function loadZones() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await getDeliveryZones();

      if (error) throw error;

      setZones(data || []);
    } catch (err: any) {
      console.error("ERROR CARGANDO ZONAS:", err);
      setError(err?.message || "No se pudieron cargar las zonas de entrega.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const target = e.target;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setForm((current) => ({
        ...current,
        [target.name]: target.checked,
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      [target.name]: target.value,
    }));
  }

  function handleEdit(zone: DeliveryZone) {
    setEditingId(zone.id);

    setForm({
      municipality: zone.municipality,
      zone_name: zone.zone_name,
      delivery_fee: String(zone.delivery_fee ?? 0),
      minimum_order: String(zone.minimum_order ?? 0),
      free_delivery_from: String(zone.free_delivery_from ?? 0),
      is_active: Boolean(zone.is_active),
      sort_order: String(zone.sort_order ?? 0),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.zone_name.trim()) {
      setError("Escribe el nombre de la zona.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        municipality: form.municipality,
        zone_name: form.zone_name.trim(),
        delivery_fee: Number(form.delivery_fee || 0),
        minimum_order: Number(form.minimum_order || 0),
        free_delivery_from: Number(form.free_delivery_from || 0),
        is_active: form.is_active,
        sort_order: Number(form.sort_order || 0),
      };

      const { error } = editingId
        ? await updateDeliveryZone(editingId, payload)
        : await createDeliveryZone(payload);

      if (error) throw error;

      setSuccess(
        editingId
          ? "Zona actualizada correctamente."
          : "Zona creada correctamente."
      );

      resetForm();
      await loadZones();
    } catch (err: any) {
      console.error("ERROR GUARDANDO ZONA:", err);
      setError(err?.message || "No se pudo guardar la zona.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmDelete = window.confirm(
      "¿Seguro que quieres eliminar esta zona? Si ya existen órdenes asociadas, es mejor desactivarla en vez de eliminarla."
    );

    if (!confirmDelete) return;

    try {
      setError("");
      setSuccess("");

      const { error } = await deleteDeliveryZone(id);

      if (error) throw error;

      setSuccess("Zona eliminada correctamente.");
      await loadZones();
    } catch (err: any) {
      console.error("ERROR ELIMINANDO ZONA:", err);
      setError(err?.message || "No se pudo eliminar la zona.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black"
        >
          <ArrowLeft size={18} />
          Volver a ajustes
        </Link>

        <section className="mb-8 rounded-[2rem] bg-black p-8 text-white shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                <MapPinned size={16} />
                Domicilio inteligente
              </div>

              <h1 className="text-3xl font-bold md:text-5xl">
                Zonas de entrega
              </h1>

              <p className="mt-3 max-w-2xl text-white/70">
                Define municipios, zonas, costos y reglas reales de domicilio
                para el checkout.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-5 py-4 text-sm text-white/80">
              País fijo: <strong>Cuba</strong>
              <br />
              Provincia fija: <strong>Cienfuegos</strong>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="h-fit rounded-3xl bg-white p-6 shadow-sm"
          >
            <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-gray-900">
              {editingId ? (
                <>
                  <Pencil size={20} />
                  Editar zona
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Nueva zona
                </>
              )}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Municipio
                </label>

                <select
                  name="municipality"
                  value={form.municipality}
                  onChange={handleChange}
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-black"
                >
                  {MUNICIPALITIES.map((municipality) => (
                    <option key={municipality} value={municipality}>
                      {municipality}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Nombre de la zona
                </label>

                <input
                  name="zone_name"
                  value={form.zone_name}
                  onChange={handleChange}
                  placeholder="Ej: Punta Gorda, Centro, Junco Sur..."
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">
                    Costo domicilio
                  </label>

                  <input
                    name="delivery_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.delivery_fee}
                    onChange={handleChange}
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">
                    Compra mínima
                  </label>

                  <input
                    name="minimum_order"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minimum_order}
                    onChange={handleChange}
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Domicilio gratis desde
                </label>

                <input
                  name="free_delivery_from"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.free_delivery_from}
                  onChange={handleChange}
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-black"
                />

                <p className="mt-1 text-xs text-gray-500">
                  Usa 0 si esta zona no tiene domicilio gratis.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Orden visual
                </label>

                <input
                  name="sort_order"
                  type="number"
                  value={form.sort_order}
                  onChange={handleChange}
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-gray-700">
                <input
                  name="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                Zona activa en checkout
              </label>
            </div>

            {error && (
              <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {success}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 font-bold text-white disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {editingId ? "Guardar cambios" : "Crear zona"}
                  </>
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border px-5 py-3 font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Zonas configuradas
                </h2>

                <p className="text-sm text-gray-500">
                  Estas son las zonas que aparecerán en el checkout público.
                </p>
              </div>

              <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700">
                {zones.length} zonas
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-gray-50 p-10 text-gray-500">
                <Loader2 className="animate-spin" size={20} />
                Cargando zonas...
              </div>
            ) : zones.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-10 text-center">
                <MapPinned className="mx-auto mb-3 text-gray-400" size={36} />
                <h3 className="font-bold text-gray-900">
                  Todavía no hay zonas
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Crea la primera zona para activar el checkout por ubicación.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedZones).map(([municipality, items]) => (
                  <div key={municipality}>
                    <h3 className="mb-3 rounded-xl bg-gray-100 px-4 py-2 text-sm font-black uppercase tracking-wide text-gray-700">
                      {municipality}
                    </h3>

                    <div className="space-y-3">
                      {items.map((zone) => (
                        <article
                          key={zone.id}
                          className="rounded-2xl border p-4 transition hover:bg-gray-50"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-bold text-gray-900">
                                  {zone.zone_name}
                                </h4>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    zone.is_active
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {zone.is_active ? "Activa" : "Inactiva"}
                                </span>
                              </div>

                              <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-3">
                                <p>
                                  Domicilio:{" "}
                                  <strong className="text-gray-900">
                                    ${Number(zone.delivery_fee || 0).toFixed(2)}
                                  </strong>
                                </p>

                                <p>
                                  Mínimo:{" "}
                                  <strong className="text-gray-900">
                                    ${Number(zone.minimum_order || 0).toFixed(2)}
                                  </strong>
                                </p>

                                <p>
                                  Gratis desde:{" "}
                                  <strong className="text-gray-900">
                                    $
                                    {Number(
                                      zone.free_delivery_from || 0
                                    ).toFixed(2)}
                                  </strong>
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(zone)}
                                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold text-gray-700 hover:bg-white"
                              >
                                <Pencil size={15} />
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(zone.id)}
                                className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={15} />
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}