"use client";

/* =========================================================
   AJUSTES DE BANNERS - ADMIN

   Aquí el administrador controla los banners/promociones
   de la tienda:
   - título
   - subtítulo
   - imagen URL
   - texto del botón
   - link del botón
   - orden
   - activo / inactivo

   Nota:
   En esta primera versión usamos image_url manual.
   Luego podemos mejorarlo con subida directa a Supabase Storage.
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Image,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import {
  createBanner,
  deleteBanner,
  getBanners,
  updateBanner,
} from "@/lib/services/settings";
import type { Banner } from "@/components/admin/settings/types";

export default function AdminBannersSettingsPage() {
  const [banners, setBanners] = useState<Banner[]>([]);

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    image_url: "",
    button_text: "",
    button_link: "/tienda",
    sort_order: "0",
    is_active: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadBanners = async () => {
    setLoading(true);

    const { data } = await getBanners();

    setBanners(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleCreate = async () => {
    if (!form.title) return;

    setSaving(true);

    await createBanner({
      title: form.title,
      subtitle: form.subtitle,
      image_url: form.image_url,
      button_text: form.button_text,
      button_link: form.button_link,
      sort_order: Number(form.sort_order || 0),
      is_active: form.is_active,
    });

    setForm({
      title: "",
      subtitle: "",
      image_url: "",
      button_text: "",
      button_link: "/tienda",
      sort_order: "0",
      is_active: true,
    });

    await loadBanners();
    setSaving(false);
  };

  const handleUpdate = async (
    id: string,
    field: keyof Banner,
    value: string | number | boolean
  ) => {
    await updateBanner(id, {
      [field]: value,
    });

    setBanners((prev) =>
      prev.map((banner) =>
        banner.id === id ? { ...banner, [field]: value } : banner
      )
    );
  };

  const handleDelete = async (id: string) => {
    const ok = confirm("¿Seguro que quieres eliminar este banner?");
    if (!ok) return;

    await deleteBanner(id);
    await loadBanners();
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600"
        >
          <ArrowLeft size={18} />
          Volver a ajustes
        </Link>

        <section className="mb-8 rounded-[2rem] bg-black p-8 text-white">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
            <Image size={16} />
            Promociones
          </div>

          <h1 className="text-3xl font-bold md:text-5xl">
            Banners
          </h1>

          <p className="mt-3 max-w-2xl text-white/70">
            Crea y administra banners promocionales para la tienda sin tocar
            código.
          </p>
        </section>

        <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-gray-900">
            Nuevo banner
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Título"
              value={form.title}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, title: value }))
              }
              placeholder="Ej: Envíos semanales a Cienfuegos"
            />

            <Input
              label="Subtítulo"
              value={form.subtitle}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, subtitle: value }))
              }
              placeholder="Recibe tus productos rápido y seguro"
            />

            <Input
              label="URL de imagen"
              value={form.image_url}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, image_url: value }))
              }
              placeholder="/banners/banner-1.jpg"
            />

            <Input
              label="Texto del botón"
              value={form.button_text}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, button_text: value }))
              }
              placeholder="Ver productos"
            />

            <Input
              label="Link del botón"
              value={form.button_link}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, button_link: value }))
              }
              placeholder="/tienda"
            />

            <Input
              label="Orden"
              type="number"
              value={form.sort_order}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, sort_order: value }))
              }
              placeholder="0"
            />

            <label className="flex items-center gap-3 rounded-2xl border px-4 py-3 md:col-span-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
                className="h-5 w-5"
              />

              <div>
                <p className="font-bold text-gray-900">
                  Banner activo
                </p>
                <p className="text-sm text-gray-500">
                  Si está activo, podrá mostrarse en la tienda.
                </p>
              </div>
            </label>
          </div>

          {form.image_url && (
            <div className="mt-5 overflow-hidden rounded-3xl border bg-gray-50">
              <img
                src={form.image_url}
                alt="Vista previa del banner"
                className="h-56 w-full object-cover"
              />
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={saving || !form.title}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Guardando...
              </>
            ) : (
              <>
                <Plus size={20} />
                Crear banner
              </>
            )}
          </button>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-gray-900">
            Banners existentes
          </h2>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="animate-spin" size={20} />
              Cargando banners...
            </div>
          ) : banners.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
              Todavía no hay banners creados.
            </p>
          ) : (
            <div className="space-y-4">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className="rounded-3xl border p-4"
                >
                  {banner.image_url && (
                    <div className="mb-4 overflow-hidden rounded-2xl bg-gray-100">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="h-48 w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Input
                      label="Título"
                      value={banner.title}
                      onChange={(value) =>
                        handleUpdate(banner.id, "title", value)
                      }
                    />

                    <Input
                      label="Subtítulo"
                      value={banner.subtitle || ""}
                      onChange={(value) =>
                        handleUpdate(banner.id, "subtitle", value)
                      }
                    />

                    <Input
                      label="Imagen"
                      value={banner.image_url || ""}
                      onChange={(value) =>
                        handleUpdate(banner.id, "image_url", value)
                      }
                    />

                    <Input
                      label="Texto botón"
                      value={banner.button_text || ""}
                      onChange={(value) =>
                        handleUpdate(banner.id, "button_text", value)
                      }
                    />

                    <Input
                      label="Link botón"
                      value={banner.button_link || ""}
                      onChange={(value) =>
                        handleUpdate(banner.id, "button_link", value)
                      }
                    />

                    <Input
                      label="Orden"
                      type="number"
                      value={String(banner.sort_order || 0)}
                      onChange={(value) =>
                        handleUpdate(
                          banner.id,
                          "sort_order",
                          Number(value)
                        )
                      }
                    />
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      onClick={() =>
                        handleUpdate(
                          banner.id,
                          "is_active",
                          !banner.is_active
                        )
                      }
                      className={`rounded-2xl px-5 py-3 font-bold ${
                        banner.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {banner.is_active ? "Activo" : "Inactivo"}
                    </button>

                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 py-3 font-bold text-red-600"
                    >
                      <Trash2 size={18} />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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