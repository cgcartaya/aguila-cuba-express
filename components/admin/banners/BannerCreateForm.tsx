"use client";

import { Plus } from "lucide-react";

import AdminButton from "@/components/admin/ui/AdminButton";
import AdminInput from "@/components/admin/ui/AdminInput";

import BannerImageUploader from "./BannerImageUploader";
import BannerPreview from "./BannerPreview";

import type {
  BannerLayoutType,
  Category,
} from "@/components/admin/settings/types";

type Props = {
  form: {
    title: string;
    subtitle: string;
    image_url: string;
    product_image_url?: string;
    badge_text?: string;
    button_text: string;
    button_link: string;
    sort_order: string;
    is_active: boolean;

    layout_type?: BannerLayoutType;
    background_color?: string;
    text_color?: string;
    accent_color?: string;
  };

  categories: Category[];

  onChange: (field: string, value: string | boolean) => void;

  onCategoryChange: (categoryId: string) => void;

  onCreate: () => void;

  saving: boolean;
};

export default function BannerCreateForm({
  form,
  categories,
  onChange,
  onCategoryChange,
  onCreate,
  saving,
}: Props) {
  const isTemplate = form.layout_type === "template";

  return (
    <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-black text-[#0B1F4D]">
        Nuevo banner
      </h2>

      {/* ==========================================
          TIPO DE BANNER
      ========================================== */}

      <div className="mb-6">
        <label className="mb-3 block text-sm font-black text-[#0B1F4D]">
          Tipo de banner
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              onChange("layout_type", "image")
            }
            className={`rounded-2xl border p-4 font-bold transition ${
              form.layout_type !== "template"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200"
            }`}
          >
            Imagen completa
          </button>

          <button
            type="button"
            onClick={() =>
              onChange("layout_type", "template")
            }
            className={`rounded-2xl border p-4 font-bold transition ${
              isTemplate
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200"
            }`}
          >
            Plantilla automática
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">

        <AdminInput
          label="Título"
          value={form.title}
          onChange={(value) => onChange("title", value)}
        />

        <AdminInput
          label="Subtítulo"
          value={form.subtitle}
          onChange={(value) => onChange("subtitle", value)}
        />

        <AdminInput
          label="Texto botón"
          value={form.button_text}
          onChange={(value) => onChange("button_text", value)}
        />

        <AdminInput
          label="Orden"
          type="number"
          value={form.sort_order}
          onChange={(value) =>
            onChange("sort_order", value)
          }
        />

        {isTemplate && (
          <>
            <AdminInput
              label="Badge"
              value={form.badge_text || ""}
              onChange={(value) =>
                onChange("badge_text", value)
              }
            />

            <div>
              <label className="mb-2 block text-sm font-bold">
                Color fondo
              </label>

              <input
                type="color"
                value={
                  form.background_color || "#061b3a"
                }
                onChange={(e) =>
                  onChange(
                    "background_color",
                    e.target.value
                  )
                }
                className="h-12 w-full rounded-xl"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Color texto
              </label>

              <input
                type="color"
                value={
                  form.text_color || "#ffffff"
                }
                onChange={(e) =>
                  onChange(
                    "text_color",
                    e.target.value
                  )
                }
                className="h-12 w-full rounded-xl"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Color botón
              </label>

              <input
                type="color"
                value={
                  form.accent_color || "#ef4444"
                }
                onChange={(e) =>
                  onChange(
                    "accent_color",
                    e.target.value
                  )
                }
                className="h-12 w-full rounded-xl"
              />
            </div>

            <BannerImageUploader
              label="Imagen del producto"
              onUploaded={(url) =>
                onChange(
                  "product_image_url",
                  url
                )
              }
            />
          </>
        )}

        {!isTemplate && (
          <BannerImageUploader
            onUploaded={(url) =>
              onChange("image_url", url)
            }
          />
        )}

        <div>
          <label className="mb-2 block text-sm font-bold text-[#0B1F4D]">
            Categoría destino
          </label>

          <select
            onChange={(e) =>
              onCategoryChange(e.target.value)
            }
            className="h-12 w-full rounded-2xl border border-slate-200 px-4"
          >
            <option value="">
              Tienda completa
            </option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        <BannerPreview
          imageUrl={
            isTemplate
              ? form.product_image_url
              : form.image_url
          }
        />
      </div>

      <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-blue-50 px-4 py-3">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) =>
            onChange(
              "is_active",
              e.target.checked
            )
          }
        />

        <span className="font-bold text-[#0B1F4D]">
          Banner activo
        </span>
      </label>

      <div className="mt-5">
        <AdminButton
          onClick={onCreate}
          disabled={saving}
          icon={Plus}
        >
          {saving
            ? "Guardando..."
            : "Crear banner"}
        </AdminButton>
      </div>
    </section>
  );
}