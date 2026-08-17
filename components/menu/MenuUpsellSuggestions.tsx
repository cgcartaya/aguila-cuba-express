"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, Plus, Sparkles } from "lucide-react";

type Suggestion = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  headline: string;
  has_required_options: boolean;
};

type Props = {
  storeSlug: string;
  cartItemIds: string[];
  accentColor: string;
  onSelect: (itemId: string) => void;
};

export default function MenuUpsellSuggestions({
  storeSlug,
  cartItemIds,
  accentColor,
  onSelect,
}: Props) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const key = useMemo(
    () => [...new Set(cartItemIds)].sort().join(","),
    [cartItemIds]
  );

  useEffect(() => {
    if (!cartItemIds.length) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(
      `/api/public/menu-upsells?slug=${encodeURIComponent(
        storeSlug
      )}&items=${encodeURIComponent(key)}`
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) {
          setItems(data?.suggestions || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [storeSlug, key, cartItemIds.length]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-xs font-bold text-orange-700">
        <Loader2 size={13} className="animate-spin" />
        Buscando recomendaciones...
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <section className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-orange-600" />
        <div>
          <h3 className="text-xs font-black uppercase tracking-wide text-orange-800">
            Completa tu pedido
          </h3>
          <p className="mt-0.5 text-[10px] font-semibold text-orange-700/70">
            Sugerencias del restaurante
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="w-[185px] shrink-0 overflow-hidden rounded-2xl border border-orange-100 bg-white text-left shadow-sm"
          >
            {item.image_url && (
              <div className="relative h-24 w-full bg-slate-100">
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  sizes="185px"
                  className="object-cover"
                />
              </div>
            )}

            <div className="p-3">
              <p className="line-clamp-2 text-[10px] font-bold text-orange-600">
                {item.headline}
              </p>
              <p className="mt-1 line-clamp-1 text-sm font-black text-[#1B1410]">
                {item.name}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <strong className="text-xs text-[#1B1410]">
                  ${item.price.toFixed(2)}
                </strong>
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: accentColor }}
                >
                  <Plus size={13} />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
