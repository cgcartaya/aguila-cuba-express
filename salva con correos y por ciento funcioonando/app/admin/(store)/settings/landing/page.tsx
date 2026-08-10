"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeHelp,
  Boxes,
  GalleryHorizontalEnd,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Megaphone,
  PackageSearch,
  PanelsTopLeft,
  Save,
  Sparkles,
} from "lucide-react";

import AdminBackButton from "@/components/admin/ui/AdminBackButton";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getStoreSettings, saveStoreSettings } from "@/lib/services/settings";

import type { StoreSettings } from "@/components/admin/settings/types";

type LandingKey =
  | "show_hero"
  | "show_promotions"
  | "show_featured_products"
  | "show_categories"
  | "show_combos"
  | "show_products"
  | "show_delivery_banner"
  | "show_help_card"
  | "show_footer";

type LandingForm = Record<LandingKey, boolean>;

const defaultForm: LandingForm = {
  show_hero: true,
  show_promotions: true,
  show_featured_products: true,
  show_categories: true,
  show_combos: true,
  show_products: true,
  show_delivery_banner: true,
  show_help_card: true,
  show_footer: true,
};

const sections: Array<{
  key: LandingKey;
  title: string;
  description: string;
  icon: typeof PanelsTopLeft;
}> = [
  {
    key: "show_hero",
    title: "Hero / banner principal",
    description: "Banner grande que presenta la tienda y sus ofertas principales.",
    icon: ImageIcon,
  },
  {
    key: "show_promotions",
    title: "Promociones",
    description: "Campañas creadas desde el Centro de Marketing.",
    icon: Megaphone,
  },
  {
    key: "show_featured_products",
    title: "Productos destacados",
    description: "Selección prioritaria de productos en la página de inicio.",
    icon: Sparkles,
  },
  {
    key: "show_categories",
    title: "Categorías",
    description: "Carrusel o cuadrícula visual para explorar la tienda.",
    icon: LayoutGrid,
  },
  {
    key: "show_combos",
    title: "Combos",
    description: "Paquetes promocionales y productos agrupados.",
    icon: Boxes,
  },
  {
    key: "show_products",
    title: "Productos",
    description: "Listados de productos organizados por categoría.",
    icon: PackageSearch,
  },
  {
    key: "show_delivery_banner",
    title: 'Banner "Entrega 24-48 horas"',
    description: "Banner general de entrega rápida que aparece al final de la tienda.",
    icon: GalleryHorizontalEnd,
  },
  {
    key: "show_help_card",
    title: "Tarjeta de ayuda",
    description: "Bloque de contacto por WhatsApp para ayudar al cliente.",
    icon: BadgeHelp,
  },
  {
    key: "show_footer",
    title: "Footer",
    description: "Pie de página con información y enlaces del negocio.",
    icon: PanelsTopLeft,
  },
];

export default function LandingBuilderPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [form, setForm] = useState<LandingForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const publicStoreUrl = useMemo(() => {
    if (!activeStore?.slug || activeStore.slug === "aguila") return "/tienda";
    return `/tienda/${activeStore.slug}`;
  }, [activeStore?.slug]);

  useEffect(() => {
    async function loadSettings() {
      if (accessLoading) return;

      if (!activeStore?.id) {
        setError("No se encontró la tienda activa.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const { data, error: settingsError } = await getStoreSettings(
          activeStore.id
        );
        if (settingsError) throw settingsError;

        setForm(
          Object.fromEntries(
            Object.keys(defaultForm).map((key) => [
              key,
              data?.[key as keyof StoreSettings] !== false,
            ])
          ) as LandingForm
        );
      } catch (err: any) {
        console.error("ERROR CARGANDO LANDING BUILDER:", err);
        setError(err?.message || "No se pudo cargar la configuración.");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [accessLoading, activeStore?.id]);

  const toggle = (key: LandingKey) => {
    setSuccess("");
    setForm((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const handleSave = async () => {
    if (!activeStore?.id) {
      setError("No se encontró la tienda activa.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const { error: saveError } = await saveStoreSettings(
        { ...form, updated_at: new Date().toISOString() },
        activeStore.id
      );
      if (saveError) throw saveError;

      setSuccess("Landing actualizada correctamente.");
    } catch (err: any) {
      console.error("ERROR GUARDANDO LANDING BUILDER:", err);
      setError(err?.message || "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || accessLoading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-6">
        <div className="mx-auto flex max-w-5xl items-center gap-2 text-slate-500">
          <Loader2 className="animate-spin" size={20} />
          Cargando Landing Builder...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-5xl">
        <AdminBackButton />

        <AdminPageHeader
          title="Landing Builder"
          description="Decide qué secciones aparecen en la página pública de la tienda seleccionada."
          badge="V16.5"
          icon={PanelsTopLeft}
        />

        <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Editando
            </p>
            <p className="mt-1 font-black text-[#0B1F4D]">
              {activeStore?.name || "Tienda seleccionada"}
            </p>
          </div>

          <Link
            href={publicStoreUrl}
            target="_blank"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-[#0B1F4D] transition hover:bg-slate-50"
          >
            Ver tienda
          </Link>
        </section>

        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {success}
          </div>
        )}

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-black text-[#0B1F4D]">
              Secciones de la landing
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Los cambios se aplican solamente a esta tienda después de guardar.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {sections.map((section) => {
              const Icon = section.icon;
              const enabled = form[section.key];

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => toggle(section.key)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50 md:px-6"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <Icon size={21} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-black text-slate-900">
                      {section.title}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-slate-500">
                      {section.description}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      enabled ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                        enabled ? "left-6" : "left-1"
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="sticky bottom-4 mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !activeStore?.id}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ef0015] px-6 py-3.5 font-black text-white shadow-lg shadow-red-900/20 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={19} />
            ) : (
              <Save size={19} />
            )}
            {saving ? "Guardando..." : "Guardar Landing"}
          </button>
        </div>
      </div>
    </main>
  );
}
