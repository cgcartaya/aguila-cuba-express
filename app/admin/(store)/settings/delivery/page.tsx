"use client";

/* =========================================================
   AJUSTES DE DOMICILIO - ADMIN
========================================================= */

import { useEffect, useState } from "react";
import { Loader2, Save, Truck } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import AdminBackButton from "@/components/admin/ui/AdminBackButton";
import AdminButton from "@/components/admin/ui/AdminButton";
import AdminInput from "@/components/admin/ui/AdminInput";

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
      <main className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto flex max-w-5xl items-center gap-2 text-slate-500">
          <Loader2 className="animate-spin" size={20} />
          Cargando reglas de domicilio...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-5xl">
        <AdminBackButton />

        <AdminPageHeader
          title="Domicilio"
          description="Define las condiciones de entrega para controlar cuándo aplica el domicilio y qué mensaje verá el cliente."
          badge="Entregas"
          icon={Truck}
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-3">
            <AdminInput
              label="Compra mínima para domicilio"
              value={form.minimum_order}
              onChange={(value) => handleChange("minimum_order", value)}
              placeholder="20"
              type="number"
            />

            <AdminInput
              label="Costo de domicilio"
              value={form.delivery_fee}
              onChange={(value) => handleChange("delivery_fee", value)}
              placeholder="5"
              type="number"
            />

            <AdminInput
              label="Domicilio gratis desde"
              value={form.free_delivery_from}
              onChange={(value) => handleChange("free_delivery_from", value)}
              placeholder="100"
              type="number"
            />

            <div className="md:col-span-3">
              <label className="mb-2 block text-sm font-bold text-[#0B1F4D]">
                Mensaje visible para el cliente
              </label>

              <textarea
                value={form.delivery_message}
                onChange={(e) =>
                  handleChange("delivery_message", e.target.value)
                }
                rows={4}
                placeholder="Ej: Las entregas a domicilio aplican para compras desde $20."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1F4D] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50/50 p-5">
            <h2 className="font-bold text-[#0B1F4D]">
              Vista previa de regla
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Compra mínima:{" "}
              <strong>${Number(form.minimum_order || 0).toFixed(2)}</strong>
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Costo de domicilio:{" "}
              <strong>${Number(form.delivery_fee || 0).toFixed(2)}</strong>
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Gratis desde:{" "}
              <strong>${Number(form.free_delivery_from || 0).toFixed(2)}</strong>
            </p>

            <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium text-slate-700">
              {form.delivery_message}
            </p>
          </div>

          {success && (
            <div className="mt-5 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
              {success}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <AdminButton onClick={handleSave} disabled={saving} icon={Save}>
              {saving ? "Guardando..." : "Guardar reglas"}
            </AdminButton>
          </div>
        </section>
      </div>
    </main>
  );
}