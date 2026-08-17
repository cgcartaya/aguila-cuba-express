"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  Layers3,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteModifierTemplate,
  getModifierTemplates,
  saveModifierTemplate,
  type ModifierTemplate,
  type ModifierTemplateInput,
} from "@/lib/services/menu-modifier-templates";

type Props = {
  storeId: string;
};

const EMPTY_TEMPLATE: ModifierTemplateInput = {
  name: "",
  description: "",
  is_required: false,
  max_selections: 1,
  sort_order: 0,
  is_active: true,
  options: [{ label: "", price_delta: 0, sort_order: 0, is_active: true }],
};

export default function ModifierTemplatesManager({ storeId }: Props) {
  const [templates, setTemplates] = useState<ModifierTemplate[]>([]);
  const [editing, setEditing] = useState<ModifierTemplateInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await getModifierTemplates(storeId);
    setTemplates(data);
    setError(error ? "No se pudieron cargar las plantillas." : null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const editTemplate = (template: ModifierTemplate) => {
    setEditing({
      id: template.id,
      name: template.name,
      description: template.description || "",
      is_required: template.is_required,
      max_selections: template.max_selections,
      sort_order: template.sort_order,
      is_active: template.is_active,
      options: template.menu_modifier_template_options.map((option) => ({
        id: option.id,
        label: option.label,
        price_delta: Number(option.price_delta) || 0,
        sort_order: option.sort_order,
        is_active: option.is_active,
      })),
    });
  };

  const duplicate = (template: ModifierTemplate) => {
    setEditing({
      ...EMPTY_TEMPLATE,
      name: `${template.name} copia`,
      description: template.description || "",
      is_required: template.is_required,
      max_selections: template.max_selections,
      sort_order: templates.length,
      options: template.menu_modifier_template_options.map((option, index) => ({
        label: option.label,
        price_delta: Number(option.price_delta) || 0,
        sort_order: index,
        is_active: option.is_active,
      })),
    });
  };

  const save = async () => {
    if (!editing?.name.trim()) {
      setError("Escribe un nombre para la plantilla.");
      return;
    }

    const cleanOptions = editing.options.filter((option) => option.label.trim());
    if (!cleanOptions.length) {
      setError("Agrega al menos una opción.");
      return;
    }

    if (editing.max_selections > cleanOptions.length) {
      setError("El máximo de selecciones no puede ser mayor que la cantidad de opciones.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error } = await saveModifierTemplate(storeId, {
      ...editing,
      options: cleanOptions,
    });

    setSaving(false);

    if (error) {
      setError("No se pudo guardar la plantilla.");
      return;
    }

    setEditing(null);
    await load();
  };

  const remove = async (template: ModifierTemplate) => {
    if (!confirm(`¿Eliminar la plantilla "${template.name}"? Los platos que ya la copiaron no se modifican.`)) {
      return;
    }

    const { error } = await deleteModifierTemplate(template.id);
    if (error) return setError("No se pudo eliminar.");
    await load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900">Biblioteca de plantillas</h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Crea una vez y reutiliza en cualquier plato.
            </p>
          </div>

          <button
            onClick={() =>
              setEditing({
                ...EMPTY_TEMPLATE,
                sort_order: templates.length,
                options: [{ label: "", price_delta: 0, sort_order: 0, is_active: true }],
              })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white"
          >
            <Plus size={14} /> Nueva plantilla
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {templates.map((template) => (
            <article key={template.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <Layers3 size={17} />
                </span>

                <button onClick={() => editTemplate(template)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900">{template.name}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                        template.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {template.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </div>

                  {template.description && (
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {template.description}
                    </p>
                  )}

                  <p className="mt-2 text-[10px] font-black uppercase text-slate-400">
                    {template.menu_modifier_template_options.filter((o) => o.is_active).length} opciones
                    {" · "}
                    {template.is_required ? "Obligatorio" : "Opcional"}
                    {" · "}
                    {template.max_selections === 1
                      ? "Elige 1"
                      : `Hasta ${template.max_selections}`}
                  </p>
                </button>

                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => duplicate(template)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                    title="Duplicar"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => remove(template)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}

          {templates.length === 0 && (
            <div className="rounded-2xl bg-slate-50 p-8 text-center">
              <Layers3 className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-500">
                Todavía no tienes plantillas.
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Empieza por Acompañamientos, Salsas o Término de cocción.
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {!editing ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            <Layers3 size={28} className="text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-600">
              Selecciona una plantilla
            </p>
            <p className="mt-1 max-w-xs text-xs font-semibold leading-5 text-slate-400">
              O crea una nueva. Aquí definirás las opciones y cuánto añade cada una al precio.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">
                {editing.id ? "Editar plantilla" : "Nueva plantilla"}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-500"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-[10px] font-black uppercase text-slate-400">
                Nombre
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Ej: Acompañamientos"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 outline-none"
                />
              </label>

              <label className="block text-[10px] font-black uppercase text-slate-400">
                Descripción interna
                <input
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Ej: Arroz, papas y vegetales"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={editing.is_required}
                    onChange={(e) =>
                      setEditing({ ...editing, is_required: e.target.checked })
                    }
                  />
                  Obligatorio
                </label>

                <label className="text-xs font-bold text-slate-600">
                  Máximo
                  <input
                    type="number"
                    min={1}
                    value={editing.max_selections}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        max_selections: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="ml-2 w-14 rounded-lg border border-slate-200 px-2 py-1"
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-500">Opciones</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        options: [
                          ...editing.options,
                          {
                            label: "",
                            price_delta: 0,
                            sort_order: editing.options.length,
                            is_active: true,
                          },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs font-black text-violet-600"
                  >
                    <Plus size={12} /> Opción
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {editing.options.map((option, index) => (
                    <div key={index} className="grid grid-cols-[1fr_90px_auto] gap-2">
                      <input
                        value={option.label}
                        onChange={(e) => {
                          const options = [...editing.options];
                          options[index] = { ...option, label: e.target.value };
                          setEditing({ ...editing, options });
                        }}
                        placeholder="Ej: Papas fritas"
                        className="min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                      />
                      <div className="flex items-center rounded-xl border border-slate-200 px-2">
                        <span className="text-xs font-black text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={option.price_delta}
                          onChange={(e) => {
                            const options = [...editing.options];
                            options[index] = {
                              ...option,
                              price_delta: Number(e.target.value) || 0,
                            };
                            setEditing({ ...editing, options });
                          }}
                          className="w-full bg-transparent px-1 text-xs font-bold outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            options: editing.options.filter((_, i) => i !== index),
                          })
                        }
                        className="rounded-xl p-2 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
                Plantilla activa
              </label>

              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">
                  {error}
                </p>
              )}

              <button
                onClick={save}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Guardar plantilla
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
