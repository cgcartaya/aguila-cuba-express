"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Loader2,
  Plus,
  Save,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import {
  deleteMenuUpsellRule,
  getMenuUpsellAdminData,
  saveMenuUpsellRule,
  type MenuUpsellAdminItem,
  type MenuUpsellRule,
} from "@/lib/services/menu-upsells-admin";

type Props = {
  storeId: string;
};

type Draft = {
  id?: string;
  source_item_id: string;
  recommended_item_id: string;
  headline: string;
  is_active: boolean;
};

const EMPTY: Draft = {
  source_item_id: "",
  recommended_item_id: "",
  headline: "",
  is_active: true,
};

export default function MenuUpsellManager({ storeId }: Props) {
  const [rules, setRules] = useState<MenuUpsellRule[]>([]);
  const [items, setItems] = useState<MenuUpsellAdminItem[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  );

  const load = async () => {
    setLoading(true);
    const data = await getMenuUpsellAdminData(storeId);
    setRules(data.rules);
    setItems(data.items);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const save = async () => {
    if (!draft.recommended_item_id) {
      alert("Selecciona qué producto quieres recomendar.");
      return;
    }

    if (
      draft.source_item_id &&
      draft.source_item_id === draft.recommended_item_id
    ) {
      alert("No puedes recomendar el mismo producto que dispara la sugerencia.");
      return;
    }

    setSaving(true);
    const { error } = await saveMenuUpsellRule(storeId, {
      id: draft.id,
      source_item_id: draft.source_item_id || null,
      recommended_item_id: draft.recommended_item_id,
      headline: draft.headline,
      sort_order: draft.id
        ? rules.find((rule) => rule.id === draft.id)?.sort_order || 0
        : rules.length,
      is_active: draft.is_active,
    });
    setSaving(false);

    if (error) {
      alert("No se pudo guardar la sugerencia.");
      return;
    }

    setDraft(EMPTY);
    await load();
  };

  const edit = (rule: MenuUpsellRule) => {
    setDraft({
      id: rule.id,
      source_item_id: rule.source_item_id || "",
      recommended_item_id: rule.recommended_item_id,
      headline: rule.headline || "",
      is_active: rule.is_active,
    });
  };

  const remove = async (rule: MenuUpsellRule) => {
    if (!confirm("¿Eliminar esta recomendación?")) return;
    const { error } = await deleteMenuUpsellRule(rule.id);
    if (error) return alert("No se pudo eliminar.");
    if (draft.id === rule.id) setDraft(EMPTY);
    await load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-base font-black text-slate-900">
            Recomendaciones activas
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Aparecen dentro del carrito antes de continuar al pago/pedido.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {rules.map((rule) => {
            const source = rule.source_item_id
              ? itemMap.get(rule.source_item_id)
              : null;
            const recommended = itemMap.get(rule.recommended_item_id);

            return (
              <article
                key={rule.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                    <ShoppingBag size={16} />
                  </span>

                  <button
                    onClick={() => edit(rule)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-slate-900">
                        {source ? source.name : "Cualquier pedido"}
                      </strong>
                      <ArrowRight size={13} className="text-slate-300" />
                      <strong className="text-sm text-orange-700">
                        {recommended?.name || "Producto"}
                      </strong>
                    </div>

                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {rule.headline || "¿Quieres agregar algo más?"}
                    </p>

                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                        rule.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {rule.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </button>

                  <button
                    onClick={() => remove(rule)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}

          {rules.length === 0 && (
            <div className="rounded-2xl bg-slate-50 p-8 text-center">
              <ShoppingBag className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-500">
                No hay recomendaciones configuradas.
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Empieza con una bebida o postre recomendado.
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">
              {draft.id ? "Editar sugerencia" : "Nueva sugerencia"}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Puedes hacerla general o dispararla por un producto específico.
            </p>
          </div>

          {!draft.id && (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-700">
              <Plus size={15} />
            </span>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-[10px] font-black uppercase text-slate-400">
            Cuando el carrito tenga
            <select
              value={draft.source_item_id}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  source_item_id: e.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case outline-none"
            >
              <option value="">Cualquier pedido</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[10px] font-black uppercase text-slate-400">
            Recomendar
            <select
              value={draft.recommended_item_id}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  recommended_item_id: e.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case outline-none"
            >
              <option value="">Selecciona...</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · ${item.price.toFixed(2)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[10px] font-black uppercase text-slate-400">
            Mensaje
            <input
              value={draft.headline}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  headline: e.target.value,
                }))
              }
              placeholder="Ej: Completa tu almuerzo con una bebida"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case outline-none"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  is_active: e.target.checked,
                }))
              }
            />
            Recomendación activa
          </label>

          <div className="flex gap-2">
            {draft.id && (
              <button
                onClick={() => setDraft(EMPTY)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-xs font-black text-slate-600"
              >
                Cancelar
              </button>
            )}

            <button
              onClick={save}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Guardar
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
