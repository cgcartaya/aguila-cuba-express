"use client";

import { useEffect, useState } from "react";
import { Loader2, Palette, Save } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import {
  getSaasSettings,
  updateSaasSettings,
  type SaasSettings,
} from "@/lib/saas/settings-service";

const DEFAULTS: SaasSettings = {
  primary_color: "#111827",
  secondary_color: "#2563EB",
};

export default function SaasSettingsPage() {
  const [form, setForm] = useState<SaasSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const settings = await getSaasSettings();
      setForm(settings);
      setLoading(false);
    }
    void load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");

    const result = await updateSaasSettings(form);
    if (result.error || !result.data) {
      setError(result.error || "No se pudo guardar la configuración.");
    } else {
      setForm(result.data);
      setMessage("Colores del panel Super Admin actualizados.");
      // El sidebar y el topbar leen estos colores; recargamos para que
      // se vean aplicados de inmediato en toda la sesión.
      setTimeout(() => window.location.reload(), 600);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto flex max-w-5xl items-center gap-2 text-slate-500">
          <Loader2 className="animate-spin" size={20} />
          Cargando ajustes...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          eyebrow="Super Admin"
          icon={Palette}
          title="Ajustes SaaS"
          description="Colores de marca de TU panel de plataforma — no afectan a ninguna tienda de cliente, esos se editan aparte en cada tienda."
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium">Color principal</label>
              <input
                type="color"
                className="h-14 w-full rounded-xl border"
                value={form.primary_color}
                onChange={(e) =>
                  setForm({ ...form, primary_color: e.target.value })
                }
              />
              <p className="mt-2 text-xs text-slate-500">
                Fondo del sidebar y del encabezado del panel Super Admin.
              </p>
            </div>

            <div>
              <label className="mb-2 block font-medium">Color secundario</label>
              <input
                type="color"
                className="h-14 w-full rounded-xl border"
                value={form.secondary_color}
                onChange={(e) =>
                  setForm({ ...form, secondary_color: e.target.value })
                }
              />
              <p className="mt-2 text-xs text-slate-500">
                Color de acento (chips, detalles) del panel Super Admin.
              </p>
            </div>
          </div>

          {message && (
            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Guardar cambios
          </button>
        </section>
      </div>
    </main>
  );
}
