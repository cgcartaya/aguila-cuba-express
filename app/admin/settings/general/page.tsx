"use client";

/* =========================================================
   AJUSTES GENERALES - ADMIN

   Aquí el administrador controla datos principales
   del negocio:
   - nombre
   - slogan
   - teléfono / WhatsApp
   - email
   - dirección
   - redes sociales
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Store } from "lucide-react";

import {
  getStoreSettings,
  saveStoreSettings,
} from "@/lib/services/settings";

export default function AdminGeneralSettingsPage() {
  const [form, setForm] = useState({
    store_name: "Águila Cuba Express",
    slogan: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    city: "",
    facebook: "",
    instagram: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadSettings() {
      const { data } = await getStoreSettings();

      if (data) {
        setForm({
          store_name: data.store_name || "Águila Cuba Express",
          slogan: data.slogan || "",
          phone: data.phone || "",
          whatsapp: data.whatsapp || "",
          email: data.email || "",
          address: data.address || "",
          city: data.city || "",
          facebook: data.facebook || "",
          instagram: data.instagram || "",
        });
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  const handleChange = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess("");

    await saveStoreSettings({
      ...form,
      updated_at: new Date().toISOString(),
    });

    setSuccess("Ajustes guardados correctamente.");
    setSaving(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto flex max-w-5xl items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" size={20} />
          Cargando configuración...
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
            <Store size={16} />
            Negocio
          </div>

          <h1 className="text-3xl font-bold md:text-5xl">
            Configuración general
          </h1>

          <p className="mt-3 max-w-2xl text-white/70">
            Datos principales que usará la tienda para mostrar información del
            negocio y canales de contacto.
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Nombre de la tienda"
              value={form.store_name}
              onChange={(value) => handleChange("store_name", value)}
              placeholder="Águila Cuba Express"
            />

            <Input
              label="Eslogan"
              value={form.slogan}
              onChange={(value) => handleChange("slogan", value)}
              placeholder="Envíos rápidos y seguros hacia Cuba"
            />

            <Input
              label="Teléfono"
              value={form.phone}
              onChange={(value) => handleChange("phone", value)}
              placeholder="+1 305..."
            />

            <Input
              label="WhatsApp"
              value={form.whatsapp}
              onChange={(value) => handleChange("whatsapp", value)}
              placeholder="+1 305..."
            />

            <Input
              label="Correo electrónico"
              value={form.email}
              onChange={(value) => handleChange("email", value)}
              placeholder="info@aguilacubaexpress.com"
            />

            <Input
              label="Ciudad"
              value={form.city}
              onChange={(value) => handleChange("city", value)}
              placeholder="Miami"
            />

            <div className="md:col-span-2">
              <Input
                label="Dirección"
                value={form.address}
                onChange={(value) => handleChange("address", value)}
                placeholder="Dirección física del negocio"
              />
            </div>

            <Input
              label="Facebook"
              value={form.facebook}
              onChange={(value) => handleChange("facebook", value)}
              placeholder="https://facebook.com/..."
            />

            <Input
              label="Instagram"
              value={form.instagram}
              onChange={(value) => handleChange("instagram", value)}
              placeholder="https://instagram.com/..."
            />
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
                  Guardar cambios
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border px-4 py-3 outline-none focus:border-black"
      />
    </div>
  );
}