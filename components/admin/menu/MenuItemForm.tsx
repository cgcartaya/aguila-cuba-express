"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Bike, Box, Eye, Info, Languages, Loader2, Save, ShoppingBag, Sparkles, UtensilsCrossed } from "lucide-react";

import MenuItemImageUploader from "./MenuItemImageUploader";
import ModifierTemplatePicker from "./ModifierTemplatePicker";
import OptionGroupsEditor from "./OptionGroupsEditor";
import { saveMenuItem } from "@/lib/services/menu";
import type { MenuItemFormData } from "@/lib/menu/types";

type Category = { id: string; name: string };
type Props = { storeId: string; categories: Category[]; initialData: MenuItemFormData };
type ToggleRowProps = {
  checked: boolean;
  description: string;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onChange: (checked: boolean) => void;
};

function ToggleRow({ checked, description, disabled, icon, label, onChange }: ToggleRowProps) {
  return (
    <label className={`flex items-center gap-3 px-4 py-3 transition sm:px-5 ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:bg-slate-50/80"}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">{icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-extrabold text-slate-900">{label}</strong>
        <span className="mt-0.5 block text-xs font-medium leading-4 text-slate-500">{description}</span>
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-100 peer-disabled:bg-slate-200 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}

export default function MenuItemForm({ storeId, categories, initialData }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState<MenuItemFormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(initialData.id);
  const hasChanges = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialData), [formData, initialData]);
  const cancel = () => router.push("/admin/menu");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return setError("El nombre es obligatorio.");
    if (!formData.category_id) return setError("Elige una categoría.");
    setSaving(true);
    setError(null);
    const { error: saveError } = await saveMenuItem(storeId, formData);
    setSaving(false);
    if (saveError) {
      setError("No se pudo guardar el platillo.");
      console.error(saveError);
      return;
    }
    router.push("/admin/menu");
  };

  const saveButton = (compact = false) => (
    <button type="submit" disabled={saving || (isEditing && !hasChanges)} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#061b3a] font-black text-white shadow-sm transition hover:bg-[#0b2b58] disabled:cursor-not-allowed disabled:opacity-50 ${compact ? "px-4 py-2.5 text-xs sm:px-5 sm:text-sm" : "px-5 py-3 text-sm"}`}>
      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
      {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear platillo"}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-7xl space-y-4 pb-24 sm:space-y-5 lg:pb-28">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-500">
            <Link href="/admin/menu" className="text-blue-600 hover:text-blue-700">Menú</Link><span>/</span><span>{isEditing ? "Editar platillo" : "Nuevo platillo"}</span>
          </nav>
          <h1 className="text-2xl font-black tracking-tight text-[#061b3a] sm:text-3xl">{isEditing ? "Editar platillo" : "Nuevo platillo"}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{isEditing ? "Actualiza la información y configuración de este platillo." : "Agrega la información y configuración del nuevo platillo."}</p>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <button type="button" onClick={cancel} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50">Cancelar</button>
          {saveButton()}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-base font-black text-slate-900">Foto del platillo</h2>
          <MenuItemImageUploader formData={formData} setFormData={setFormData} />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-black text-slate-900">Información general</h2>
          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-slate-600">Nombre</label>
            <input value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ej: Bistec de Res" className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-slate-600">Categoría</label>
              <select value={formData.category_id} onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50">
                <option value="">Elige una categoría...</option>
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-slate-600">Precio</label>
              <input type="number" min={0} step="0.01" value={formData.price} onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) || 0 }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between gap-3"><label className="text-xs font-extrabold text-slate-600">Descripción</label><span className="text-[11px] font-bold text-slate-400">{formData.description.length} / 500</span></div>
            <textarea value={formData.description} maxLength={500} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={3} className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
          </div>
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="flex items-center gap-2 text-sm font-black text-blue-950"><Languages size={17} /> Contenido en inglés</h3><p className="mt-1 text-xs font-semibold text-blue-700/70">Completa estos campos para mostrarlos cuando el cliente seleccione EN.</p></div>
            </div>
            <div className="mt-4 grid gap-4">
              <div><label className="mb-1.5 block text-xs font-extrabold text-blue-900">Nombre en inglés</label><input value={formData.name_en} onChange={(e) => setFormData((prev) => ({ ...prev, name_en: e.target.value }))} placeholder="English dish name" className="w-full rounded-xl border border-blue-100 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500" /></div>
              <div><div className="mb-1.5 flex items-center justify-between"><label className="text-xs font-extrabold text-blue-900">Descripción en inglés</label><span className="text-[11px] font-bold text-blue-500/70">{formData.description_en.length} / 1000</span></div><textarea value={formData.description_en} maxLength={1000} onChange={(e) => setFormData((prev) => ({ ...prev, description_en: e.target.value }))} rows={3} placeholder="English description" className="w-full resize-y rounded-xl border border-blue-100 bg-white px-3.5 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none focus:border-blue-500" /></div>
            </div>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="text-base font-black text-slate-900">Disponibilidad y venta</h2><p className="mt-1 text-xs font-medium text-slate-500">Controla dónde se muestra el platillo y cómo se administra su inventario.</p></div>
        <div className="divide-y divide-slate-100">
          <ToggleRow checked={formData.is_active} description="El platillo estará disponible para los clientes en el menú público." icon={<Eye size={18} />} label="Visible en el menú público" onChange={(is_active) => setFormData((prev) => ({ ...prev, is_active }))} />
          <ToggleRow checked={formData.is_featured} description="Resalta este platillo en la página principal del restaurante." icon={<Sparkles size={18} />} label="Destacar en la landing" onChange={(is_featured) => setFormData((prev) => ({ ...prev, is_featured }))} />
          <ToggleRow checked={formData.available_dine_in} description="Permite servir este platillo en las mesas del restaurante." icon={<UtensilsCrossed size={18} />} label="Disponible en el restaurante" onChange={(available_dine_in) => setFormData((prev) => ({ ...prev, available_dine_in }))} />
          <ToggleRow checked={formData.available_takeaway} description="El cliente puede pedirlo y pasar a recogerlo." icon={<ShoppingBag size={18} />} label="Disponible para recoger" onChange={(available_takeaway) => setFormData((prev) => ({ ...prev, available_takeaway }))} />
          <ToggleRow checked={formData.available_delivery} description="Permite incluir este platillo en pedidos con entrega a domicilio." icon={<Bike size={18} />} label="Disponible para delivery" onChange={(available_delivery) => setFormData((prev) => ({ ...prev, available_delivery }))} />
          <ToggleRow checked={formData.track_stock} description="Descuenta cada venta del inventario disponible del platillo." icon={<Box size={18} />} label="Inventario permanente" onChange={(track_stock) => setFormData((prev) => ({ ...prev, track_stock }))} />
        </div>
        {formData.track_stock && (
          <div className="border-t border-slate-100 bg-blue-50/60 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-start gap-2 text-xs font-semibold text-blue-700"><Info size={15} className="mt-0.5 shrink-0" /><span>Indica cuántas unidades hay disponibles en el inventario permanente.</span></div>
            <label className="mt-3 flex items-center gap-2 text-xs font-extrabold text-slate-600 sm:mt-0">Existencias<input type="number" min={0} value={formData.stock} onChange={(e) => setFormData((prev) => ({ ...prev, stock: Math.max(0, Number(e.target.value) || 0) }))} className="w-28 rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-400" /></label>
          </div>
        )}
        <div className="border-t border-slate-100">
          <ToggleRow checked={formData.daily_stock_enabled} description="Permite asignar una cantidad diferente disponible para cada día." icon={<AlertCircle size={18} />} label="Cupo diario" onChange={(daily_stock_enabled) => setFormData((prev) => ({ ...prev, daily_stock_enabled }))} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <OptionGroupsEditor groups={formData.option_groups} onChange={(option_groups) => setFormData((prev) => ({ ...prev, option_groups }))} />
        <div className="mt-5 border-t border-slate-100 pt-5"><ModifierTemplatePicker storeId={storeId} groups={formData.option_groups} onChange={(option_groups) => setFormData((prev) => ({ ...prev, option_groups }))} /></div>
      </section>

      {error && <p className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"><AlertCircle size={17} /> {error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-600"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${hasChanges ? "bg-amber-400" : "bg-emerald-500"}`} /><span className="truncate">{hasChanges ? "Cambios sin guardar" : "Todos los cambios están guardados"}</span></span>
          <div className="flex items-center gap-2 sm:gap-3"><button type="button" onClick={cancel} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 sm:px-5 sm:text-sm">Cancelar</button>{saveButton(true)}</div>
        </div>
      </div>
    </form>
  );
}
