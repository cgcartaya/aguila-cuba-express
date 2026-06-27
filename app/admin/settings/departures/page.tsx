"use client";

/* =========================================================
   ADMIN - SALIDAS

   Permite al jefe administrar las próximas salidas:
   - Fecha
   - Hora
   - Origen
   - Destino
   - Estado
   - Activa/inactiva
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  createDeparture,
  deleteDeparture,
  getDepartures,
  updateDeparture,
  type Departure,
  type DepartureStatus,
} from "@/lib/services/departures";

const emptyForm = {
  title: "",
  departure_date: "",
  departure_time: "",
  origin: "Miami",
  destination: "Cienfuegos, Cuba",
  description: "",
  status: "scheduled" as DepartureStatus,
  is_active: true,
  sort_order: "0",
};

const statusOptions: { value: DepartureStatus; label: string }[] = [
  { value: "scheduled", label: "Programada" },
  { value: "closed", label: "Cerrada" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
];

export default function AdminDeparturesPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadDepartures();
  }, []);

  async function loadDepartures() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await getDepartures();

      if (error) throw error;

      setDepartures(data || []);
    } catch (err: any) {
      console.error("ERROR CARGANDO SALIDAS:", err);
      setError(err?.message || "No se pudieron cargar las salidas.");
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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

  function handleEdit(departure: Departure) {
    setEditingId(departure.id);

    setForm({
      title: departure.title || "",
      departure_date: departure.departure_date || "",
      departure_time: departure.departure_time || "",
      origin: departure.origin || "Miami",
      destination: departure.destination || "Cienfuegos, Cuba",
      description: departure.description || "",
      status: departure.status || "scheduled",
      is_active: Boolean(departure.is_active),
      sort_order: String(departure.sort_order ?? 0),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Escribe un título para la salida.");
      return;
    }

    if (!form.departure_date) {
      setError("Selecciona la fecha de salida.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        departure_date: form.departure_date,
        departure_time: form.departure_time || null,
        origin: form.origin.trim() || "Miami",
        destination: form.destination.trim() || "Cienfuegos, Cuba",
        description: form.description.trim() || null,
        status: form.status,
        is_active: form.is_active,
        sort_order: Number(form.sort_order || 0),
      };

      const { error } = editingId
        ? await updateDeparture(editingId, payload)
        : await createDeparture(payload);

      if (error) throw error;

      setSuccess(
        editingId
          ? "Salida actualizada correctamente."
          : "Salida creada correctamente."
      );

      resetForm();
      await loadDepartures();
    } catch (err: any) {
      console.error("ERROR GUARDANDO SALIDA:", err);
      setError(err?.message || "No se pudo guardar la salida.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmDelete = window.confirm(
      "¿Seguro que quieres eliminar esta salida?"
    );

    if (!confirmDelete) return;

    try {
      setError("");
      setSuccess("");

      const { error } = await deleteDeparture(id);

      if (error) throw error;

      setSuccess("Salida eliminada correctamente.");
      await loadDepartures();
    } catch (err: any) {
      console.error("ERROR ELIMINANDO SALIDA:", err);
      setError(err?.message || "No se pudo eliminar la salida.");
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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
            <CalendarDays size={16} />
            Calendario operativo
          </div>

          <h1 className="text-3xl font-bold md:text-5xl">
            Próximas salidas
          </h1>

          <p className="mt-3 max-w-2xl text-white/70">
            Administra las fechas de salida que verán los clientes en la tienda.
          </p>
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
                  Editar salida
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Nueva salida
                </>
              )}
            </h2>

            <div className="space-y-4">
              <Input
                label="Título"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Ej: Salida aérea semanal"
              />

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Fecha de salida
                </label>

                <input
                  type="date"
                  name="departure_date"
                  value={form.departure_date}
                  onChange={handleChange}
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <Input
                label="Hora aproximada"
                name="departure_time"
                value={form.departure_time}
                onChange={handleChange}
                placeholder="Ej: 10:00 AM"
              />

              <Input
                label="Origen"
                name="origin"
                value={form.origin}
                onChange={handleChange}
                placeholder="Miami"
              />

              <Input
                label="Destino"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                placeholder="Cienfuegos, Cuba"
              />

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Estado
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-black"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Descripción
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Ej: Recibimos órdenes hasta el día anterior."
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <Input
                label="Orden visual"
                name="sort_order"
                type="number"
                value={form.sort_order}
                onChange={handleChange}
              />

              <label className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold text-gray-700">
                <input
                  name="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                Mostrar esta salida en la tienda
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
                    {editingId ? "Guardar cambios" : "Crear salida"}
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
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Salidas configuradas
                </h2>

                <p className="text-sm text-gray-500">
                  Estas fechas se mostrarán en la tienda pública.
                </p>
              </div>

              <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700">
                {departures.length} salidas
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-gray-50 p-10 text-gray-500">
                <Loader2 className="animate-spin" size={20} />
                Cargando salidas...
              </div>
            ) : departures.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-10 text-center">
                <CalendarDays
                  className="mx-auto mb-3 text-gray-400"
                  size={36}
                />
                <h3 className="font-bold text-gray-900">
                  Todavía no hay salidas
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Crea la primera fecha para mostrarla en la tienda.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {departures.map((departure) => (
                  <article
                    key={departure.id}
                    className="rounded-2xl border p-4 transition hover:bg-gray-50"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {departure.title}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              departure.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {departure.is_active ? "Activa" : "Inactiva"}
                          </span>

                          <StatusBadge status={departure.status} />
                        </div>

                        <p className="font-semibold text-gray-700">
                          {formatDate(departure.departure_date)}
                          {departure.departure_time
                            ? ` · ${departure.departure_time}`
                            : ""}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {departure.origin} → {departure.destination}
                        </p>

                        {departure.description && (
                          <p className="mt-2 text-sm text-gray-600">
                            {departure.description}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(departure)}
                          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold text-gray-700 hover:bg-white"
                        >
                          <Pencil size={15} />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(departure.id)}
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
      <label className="mb-1 block text-sm font-bold text-gray-700">
        {label}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border px-4 py-3 outline-none focus:border-black"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: DepartureStatus }) {
  const styles: Record<DepartureStatus, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    closed: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const labels: Record<DepartureStatus, string> = {
    scheduled: "Programada",
    closed: "Cerrada",
    completed: "Completada",
    cancelled: "Cancelada",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}