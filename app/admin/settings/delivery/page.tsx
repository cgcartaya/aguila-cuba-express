"use client";

/* =========================================================
   AJUSTES DE DOMICILIO - ADMIN

   Aquí el administrador controla las reglas comerciales
   de entrega:
   - compra mínima
   - costo de domicilio
   - domicilio gratis desde cierto monto
   - mensaje visible para el cliente
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Truck } from "lucide-react";

import {
  getStoreSettings,
  saveStoreSettings,
} from "@/lib/services/settings";

export default function AdminDeliverySettingsPage() {
  const [form, setForm] = useState({
    minimum_order: "20",
    delivery_fee: "0",
    free_delivery_from: "0",
    delivery_message:
      "Las entregas a domicilio aplican para compras desde $20.",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadSettings() {
      const { data } = await getStoreSettings();

      if (data) {
        setForm({
          minimum_order: String(data.minimum_order ?? 20),
          delivery_fee: String(data.delivery_fee ?? 0),
          free_delivery_from: String(data.free_delivery_from ?? 0),
          delivery_message:
            data.delivery_message ||
            "Las entregas a domicilio aplican para compras desde $20.",
        });
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess("");

    await saveStoreSettings({
      minimum_order: Number(form.minimum_order || 0),
      delivery_fee: Number(form.delivery_fee || 0),
      free_delivery_from: Number(form.free_delivery_from || 0),
      delivery_message: form.delivery_message,
      updated_at: new Date().toISOString(),
    });

    setSuccess("Reglas de domicilio guardadas correctamente.");
    setSaving(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto flex max-w-5xl items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" size={20} />
          Cargando reglas de domicilio...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600"
        >
          <ArrowLeft size={18} />
          Volver a ajustes
        </Link>

        <section className="mb-8 rounded-[2rem] bg-black p-8 text-white">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
            <Truck size={16} />
            Entregas
          </div>

          <h1 className="text-3xl font-bold md:text-5xl">
            Domicilio
          </h1>

          <p className="mt-3 max-w-2xl text-white/70">
            Define las condiciones de entrega para controlar cuándo aplica el
            domicilio y qué mensaje verá el cliente.
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-3">
            <Input
              label="Compra mínima para domicilio"
              value={form.minimum_order}
              onChange={(value) => handleChange("minimum_order", value)}
              placeholder="20"
              type="number"
            />

            <Input
              label="Costo de domicilio"
              value={form.delivery_fee}
              onChange={(value) => handleChange("delivery_fee", value)}
              placeholder="5"
              type="number"
            />

            <Input
              label="Domicilio gratis desde"
              value={form.free_delivery_from}
              onChange={(value) => handleChange("free_delivery_from", value)}
              placeholder="100"
              type="number"
            />

            <div className="md:col-span-3">
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Mensaje visible para el cliente
              </label>

              <textarea
                value={form.delivery_message}
                onChange={(e) =>
                  handleChange("delivery_message", e.target.value)
                }
                rows={4}
                placeholder="Ej: Las entregas a domicilio aplican para compras desde $20."
                className="w-full rounded-2xl border px-4 py-3 outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-gray-50 p-5">
            <h2 className="font-bold text-gray-900">
              Vista previa de regla
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Compra mínima:{" "}
              <strong>${Number(form.minimum_order || 0).toFixed(2)}</strong>
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Costo de domicilio:{" "}
              <strong>${Number(form.delivery_fee || 0).toFixed(2)}</strong>
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Gratis desde:{" "}
              <strong>${Number(form.free_delivery_from || 0).toFixed(2)}</strong>
            </p>

            <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium text-gray-700">
              {form.delivery_message}
            </p>
          </div>

          {success && (
            <div className="mt-5 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
              {success}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 font-bold text-white disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Guardar reglas
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border px-4 py-3 outline-none focus:border-black"
      />
    </div>
  );
}