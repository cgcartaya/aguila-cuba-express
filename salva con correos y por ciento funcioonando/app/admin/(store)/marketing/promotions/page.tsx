"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  ImagePlus,
  Megaphone,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  createPromotion,
  deletePromotion,
  getAdminPromotions,
  updatePromotion,
  uploadPromotionImage,
} from "@/lib/services/marketing";
import {
  buildPromotionDestination,
  destinationFieldCopy,
} from "@/lib/marketing/destination";
import {
  MARKETING_PROMOTION_CATEGORIES,
  type MarketingPromotion,
  type MarketingPromotionCategory,
  type MarketingPromotionDestination,
} from "@/types/marketing";

const CATEGORY_LABELS: Record<MarketingPromotionCategory, string> = {
  general: "General",
  express: "Express",
  aereo: "Aéreo",
  maritimo: "Marítimo",
  miscelanea: "Miscelánea",
  energia: "Energía",
  recogidas: "Recogidas",
  tienda: "Tienda",
};

type PromotionForm = {
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  button_text: string;
  destination_type: MarketingPromotionDestination;
  destination_url: string;
  destination_message: string;
  category: MarketingPromotionCategory;
  starts_at: string;
  ends_at: string;
  sort_order: string;
  is_visible: boolean;
  is_featured: boolean;
  show_on_home: boolean;
};

