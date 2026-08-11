"use client";

import { Plus, Trash2 } from "lucide-react";

import type { MenuOptionGroupFormData } from "@/lib/menu/types";

type Props = {
  groups: MenuOptionGroupFormData[];
  onChange: (groups: MenuOptionGroupFormData[]) => void;
};

/**
 * Editor de grupos de opciones tipo TropiWing ("Sauce 1", "Sauce 2
 * (optional)", "Heat: Regular"): cada grupo tiene un nombre, si es
 * obligatorio elegir una opción, cuántas se pueden elegir, y su
 * lista de opciones (cada una puede sumar precio, ej. "Extra queso +$1").
 */
export default function OptionGroupsEditor({ groups, onChange }: Props) {
  const updateGroup = (index: number, patch: Partial<MenuOptionGroupFormData>) => {
    const next = [...groups];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addGroup = () => {
    onChange([
      ...groups,
      {
        name: "",
        is_required: false,
        max_selections: 1,
        sort_order: groups.length,
        options: [{ label: "", price_delta: 0, sort_order: 0 }],
      },
    ]);
  };

  const removeGroup = (index: number) => {
    onChange(groups.filter((_, i) => i !== index));
  };

  const addOption = (groupIndex: number) => {
    const group = groups[groupIndex];
    updateGroup(groupIndex, {
      options: [
        ...group.options,
        { label: "", price_delta: 0, sort_order: group.options.length },
      ],
    });
  };

  const updateOption = (
    groupIndex: number,
    optionIndex: number,
    patch: Partial<MenuOptionGroupFormData["options"][number]>
  ) => {
    const group = groups[groupIndex];
    const options = [...group.options];
    options[optionIndex] = { ...options[optionIndex], ...patch };
    updateGroup(groupIndex, { options });
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const group = groups[groupIndex];
    updateGroup(groupIndex, {
      options: group.options.filter((_, i) => i !== optionIndex),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
          Opciones / modificadores
        </h3>
        <button
          type="button"
          onClick={addGroup}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
        >
          <Plus size={14} />
          Grupo de opciones
        </button>
      </div>

      {groups.length === 0 && (
        <p className="text-xs font-semibold text-slate-400">
          Sin opciones. Úsalo para cosas como salsa, término/picor, o extras.
        </p>
      )}

      {groups.map((group, gi) => (
        <div key={gi} className="rounded-2xl border border-slate-200 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input
              value={group.name}
              onChange={(e) => updateGroup(gi, { name: e.target.value })}
              placeholder="Nombre del grupo, ej: Salsa 1"
              className="min-w-[10rem] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold outline-none focus:border-slate-400"
            />

            <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <input
                type="checkbox"
                checked={group.is_required}
                onChange={(e) => updateGroup(gi, { is_required: e.target.checked })}
              />
              Obligatorio
            </label>

            <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
              Máx.
              <input
                type="number"
                min={1}
                value={group.max_selections}
                onChange={(e) =>
                  updateGroup(gi, { max_selections: Number(e.target.value) || 1 })
                }
                className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold outline-none focus:border-slate-400"
              />
            </label>

            <button
              type="button"
              onClick={() => removeGroup(gi)}
              className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="space-y-1.5">
            {group.options.map((option, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  value={option.label}
                  onChange={(e) => updateOption(gi, oi, { label: e.target.value })}
                  placeholder="Ej: BBQ, Picante..."
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold outline-none focus:border-slate-400"
                />
                <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                  <span>+$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={option.price_delta}
                    onChange={(e) =>
                      updateOption(gi, oi, { price_delta: Number(e.target.value) || 0 })
                    }
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1 outline-none focus:border-slate-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeOption(gi, oi)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addOption(gi)}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              <Plus size={13} />
              Opción
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
