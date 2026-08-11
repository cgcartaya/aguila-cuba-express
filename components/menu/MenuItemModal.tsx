"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";

import type { MenuCartLine, MenuCartSelectedOption, MenuItem } from "@/lib/menu/types";

type Props = {
  item: MenuItem;
  accentColor: string;
  onClose: () => void;
  onAdd: (line: MenuCartLine) => void;
};

export default function MenuItemModal({ item, accentColor, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  // selections[groupId] = array of optionId
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const toggleOption = (groupId: string, optionId: string, maxSelections: number) => {
    setSelections((prev) => {
      const current = prev[groupId] || [];
      const isSelected = current.includes(optionId);

      if (isSelected) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }

      if (maxSelections === 1) {
        return { ...prev, [groupId]: [optionId] };
      }

      if (current.length >= maxSelections) {
        return prev; // ya llegó al máximo permitido
      }

      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  const missingRequired = useMemo(() => {
    return item.menu_item_option_groups.some(
      (group) => group.is_required && (selections[group.id] || []).length === 0
    );
  }, [item.menu_item_option_groups, selections]);

  const unitPrice = useMemo(() => {
    let total = item.price;
    for (const group of item.menu_item_option_groups) {
      for (const optionId of selections[group.id] || []) {
        const option = group.menu_item_options.find((o) => o.id === optionId);
        if (option) total += option.price_delta;
      }
    }
    return total;
  }, [item, selections]);

  const handleAdd = () => {
    if (missingRequired) return;

    const selectedOptions: MenuCartSelectedOption[] = [];
    for (const group of item.menu_item_option_groups) {
      for (const optionId of selections[group.id] || []) {
        const option = group.menu_item_options.find((o) => o.id === optionId);
        if (option) {
          selectedOptions.push({
            group_id: group.id,
            group_name: group.name,
            option_id: option.id,
            option_label: option.label,
            price_delta: option.price_delta,
          });
        }
      }
    }

    onAdd({
      lineId: crypto.randomUUID(),
      menu_item_id: item.id,
      name: item.name,
      unit_base_price: item.price,
      quantity,
      selected_options: selectedOptions,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl">
        <div className="sticky top-0 flex items-start justify-between border-b border-slate-100 bg-white p-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">{item.name}</h2>
            {item.description && (
              <p className="mt-1 text-sm font-semibold text-slate-500">{item.description}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {item.menu_item_option_groups.map((group) => (
            <div key={group.id}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800">{group.name}</h3>
                {group.is_required && (
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                    Obligatorio
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {group.menu_item_options.map((option) => {
                  const checked = (selections[group.id] || []).includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(group.id, option.id, group.max_selections)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        checked
                          ? "border-transparent text-white"
                          : "border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                      style={checked ? { backgroundColor: accentColor } : undefined}
                    >
                      <span>{option.label}</span>
                      {option.price_delta > 0 && <span>+${option.price_delta.toFixed(2)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <label className="mb-1.5 block text-sm font-black text-slate-800">
              Alguna nota especial (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-100 bg-white p-5">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 px-3 py-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="text-slate-500"
            >
              <Minus size={16} />
            </button>
            <span className="w-4 text-center text-sm font-black">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="text-slate-500"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={missingRequired}
            className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white shadow-sm transition disabled:opacity-40"
            style={{ backgroundColor: accentColor }}
          >
            Agregar · ${(unitPrice * quantity).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