const EMPTY_FORM: PromotionForm = {
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  button_text: "Solicitar información",
  destination_type: "whatsapp",
  destination_url: "",
  destination_message: "Hola, me interesa esta promoción.",
  category: "general",
  starts_at: "",
  ends_at: "",
  sort_order: "0",
  is_visible: true,
  is_featured: false,
  show_on_home: true,
};

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export default function MarketingPromotionsPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore]
  );

  const [promotions, setPromotions] = useState<MarketingPromotion[]>([]);
  const [form, setForm] = useState<PromotionForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadPromotions() {
    if (!activeStore?.id) {
      setPromotions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await getAdminPromotions(activeStore.id);
    setPromotions(data || []);
    setMessage(error?.message || null);
    setLoading(false);
  }

  useEffect(() => {
    if (!accessLoading && !storeLoading) void loadPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, storeLoading, activeStore?.id]);

  function resetForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sort_order: String(promotions.length + 1) });
  }

  function editPromotion(item: MarketingPromotion) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      subtitle: item.subtitle || "",
      description: item.description || "",
      image_url: item.image_url,
      button_text: item.button_text || "",
      destination_type: item.destination_type,
      destination_url: item.destination_url || "",
      destination_message: item.destination_message || "",
      category: item.category,
      starts_at: toLocalInput(item.starts_at),
      ends_at: toLocalInput(item.ends_at),
      sort_order: String(item.sort_order),
      is_visible: item.is_visible,
      is_featured: item.is_featured,
      show_on_home: item.show_on_home,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleImage(file?: File) {
    if (!file || !activeStore?.id) return;
    setUploading(true);
    setMessage(null);
    try {
      const imageUrl = await uploadPromotionImage(activeStore.id, file);
      setForm((current) => ({ ...current, image_url: imageUrl }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function savePromotion() {
    if (!activeStore?.id || !form.title.trim() || !form.image_url) {
      setMessage("Completa el título y selecciona una imagen.");
      return;
    }

    const resolvedDestination = buildPromotionDestination(
      form.destination_type,
      form.destination_url,
      form.destination_message
    );

    if (form.destination_type !== "none" && !resolvedDestination) {
      setMessage("Revisa el destino del botón. El número, correo o enlace no parece válido.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const input = {
      store_id: activeStore.id,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url,
      button_text: form.button_text.trim() || null,
      destination_type: form.destination_type,
      destination_url: form.destination_url.trim() || null,
      destination_message: form.destination_message.trim() || null,
      category: form.category,
      starts_at: toIso(form.starts_at),
      ends_at: toIso(form.ends_at),
      sort_order: Number(form.sort_order) || 0,
      is_visible: form.is_visible,
      is_featured: form.is_featured,
      show_on_home: form.show_on_home,
    };

    const result = editingId
      ? await updatePromotion(activeStore.id, editingId, input)
      : await createPromotion(input);

    if (result.error) {
      setMessage(result.error.message);
    } else {
      resetForm();
      await loadPromotions();
    }
    setSaving(false);
  }

  async function toggleVisibility(item: MarketingPromotion) {
    if (!activeStore?.id) return;
    await updatePromotion(activeStore.id, item.id, {
      is_visible: !item.is_visible,
    });
    await loadPromotions();
  }

  async function removePromotion(item: MarketingPromotion) {
    if (!activeStore?.id || !confirm(`¿Eliminar la promoción “${item.title}”?`)) return;
    await deletePromotion(activeStore.id, item.id);
    if (editingId === item.id) resetForm();
    await loadPromotions();
  }

  const destinationCopy = destinationFieldCopy(form.destination_type);
  const destinationPreview = buildPromotionDestination(
    form.destination_type,
    form.destination_url,
    form.destination_message
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Marketing Center · V16"
        title="Promociones"
        description="Crea promociones visuales por tienda, prográmalas y controla dónde aparecen."
        storeName={activeStore?.name}
        icon={Megaphone}
        breadcrumbs={[{ label: "Marketing" }, { label: "Promociones" }]}
      />

      {message && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {message}
        </div>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
              {editingId ? "Editar promoción" : "Nueva promoción"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {editingId ? "Actualiza el contenido" : "Publica una oferta"}
            </h2>
          </div>
          {editingId && (
            <button onClick={resetForm} className="rounded-2xl border px-4 py-2 text-sm font-black">
              Cancelar edición
            </button>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-black">Título *</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Servicio Aéreo" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black">Subtítulo</span>
              <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="Entrega de 7 a 15 días" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black">Categoría</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as MarketingPromotionCategory })} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                {MARKETING_PROMOTION_CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-black">Descripción corta</span>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black">Texto del botón</span>
              <input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black">Destino</span>
              <select
                value={form.destination_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    destination_type: e.target.value as MarketingPromotionDestination,
                  })
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="url">Página web</option>
                <option value="call">Llamar</option>
                <option value="email">Correo</option>
                <option value="none">Sin botón</option>
              </select>
            </label>

            {form.destination_type !== "none" && (
              <>
                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-black">
                    {destinationCopy.label}
                  </span>
                  <input
                    value={form.destination_url}
                    onChange={(e) =>
                      setForm({ ...form, destination_url: e.target.value })
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                    placeholder={destinationCopy.placeholder}
                    inputMode={destinationCopy.inputMode}
                  />
                  <span className="mt-1.5 block text-xs font-medium text-slate-500">
                    {destinationCopy.help}
                  </span>
                </label>

                {(form.destination_type === "whatsapp" ||
                  form.destination_type === "email") && (
                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-black">
                      Mensaje automático
                    </span>
                    <textarea
                      value={form.destination_message}
                      onChange={(e) =>
                        setForm({ ...form, destination_message: e.target.value })
                      }
                      className="min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3"
                      placeholder="Hola, me interesa esta promoción."
                    />
                  </label>
                )}

                {form.destination_url.trim() && (
                  <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                      Enlace generado
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-slate-700">
                      {destinationPreview || "Revisa el valor introducido"}
                    </p>
                  </div>
                )}
              </>
            )}
            <label><span className="mb-2 block text-sm font-black">Empieza</span><input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label><span className="mb-2 block text-sm font-black">Finaliza</span><input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
            <label><span className="mb-2 block text-sm font-black">Orden</span><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
          </div>

          <div>
            <span className="mb-2 block text-sm font-black">Imagen *</span>
            <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border-2 border-dashed border-slate-200 bg-slate-50 text-center">
              {form.image_url ? <img src={form.image_url} alt="Vista previa" className="h-full min-h-64 w-full object-cover" /> : <><ImagePlus size={38} className="text-blue-600"/><strong className="mt-3">{uploading ? "Optimizando y subiendo..." : "Seleccionar flyer"}</strong><span className="mt-1 text-xs text-slate-500">Se convierte automáticamente a WebP</span></>}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => void handleImage(e.target.files?.[0])} />
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {([
                ["is_visible", "Visible"],
                ["is_featured", "Destacada"],
                ["show_on_home", "Mostrar en Home"],
              ] as const).map(([field, label]) => <label key={field} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm font-black"><input type="checkbox" checked={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.checked })}/>{label}</label>)}
            </div>
            <button onClick={() => void savePromotion()} disabled={saving || uploading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-4 font-black text-white disabled:opacity-50">
              {editingId ? <Pencil size={18}/> : <Plus size={18}/>} {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear promoción"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Contenido creado</p><h2 className="text-2xl font-black">Promociones de la tienda</h2></div>
        {loading ? <p className="py-10 text-center font-bold text-slate-500">Cargando promociones...</p> : promotions.length === 0 ? <p className="rounded-2xl bg-slate-50 py-10 text-center font-bold text-slate-500">Todavía no hay promociones.</p> : <div className="grid gap-4 lg:grid-cols-2">
          {promotions.map((item) => <article key={item.id} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
            <div className="relative aspect-[16/8] bg-slate-100"><img src={item.image_url} alt={item.title} className="h-full w-full object-cover"/>{item.is_featured && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-black"><Star size={13} fill="currentColor"/>Destacada</span>}</div>
            <div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-blue-600">{CATEGORY_LABELS[item.category]}</p><h3 className="text-xl font-black">{item.title}</h3><p className="mt-1 text-sm text-slate-500">{item.subtitle || "Sin subtítulo"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${item.is_visible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.is_visible ? "Visible" : "Oculta"}</span></div>
              <div className="mt-4 flex gap-2"><button onClick={() => editPromotion(item)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-black"><Pencil size={16}/>Editar</button><button onClick={() => void toggleVisibility(item)} className="rounded-xl border px-3 py-2" aria-label="Cambiar visibilidad">{item.is_visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button><button onClick={() => void removePromotion(item)} className="rounded-xl border border-red-200 px-3 py-2 text-red-600" aria-label="Eliminar"><Trash2 size={17}/></button></div>
            </div>
          </article>)}
        </div>}
      </section>
    </div>
  );
}
