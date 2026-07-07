"use client";

/* =========================================================
   AJUSTES GENERALES - ADMIN MULTIEMPRESA
========================================================= */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Save, Store } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import AdminBackButton from "@/components/admin/ui/AdminBackButton";
import AdminButton from "@/components/admin/ui/AdminButton";
import AdminInput from "@/components/admin/ui/AdminInput";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

import {
  getStoreSettings,
  saveStoreSettings,
} from "@/lib/services/settings";

const emptyForm = {
  store_name: "",
  slogan: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  facebook: "",
  instagram: "",
};

export default function AdminGeneralSettingsPage() {
  const {
    loading: accessLoading,
    isSuperAdmin,
    store: accessStore,
  } = useAdminAccess();

  const { store: selectedStore } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) {
      return selectedStore || accessStore;
    }

    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const publicStoreUrl = useMemo(() => {
    if (!activeStore?.slug || activeStore.slug === "aguila") {
      return "/tienda";
    }

    return `/tienda/${activeStore.slug}`;
  }, [activeStore?.slug]);

  useEffect(() => {
    async function loadSettings() {
      if (accessLoading) return;

      try {
        setLoading(true);
        setError("");

        if (!activeStore?.id) {
          setForm(emptyForm);
          setError(
            "No se encontró la tienda activa. Vuelve al SaaS y selecciona una tienda."
          );
          return;
        }

        const { data, error: settingsError } = await getStoreSettings(
          activeStore.id
        );

        if (settingsError) throw settingsError;

        setForm({
          store_name: data?.store_name || activeStore.name || "",
          slogan: data?.slogan || "",
          phone: data?.phone || "",
          whatsapp: data?.whatsapp || "",
          email: data?.email || "",
          address: data?.address || "",
          city: data?.city || "",
          facebook: data?.facebook || "",
          instagram: data?.instagram || "",
        });
      } catch (err: any) {
        console.error("ERROR CARGANDO AJUSTES GENERALES:", err);
        setError(
          err?.message || "No se pudo cargar la configuración de esta tienda."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [accessLoading, activeStore?.id]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!activeStore?.id) {
      setError(
        "No se encontró la tienda activa. Vuelve al SaaS y selecciona una tienda."
      );
      return;
    }

    try {
      setSaving(true);
      setSuccess("");
      setError("");

      const { error: saveError } = await saveStoreSettings(
        {
          ...form,
          updated_at: new Date().toISOString(),
        },
        activeStore.id
      );

      if (saveError) throw saveError;

      setSuccess("Ajustes guardados correctamente.");
    } catch (err: any) {
      console.error("ERROR GUARDANDO AJUSTES GENERALES:", err);
      setError(err?.message || "No se pudieron guardar los ajustes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || accessLoading) {
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
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Tienda activa
              </p>

              <p className="text-sm font-black text-slate-900">
                {activeStore?.name ||
                  form.store_name ||
                  "Sin tienda seleccionada"}
              </p>
            </div>

            <Link
              href={publicStoreUrl}
              className="rounded-2xl bg-[#ef0015] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:brightness-95"
            >
              Ver tienda
            </Link>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <AdminInput
              label="Nombre de la tienda"
              value={form.store_name}
              onChange={(value) => handleChange("store_name", value)}
              placeholder="Nombre del negocio"
            />

            <AdminInput
              label="Eslogan"
              value={form.slogan}
              onChange={(value) => handleChange("slogan", value)}
              placeholder="Eslogan de la tienda"
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
              placeholder="correo@negocio.com"
            />

            <AdminInput
              label="Ciudad"
              value={form.city}
              onChange={(value) => handleChange("city", value)}
              placeholder="Ciudad"
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