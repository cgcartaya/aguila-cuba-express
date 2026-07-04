"use client";

/* =========================================================
   ADMIN - ZONAS DE ENTREGA
========================================================= */

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  MapPinned,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import AdminBackButton from "@/components/admin/ui/AdminBackButton";
import AdminButton from "@/components/admin/ui/AdminButton";

import {
  createDeliveryZone,
  deleteDeliveryZone,
  getDeliveryZones,
  updateDeliveryZone,
  type DeliveryZone,
} from "@/lib/services/settings";

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
    <main className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-7xl">
        <AdminBackButton />

        <AdminPageHeader
          title="Zonas de entrega"
          description="Define municipios, zonas, costos y reglas reales de domicilio para el checkout."
          badge="Domicilio inteligente"
          icon={MapPinned}
        />

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-[#0B1F4D]">
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
                <label className="mb-1 block text-sm font-bold text-[#0B1F4D]">
                  Municipio
                </label>

                <select
                  name="municipality"
                  value={form.municipality}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {MUNICIPALITIES.map((municipality) => (
                    <option key={municipality} value={municipality}>
                      {municipality}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Nombre de la zona"
                name="zone_name"
                value={form.zone_name}
                onChange={handleChange}
                placeholder="Ej: Punta Gorda, Centro, Junco Sur..."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Costo domicilio"
                  name="delivery_fee"
                  type="number"
                  value={form.delivery_fee}
                  onChange={handleChange}
                />

                <Input
                  label="Compra mínima"
                  name="minimum_order"
                  type="number"
                  value={form.minimum_order}
                  onChange={handleChange}
                />
              </div>

              <Input
                label="Domicilio gratis desde"
                name="free_delivery_from"
                type="number"
                value={form.free_delivery_from}
                onChange={handleChange}
              />

              <Input
                label="Orden visual"
                name="sort_order"
                type="number"
                value={form.sort_order}
                onChange={handleChange}
              />

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-sm font-semibold text-[#0B1F4D]">
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
              <AdminButton
                type="submit"
                disabled={saving}
                icon={saving ? Loader2 : Save}
                className="flex-1"
              >
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Guardar cambios"
                    : "Crear zona"}
              </AdminButton>

              {editingId && (
                <AdminButton
                  type="button"
                  onClick={resetForm}
                  variant="secondary"
                >
                  Cancelar
                </AdminButton>
              )}
            </div>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B1F4D]">
                  Zonas configuradas
                </h2>

                <p className="text-sm text-slate-500">
                  Estas son las zonas que aparecerán en el checkout público.
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                {zones.length} zonas
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 p-10 text-slate-500">
                <Loader2 className="animate-spin" size={20} />
                Cargando zonas...
              </div>
            ) : zones.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                <MapPinned className="mx-auto mb-3 text-slate-400" size={36} />
                <h3 className="font-bold text-[#0B1F4D]">
                  Todavía no hay zonas
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Crea la primera zona para activar el checkout por ubicación.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedZones).map(([municipality, items]) => (
                  <div key={municipality}>
                    <h3 className="mb-3 rounded-xl bg-blue-50 px-4 py-2 text-sm font-black uppercase tracking-wide text-blue-700">
                      {municipality}
                    </h3>

                    <div className="space-y-3">
                      {items.map((zone) => (
                        <article
                          key={zone.id}
                          className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/20"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-bold text-[#0B1F4D]">
                                  {zone.zone_name}
                                </h4>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    zone.is_active
                                      ? "bg-green-100 text-green-700"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {zone.is_active ? "Activa" : "Inactiva"}
                                </span>
                              </div>

                              <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                                <p>
                                  Domicilio:{" "}
                                  <strong className="text-[#0B1F4D]">
                                    ${Number(zone.delivery_fee || 0).toFixed(2)}
                                  </strong>
                                </p>

                                <p>
                                  Mínimo:{" "}
                                  <strong className="text-[#0B1F4D]">
                                    ${Number(zone.minimum_order || 0).toFixed(2)}
                                  </strong>
                                </p>

                                <p>
                                  Gratis desde:{" "}
                                  <strong className="text-[#0B1F4D]">
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
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-[#0B1F4D] hover:bg-blue-50"
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

function Input({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-[#0B1F4D]">
        {label}
      </label>

      <input
        name={name}
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}