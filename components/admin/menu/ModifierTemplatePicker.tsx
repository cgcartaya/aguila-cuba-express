"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Layers3, Loader2, Plus, Search } from "lucide-react";

import { getModifierTemplates, type ModifierTemplate } from "@/lib/services/menu-modifier-templates";
import type { MenuOptionGroupFormData } from "@/lib/menu/types";

type Props = {
  storeId: string;
  groups: MenuOptionGroupFormData[];
  onChange: (groups: MenuOptionGroupFormData[]) => void;
};

export default function ModifierTemplatePicker({ storeId, groups, onChange }: Props) {
  const [templates, setTemplates] = useState<ModifierTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [lastApplied, setLastApplied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    getModifierTemplates(storeId).then(({ data }) => {
      if (!cancelled) {
        setTemplates(data.filter((template) => template.is_active));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) =>
      `${template.name} ${template.description || ""}`.toLowerCase().includes(q)
    );
  }, [templates, query]);

  const applyTemplate = (template: ModifierTemplate) => {
    const nextGroup: MenuOptionGroupFormData = {
      name: template.name,
      is_required: template.is_required,
      max_selections: template.max_selections,
      sort_order: groups.length,
      options: template.menu_modifier_template_options
        .filter((option) => option.is_active)
        .map((option, index) => ({
          label: option.label,
          price_delta: Number(option.price_delta) || 0,
          sort_order: index,
        })),
    };

    onChange([...groups, nextGroup]);
    setLastApplied(template.id);
    window.setTimeout(() => setLastApplied(null), 1500);
  };

  return (
    <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers3 size={16} className="text-violet-600" />
            <h3 className="text-sm font-black text-slate-900">Plantillas de modificadores</h3>
          </div>
          <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
            Agrega grupos ya preparados como Acompañamientos, Salsas, Término de cocción
            o Extras. Después puedes personalizarlos solo para este plato.
          </p>
        </div>

        <a
          href="/admin/menu/modificadores"
          className="rounded-xl bg-white px-3 py-2 text-xs font-black text-violet-700 shadow-sm ring-1 ring-violet-200 transition hover:bg-violet-50"
        >
          Administrar plantillas
        </a>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400">
          <Loader2 size={14} className="animate-spin" /> Cargando plantillas...
        </div>
      ) : templates.length === 0 ? (
        <div className="mt-4 rounded-xl bg-white p-4 text-xs font-semibold text-slate-500">
          Todavía no has creado plantillas. Puedes seguir creando opciones manualmente o
          crear la primera desde “Administrar plantillas”.
        </div>
      ) : (
        <>
          <div className="relative mt-4">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar plantilla..."
              className="w-full rounded-xl border border-violet-100 bg-white py-2 pl-9 pr-3 text-xs font-semibold outline-none focus:border-violet-300"
            />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {filtered.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  {lastApplied === template.id ? <Check size={15} /> : <Plus size={15} />}
                </span>

                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs text-slate-900">{template.name}</strong>
                  <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">
                    {template.menu_modifier_template_options.filter((o) => o.is_active).length} opciones
                    {" · "}
                    {template.is_required ? "Obligatorio" : "Opcional"}
                    {" · "}
                    {template.max_selections === 1
                      ? "Elige 1"
                      : `Hasta ${template.max_selections}`}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
