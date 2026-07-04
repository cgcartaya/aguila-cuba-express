"use client";

/* =========================================================
   AJUSTES GENERALES - ADMIN
========================================================= */

import { useEffect, useState } from "react";
import { Loader2, Save, Store } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import AdminBackButton from "@/components/admin/ui/AdminBackButton";
import AdminButton from "@/components/admin/ui/AdminButton";
import AdminInput from "@/components/admin/ui/AdminInput";

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
      ...form,
      updated_at: new Date().toISOString(),
    });

    setSuccess("Ajustes guardados correctamente.");
    setSaving(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto flex max-w-5xl items-center gap-2 text-slate-500">
          <Loader2 className="animate-spin" size={20} />
          Cargando configuración...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-5xl">
        <AdminBackButton />

        <AdminPageHeader
          title="Configuración general"
          description="Datos principales que usará la tienda para mostrar información del negocio y canales de contacto."
          badge="Negocio"
          icon={Store}
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <AdminInput
              label="Nombre de la tienda"
              value={form.store_name}
              onChange={(value) => handleChange("store_name", value)}
              placeholder="Águila Cuba Express"
            />

            <AdminInput
              label="Eslogan"
              value={form.slogan}
              onChange={(value) => handleChange("slogan", value)}
              placeholder="Envíos rápidos y seguros hacia Cuba"
            />

            <AdminInput
              label="Teléfono"
              value={form.phone}
              onChange={(value) => handleChange("phone", value)}
              placeholder="+1 305..."
            />

            <AdminInput
              label="WhatsApp"
              value={form.whatsapp}
              onChange={(value) => handleChange("whatsapp", value)}
              placeholder="+1 305..."
            />

            <AdminInput
              label="Correo electrónico"
              value={form.email}
              onChange={(value) => handleChange("email", value)}
              placeholder="info@aguilacubaexpress.com"
            />

            <AdminInput
              label="Ciudad"
              value={form.city}
              onChange={(value) => handleChange("city", value)}
              placeholder="Miami"
            />

            <div className="md:col-span-2">
              <AdminInput
                label="Dirección"
                value={form.address}
                onChange={(value) => handleChange("address", value)}
                placeholder="Dirección física del negocio"
              />
            </div>

            <AdminInput
              label="Facebook"
              value={form.facebook}
              onChange={(value) => handleChange("facebook", value)}
              placeholder="https://facebook.com/..."
            />

            <AdminInput
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
            <AdminButton onClick={handleSave} disabled={saving} icon={Save}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </AdminButton>
          </div>
        </section>
      </div>
    </main>
  );
}