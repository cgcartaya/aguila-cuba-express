"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Ban,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";

import type {
  MenuCartLine,
  MenuCartSelectedOption,
  MenuItem,
} from "@/lib/menu/types";

type Props = {
  item: MenuItem;
  accentColor: string;
  onClose: () => void;
  onAdd: (line: MenuCartLine) => void;
  initialLine?: MenuCartLine | null;
};

export default function MenuItemModal({
  item,
  accentColor,
  onClose,
  onAdd,
  initialLine = null,
}: Props) {
  const [quantity, setQuantity] = useState(initialLine?.quantity || 1);
  const [notes, setNotes] = useState(initialLine?.notes || "");
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!initialLine) {
      setSelections({});
      return;
    }

    const next: Record<string, string[]> = {};
    for (const option of initialLine.selected_options) {
      if (!next[option.group_id]) next[option.group_id] = [];
      next[option.group_id].push(option.option_id);
    }
    setSelections(next);
    setQuantity(initialLine.quantity);
    setNotes(initialLine.notes || "");
  }, [initialLine, item.id]);

  const availableGroups = useMemo(
    () =>
      item.menu_item_option_groups.map((group) => ({
        ...group,
        menu_item_options: group.menu_item_options,
      })),
    [item.menu_item_option_groups]
  );

  const missingRequired = useMemo(
    () =>
      availableGroups.filter((group) => {
        if (!group.is_required) return false;
        const selected = selections[group.id] || [];
        return selected.length === 0;
      }),
    [availableGroups, selections]
  );

  const toggleOption = (
    groupId: string,
    optionId: string,
    maxSelections: number,
    available: boolean
  ) => {
    if (!available) return;

    setSelections((prev) => {
      const current = prev[groupId] || [];

      if (current.includes(optionId)) {
        return {
          ...prev,
          [groupId]: current.filter((id) => id !== optionId),
        };
      }

      if (maxSelections === 1) {
        return { ...prev, [groupId]: [optionId] };
      }

      if (current.length >= maxSelections) return prev;

      return {
        ...prev,
        [groupId]: [...current, optionId],
      };
    });
  };

  const unitPrice = useMemo(() => {
    let total = item.price;

    for (const group of availableGroups) {
      for (const optionId of selections[group.id] || []) {
        const option = group.menu_item_options.find(
          (candidate) => candidate.id === optionId
        );
        if (option && option.is_available !== false) {
          total += Number(option.price_delta) || 0;
        }
      }
    }

    return total;
  }, [item.price, availableGroups, selections]);

  const handleAdd = () => {
    if (missingRequired.length) {
      document
        .getElementById(`modifier-${missingRequired[0].id}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      return;
    }

    const selectedOptions: MenuCartSelectedOption[] = [];

    for (const group of availableGroups) {
      for (const optionId of selections[group.id] || []) {
        const option = group.menu_item_options.find(
          (candidate) => candidate.id === optionId
        );

        if (!option || option.is_available === false) continue;

        selectedOptions.push({
          group_id: group.id,
          group_name: group.name,
          option_id: option.id,
          option_label: option.label,
          price_delta: option.price_delta,
        });
      }
    }

    onAdd({
      lineId: initialLine?.lineId || crypto.randomUUID(),
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[30px] bg-[#FFFDF8] shadow-2xl sm:rounded-[30px]">
        <div className="relative shrink-0">
          {item.image_url ? (
            <div className="relative h-48 w-full sm:h-56">
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                sizes="576px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
            </div>
          ) : (
            <div className="h-20 bg-[#1B1410]" />
          )}

          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white"
          >
            <X size={18} />
          </button>

          <div
            className={
              item.image_url
                ? "absolute bottom-0 left-0 right-0 p-5 text-white"
                : "p-5"
            }
          >
            {item.is_featured && (
              <span
                className="mb-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase text-[#1B1410]"
                style={{ backgroundColor: accentColor }}
              >
                <Sparkles size={10} /> Recomendado
              </span>
            )}

            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">{item.name}</h2>
                {initialLine && (
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide opacity-80">
                    Editando tu selección
                  </p>
                )}
              </div>
              <strong className="text-lg">
                ${item.price.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {item.description && (
            <div className="border-b border-black/[0.07] px-5 py-4">
              <p className="text-sm font-medium leading-6 text-black/55">
                {item.description}
              </p>
            </div>
          )}

          <div className="space-y-5 p-5">
            {availableGroups.map((group) => {
              const selected = selections[group.id] || [];
              const missing =
                group.is_required && selected.length === 0;
              const availableCount = group.menu_item_options.filter(
                (option) => option.is_available !== false
              ).length;

              return (
                <section
                  key={group.id}
                  id={`modifier-${group.id}`}
                  className={`rounded-2xl border p-4 ${
                    missing
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-black/[0.07] bg-white"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-[#1B1410]">
                        {group.name}
                      </h3>
                      <p className="mt-1 text-[10px] font-bold text-black/40">
                        {group.is_required
                          ? "Obligatorio"
                          : "Opcional"}{" "}
                        ·{" "}
                        {group.max_selections === 1
                          ? "Elige 1"
                          : `Hasta ${group.max_selections}`}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                        group.is_required
                          ? "bg-[#1B1410] text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {group.is_required ? "Requerido" : "Opcional"}
                    </span>
                  </div>

                  {group.is_required && availableCount === 0 && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">
                      <Ban size={13} />
                      Este grupo no tiene opciones disponibles.
                    </div>
                  )}

                  <div className="space-y-2">
                    {group.menu_item_options.map((option) => {
                      const available =
                        option.is_available !== false;
                      const checked =
                        available &&
                        selected.includes(option.id);

                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={!available}
                          onClick={() =>
                            toggleOption(
                              group.id,
                              option.id,
                              Math.max(1, group.max_selections),
                              available
                            )
                          }
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                            available
                              ? "border-black/[0.08]"
                              : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-55"
                          }`}
                          style={
                            checked
                              ? {
                                  backgroundColor: `${accentColor}22`,
                                  borderColor: accentColor,
                                }
                              : undefined
                          }
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                              group.max_selections === 1
                                ? "rounded-full"
                                : "rounded-md"
                            }`}
                            style={
                              checked
                                ? {
                                    backgroundColor: accentColor,
                                    borderColor: accentColor,
                                  }
                                : {
                                    borderColor:
                                      "rgba(27,20,16,.2)",
                                  }
                            }
                          >
                            {checked && (
                              <Check size={12} strokeWidth={3} />
                            )}
                          </span>

                          <span
                            className={`min-w-0 flex-1 text-sm font-bold ${
                              available
                                ? "text-[#1B1410]"
                                : "text-slate-400 line-through"
                            }`}
                          >
                            {option.label}
                          </span>

                          {!available ? (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-[9px] font-black uppercase text-red-600">
                              Agotada
                            </span>
                          ) : (
                            <span className="shrink-0 text-xs font-black text-black/50">
                              {option.price_delta > 0
                                ? `+$${option.price_delta.toFixed(2)}`
                                : option.price_delta < 0
                                ? `−$${Math.abs(
                                    option.price_delta
                                  ).toFixed(2)}`
                                : "Incluido"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <section className="rounded-2xl border border-black/[0.07] bg-white p-4">
              <h3 className="text-sm font-black text-[#1B1410]">
                Instrucciones para cocina
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Ej: salsa aparte, sin mucha sal..."
                className="mt-3 w-full resize-none rounded-xl border border-black/10 bg-[#FFFCF6] p-3 text-sm font-semibold outline-none"
              />
            </section>
          </div>
        </div>

        <div className="shrink-0 border-t border-black/[0.08] bg-[#FFFDF8] p-4">
          {missingRequired.length > 0 && (
            <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-700">
              Completa las opciones obligatorias antes de continuar.
            </p>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-black/10 bg-white p-1">
              <button
                onClick={() =>
                  setQuantity((quantity) =>
                    Math.max(1, quantity - 1)
                  )
                }
                className="flex h-8 w-8 items-center justify-center"
              >
                <Minus size={15} />
              </button>
              <span className="w-7 text-center text-sm font-black">
                {quantity}
              </span>
              <button
                onClick={() =>
                  setQuantity((quantity) => quantity + 1)
                }
                className="flex h-8 w-8 items-center justify-center"
              >
                <Plus size={15} />
              </button>
            </div>

            <button
              onClick={handleAdd}
              className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-black"
              style={{
                backgroundColor: accentColor,
                color: "#1B1410",
              }}
            >
              <ShoppingBag size={16} />
              {initialLine ? "Guardar cambios" : "Agregar"} · $
              {(unitPrice * quantity).toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
