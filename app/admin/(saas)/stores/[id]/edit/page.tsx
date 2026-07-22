"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink, ImageIcon, Search, Share2, Upload } from "lucide-react"
import {
  getStoreById,
  updateStore,
  uploadStoreLogo,
  uploadStoreFavicon,
  uploadStoreOgImage,
} from "@/lib/services/stores"

export default function EditStorePage() {
  const router = useRouter()
  const params = useParams()
  const storeId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [ogImageFile, setOgImageFile] = useState<File | null>(null)
  const [ogPreviewUrl, setOgPreviewUrl] = useState("")

  const [form, setForm] = useState({
    name: "",
    slug: "",
    subdomain: "",
    domain: "",
    logo_url: "",
    favicon_url: "",
    meta_title: "",
    meta_description: "",
    og_image_url: "",
    primary_color: "#0B1F4D",
    secondary_color: "#DC2626",
    plan: "basic",
    monthly_price: 20,
    is_active: true,
    last_payment_date: "",
    next_payment_date: "",
    payment_status: "pending",
    notes: "",
    client_name: "",
    client_phone: "",
    client_email: "",
  })

  useEffect(() => {
    async function loadStore() {
      const store = await getStoreById(storeId)

      if (!store) {
        alert("No se encontró la tienda")
        router.push("/admin/stores")
        return
      }

      setForm({
        name: store.name || "",
        slug: store.slug || "",
        subdomain: store.subdomain || store.slug || "",
        domain: store.domain || "",
        logo_url: store.logo_url || "",
        favicon_url: store.favicon_url || "",
        meta_title: store.meta_title || "",
        meta_description: store.meta_description || "",
        og_image_url: store.og_image_url || "",
        primary_color: store.primary_color || "#0B1F4D",
        secondary_color: store.secondary_color || "#DC2626",
        plan: store.plan || "basic",
        monthly_price: Number(store.monthly_price || 20),
        is_active: Boolean(store.is_active),
        last_payment_date: store.last_payment_date || "",
        next_payment_date: store.next_payment_date || "",
        payment_status: store.payment_status || "pending",
        notes: store.notes || "",
        client_name: store.client_name || "",
        client_phone: store.client_phone || "",
        client_email: store.client_email || "",
      })

      setLoading(false)
    }

    loadStore()
  }, [storeId, router])

  useEffect(() => {
    if (!ogImageFile) {
      setOgPreviewUrl(form.og_image_url)
      return
    }

    const objectUrl = URL.createObjectURL(ogImageFile)
    setOgPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [ogImageFile, form.og_image_url])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSaving(true)

      let logoUrl = form.logo_url || null

      if (logoFile) {
        const { data, error } = await uploadStoreLogo(storeId, logoFile)

        if (error) {
          console.error("SUPABASE UPLOAD LOGO ERROR:", error)
          alert(error.message || "Error subiendo logo")
          return
        }

        logoUrl = data
      }

      let faviconUrl = form.favicon_url || null

      if (faviconFile) {
        const { data, error } = await uploadStoreFavicon(
          storeId,
          faviconFile
        )

        if (error) {
          console.error("SUPABASE UPLOAD FAVICON ERROR:", error)
          alert(error.message || "Error subiendo favicon")
          return
        }

        faviconUrl = data
      }

      let ogImageUrl = form.og_image_url || null

      if (ogImageFile) {
        const { data, error } = await uploadStoreOgImage(storeId, ogImageFile)

        if (error) {
          console.error("SUPABASE UPLOAD OG IMAGE ERROR:", error)
          alert(error.message || "Error subiendo la imagen para compartir")
          return
        }

        ogImageUrl = data
      }

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        subdomain: form.subdomain.trim().toLowerCase(),
        domain: form.domain.trim() === "" ? null : form.domain.trim().toLowerCase(),
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        meta_title: form.meta_title.trim() === "" ? null : form.meta_title.trim(),
        meta_description: form.meta_description.trim() === "" ? null : form.meta_description.trim(),
        og_image_url: ogImageUrl,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        plan: form.plan,
        monthly_price: Number(form.monthly_price),
        is_active: form.is_active,
        last_payment_date: form.last_payment_date || null,
        next_payment_date: form.next_payment_date || null,
        payment_status: form.payment_status,
        notes: form.notes.trim() === "" ? null : form.notes.trim(),
        client_name: form.client_name.trim() === "" ? null : form.client_name.trim(),
        client_phone: form.client_phone.trim() === "" ? null : form.client_phone.trim(),
        client_email: form.client_email.trim() === "" ? null : form.client_email.trim(),
      }

      const { error } = await updateStore(storeId, payload)

      if (error) {
        console.error("SUPABASE UPDATE STORE ERROR:", error)
        alert(error.message || "Error actualizando tienda")
        return
      }

      alert("Tienda actualizada correctamente")
      router.push("/admin/stores")
    } catch (error) {
      console.error("ERROR GENERAL ACTUALIZANDO TIENDA:", error)
      alert("Error actualizando tienda")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-slate-600">Cargando tienda...</p>
      </main>
    )
  }

  const publicUrl = form.domain
    ? `https://${form.domain.replace(/^https?:\/\//, "").replace(/^www\./, "")}`
    : `https://${form.subdomain || form.slug || "mi-tienda"}.perlamarketplace.com`
  const seoTitle = form.meta_title.trim() || `${form.name || "Mi tienda"} | Perla Marketplace`
  const seoDescription =
    form.meta_description.trim() ||
    `Descubre productos, ofertas y novedades de ${form.name || "esta tienda"}.`

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Link
        href="/admin/stores"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a tiendas
      </Link>

      <h1 className="mb-6 text-3xl font-bold text-slate-900">
        Editar Tienda
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-3xl bg-white p-6 shadow"
      >
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Datos del cliente
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium">Nombre del cliente</label>
              <input
                className="w-full rounded-xl border p-3"
                value={form.client_name}
                onChange={(e) =>
                  setForm({ ...form, client_name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Teléfono WhatsApp</label>
              <input
                placeholder="Ej: 17861234567"
                className="w-full rounded-xl border p-3"
                value={form.client_phone}
                onChange={(e) =>
                  setForm({ ...form, client_phone: e.target.value })
                }
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block font-medium">Email</label>
            <input
              type="email"
              className="w-full rounded-xl border p-3"
              value={form.client_email}
              onChange={(e) =>
                setForm({ ...form, client_email: e.target.value })
              }
            />
          </div>
        </section>

        <div>
          <label className="mb-2 block font-medium">Nombre de la tienda</label>
          <input
            required
            className="w-full rounded-xl border p-3"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
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
            Subdominio
          </label>

          <input
            required
            className="w-full rounded-xl border p-3"
            value={form.subdomain}
            onChange={(e) =>
              setForm({
                ...form,
                subdomain: e.target.value
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, ""),
              })
            }
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
          <div className="rounded-2xl border bg-white p-4">
            <label className="mb-3 block font-medium">
              Logo de la tienda
            </label>

            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                {form.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logo_url}
                    alt={form.name || "Logo de tienda"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Upload className="h-8 w-8 text-slate-400" />
                )}
              </div>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="min-w-0 flex-1 rounded-xl border p-3"
                onChange={(event) =>
                  setLogoFile(event.target.files?.[0] || null)
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <label className="mb-3 block font-medium">
              Favicon de la tienda
            </label>

            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 p-3">
                {form.favicon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.favicon_url}
                    alt={`Favicon de ${form.name || "la tienda"}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Upload className="h-7 w-7 text-slate-400" />
                )}
              </div>

              <input
                type="file"
                accept="image/png,image/x-icon,image/svg+xml,image/webp"
                className="min-w-0 flex-1 rounded-xl border p-3"
                onChange={(event) =>
                  setFaviconFile(event.target.files?.[0] || null)
                }
              />
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Usa una imagen cuadrada. Recomendado: 32×32, 48×48 o 512×512.
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

        <section className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-[#0B1F4D]" />
                <h2 className="text-xl font-bold text-slate-900">SEO y vista al compartir</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Controla cómo aparece la tienda en Google, WhatsApp y redes sociales.
              </p>
            </div>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1F4D] hover:underline"
            >
              Abrir tienda <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border bg-white p-4">
                <label className="mb-2 block font-semibold text-slate-800">Título SEO</label>
                <input
                  maxLength={70}
                  className="w-full rounded-xl border p-3"
                  placeholder={`${form.name || "Mi tienda"} | Perla Marketplace`}
                  value={form.meta_title}
                  onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                />
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>Recomendado: entre 30 y 60 caracteres.</span>
                  <span className={form.meta_title.length > 60 ? "font-bold text-amber-600" : ""}>
                    {form.meta_title.length}/70
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <label className="mb-2 block font-semibold text-slate-800">Descripción SEO</label>
                <textarea
                  rows={4}
                  maxLength={180}
                  className="w-full rounded-xl border p-3"
                  placeholder={`Describe brevemente lo que ofrece ${form.name || "la tienda"}.`}
                  value={form.meta_description}
                  onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                />
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>Recomendado: entre 120 y 160 caracteres.</span>
                  <span className={form.meta_description.length > 160 ? "font-bold text-amber-600" : ""}>
                    {form.meta_description.length}/180
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-[#0B1F4D]" />
                  <label className="font-semibold text-slate-800">Imagen para compartir</label>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="w-full rounded-xl border p-3"
                  onChange={(event) => setOgImageFile(event.target.files?.[0] || null)}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Recomendado: 1200 × 630 px, PNG, JPG o WebP. Se subirá al bucket público <strong>seo</strong>.
                </p>
                {form.og_image_url && !ogImageFile ? (
                  <button
                    type="button"
                    className="mt-3 text-sm font-semibold text-red-600 hover:underline"
                    onClick={() => setForm({ ...form, og_image_url: "" })}
                  >
                    Quitar imagen actual
                  </button>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-bold text-slate-700">
                  <Share2 className="h-4 w-4" /> Vista previa de WhatsApp
                </div>
                <div className="bg-[#efeae2] p-4">
                  <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                    <div className="aspect-[1200/630] bg-slate-100">
                      {ogPreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ogPreviewUrl} alt="Vista previa Open Graph" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
                          Sube una imagen para ver la vista previa
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 font-bold text-slate-900">{seoTitle}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{seoDescription}</p>
                      <p className="mt-2 truncate text-xs uppercase text-slate-400">
                        {publicUrl.replace(/^https?:\/\//, "")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Search className="h-4 w-4" /> Vista previa de Google
                </div>
                <p className="truncate text-sm text-emerald-700">{publicUrl}</p>
                <p className="mt-1 line-clamp-1 text-xl text-[#1a0dab]">{seoTitle}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{seoDescription}</p>
              </div>
            </div>
          </div>
        </section>

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

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Gestión comercial SaaS
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium">
                Último pago
              </label>
              <input
                type="date"
                className="w-full rounded-xl border p-3"
                value={form.last_payment_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    last_payment_date: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">
                Próximo pago
              </label>
              <input
                type="date"
                className="w-full rounded-xl border p-3"
                value={form.next_payment_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    next_payment_date: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block font-medium">
              Estado de pago
            </label>
            <select
              className="w-full rounded-xl border p-3"
              value={form.payment_status}
              onChange={(e) =>
                setForm({
                  ...form,
                  payment_status: e.target.value,
                })
              }
            >
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
              <option value="overdue">Atrasado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="mb-2 block font-medium">
              Notas internas
            </label>
            <textarea
              rows={4}
              className="w-full rounded-xl border p-3"
              placeholder="Notas sobre el cliente..."
              value={form.notes}
              onChange={(e) =>
                setForm({
                  ...form,
                  notes: e.target.value,
                })
              }
            />
          </div>
        </section>

        <label className="flex items-center gap-3 rounded-2xl border p-4">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({
                ...form,
                is_active: e.target.checked,
              })
            }
          />
          <span className="font-medium text-slate-800">
            Tienda activa
          </span>
        </label>

        <button
          disabled={saving}
          className="rounded-2xl bg-[#0B1F4D] px-6 py-3 font-bold text-white disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </main>
  )
}