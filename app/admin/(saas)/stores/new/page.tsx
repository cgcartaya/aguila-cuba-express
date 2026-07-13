"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createStore,
  updateStore,
  uploadStoreFavicon,
  uploadStoreLogo,
} from "@/lib/services/stores";

export default function NewStorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    subdomain: "",
    domain: "",
    primary_color: "#0B1F4D",
    secondary_color: "#DC2626",
    plan: "basic",
    monthly_price: 20,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        subdomain: form.subdomain.trim().toLowerCase(),
        domain: form.domain.trim() === "" ? null : form.domain.trim().toLowerCase(),
        logo_url: null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        plan: form.plan,
        monthly_price: Number(form.monthly_price),
        is_active: true,
      };

      const { data: createdStore, error } = await createStore(payload);

      if (error || !createdStore) {
        console.error("SUPABASE CREATE STORE ERROR:", error);
        alert(error?.message || "Error creando tienda");
        return;
      }

      let logoUrl: string | null = null;
      let faviconUrl: string | null = null;

      if (logoFile) {
        const result = await uploadStoreLogo(createdStore.id, logoFile);

        if (result.error) {
          console.error("SUPABASE UPLOAD LOGO ERROR:", result.error);
          alert("La tienda se creó, pero no se pudo subir el logo.");
        } else {
          logoUrl = result.data;
        }
      }

      if (faviconFile) {
        const result = await uploadStoreFavicon(
          createdStore.id,
          faviconFile
        );

        if (result.error) {
          console.error("SUPABASE UPLOAD FAVICON ERROR:", result.error);
          alert("La tienda se creó, pero no se pudo subir el favicon.");
        } else {
          faviconUrl = result.data;
        }
      }

      if (logoUrl || faviconUrl) {
        const { error: assetUpdateError } = await updateStore(
          createdStore.id,
          {
            logo_url: logoUrl,
            favicon_url: faviconUrl,
          }
        );

        if (assetUpdateError) {
          console.error(
            "SUPABASE UPDATE STORE ASSETS ERROR:",
            assetUpdateError
          );
        }
      }

      alert("Tienda creada correctamente");
      window.location.assign("/admin/stores");
    } catch (error) {
      console.error("ERROR GENERAL CREANDO TIENDA:", error);
      alert("Error creando tienda");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">
        Nueva Tienda
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-3xl bg-white p-6 shadow"
      >
        <div>
          <label className="mb-2 block font-medium">Nombre</label>
          <input
            required
            className="w-full rounded-xl border p-3"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
                slug: e.target.value
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, ""),
                subdomain: e.target.value
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, ""),
              })
            }
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">Slug</label>
          <input
            required
            className="w-full rounded-xl border p-3"
            value={form.slug}
            onChange={(e) =>
              setForm({
                ...form,
                slug: e.target.value
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, ""),
                subdomain: e.target.value
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, ""),
              })
            }
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Subdominio automático
          </label>

          <input
            readOnly
            className="w-full rounded-xl border bg-slate-100 p-3 text-slate-700"
            value={form.subdomain}
          />

          <p className="mt-2 text-sm text-slate-500">
            URL pública:{" "}
            <span className="font-semibold text-slate-700">
              https://{form.subdomain || "mi-tienda"}.perlamarketplace.com
            </span>
          </p>
        </div>

        <div>
          <label className="mb-2 block font-medium">Dominio personalizado (opcional)</label>
          <input
            placeholder="Ej: mitienda.com"
            className="w-full rounded-xl border p-3"
            value={form.domain}
            onChange={(e) =>
              setForm({
                ...form,
                domain: e.target.value,
              })
            }
          />
        </div>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block font-medium">
              Logo de la tienda
            </label>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="w-full rounded-xl border bg-white p-3"
              onChange={(event) =>
                setLogoFile(event.target.files?.[0] || null)
              }
            />

            <p className="mt-2 text-xs text-slate-500">
              Recomendado: PNG o WebP, preferiblemente con fondo transparente.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Favicon de la tienda
            </label>

            <input
              type="file"
              accept="image/png,image/x-icon,image/svg+xml,image/webp"
              className="w-full rounded-xl border bg-white p-3"
              onChange={(event) =>
                setFaviconFile(event.target.files?.[0] || null)
              }
            />

            <p className="mt-2 text-xs text-slate-500">
              Imagen cuadrada. Recomendado: PNG de 32×32, 48×48 o 512×512.
            </p>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block font-medium">
              Color principal
            </label>
            <input
              type="color"
              className="h-14 w-full rounded-xl border"
              value={form.primary_color}
              onChange={(e) =>
                setForm({
                  ...form,
                  primary_color: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Color secundario
            </label>
            <input
              type="color"
              className="h-14 w-full rounded-xl border"
              value={form.secondary_color}
              onChange={(e) =>
                setForm({
                  ...form,
                  secondary_color: e.target.value,
                })
              }
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block font-medium">Plan</label>
          <select
            className="w-full rounded-xl border p-3"
            value={form.plan}
            onChange={(e) =>
              setForm({
                ...form,
                plan: e.target.value,
              })
            }
          >
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Precio mensual
          </label>
          <input
            type="number"
            className="w-full rounded-xl border p-3"
            value={form.monthly_price}
            onChange={(e) =>
              setForm({
                ...form,
                monthly_price: Number(e.target.value),
              })
            }
          />
        </div>

        <button
          disabled={loading}
          className="rounded-2xl bg-[#0B1F4D] px-6 py-3 font-bold text-white disabled:opacity-60"
        >
          {loading ? "Creando..." : "Crear tienda"}
        </button>
      </form>
    </main>
  );
}