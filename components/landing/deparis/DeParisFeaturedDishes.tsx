"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Minus, Plus, Settings2, ShoppingBag, UtensilsCrossed } from "lucide-react";

import MenuItemModal from "@/components/menu/MenuItemModal";
import ImageLightbox from "@/components/ui/ImageLightbox";
import CountUp from "@/components/ui/CountUp";
import { getCartTotal } from "@/lib/menu/whatsapp-message";
import { useSharedCart } from "@/lib/menu/useSharedCart";
import type { MenuCartLine, MenuItem, MenuOptionGroup } from "@/lib/menu/types";
import { useDeParisLanguage } from "@/components/deparis-i18n/DeParisLanguageProvider";

export type FeaturedDish = {
  id: string;
  name: string;
  description: string | null;
  name_en?: string | null;
  description_en?: string | null;
  price: number;
  image_url: string | null;
  venue_type: "bar" | "restaurant" | "general";
  store_id?: string;
  category_id?: string;
  is_active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
  stock?: number | null;
  daily_stock_enabled?: boolean;
  menu_item_option_groups?: MenuOptionGroup[];
  remaining?: number | null;
  available_by_menu_now?: boolean;
};

type Props = {
  dishes: FeaturedDish[];
  menuHref?: string;
  storeSlug?: string;
};

const MAX_DISHES = 6;
const MAX_DRINKS = 4;
const ACCENT = "#FC6C26";

function asMenuItem(dish: FeaturedDish): MenuItem {
  return {
    id: dish.id,
    store_id: dish.store_id || "",
    category_id: dish.category_id || "",
    name: dish.name,
    description: dish.description,
    price: Number(dish.price) || 0,
    image_url: dish.image_url,
    is_active: dish.is_active !== false,
    is_featured: dish.is_featured !== false,
    sort_order: dish.sort_order || 0,
    stock: dish.stock ?? null,
    daily_stock_enabled: dish.daily_stock_enabled === true,
    available_dine_in: true,
    available_takeaway: true,
    available_delivery: true,
    delivery_paused_date: null,
    delivery_pause_reason: null,
    menu_item_option_groups: dish.menu_item_option_groups || [],
  };
}

function SeeFullMenuTile({ menuHref }: { menuHref: string }) {
  return (
    <a href={menuHref} className="flex min-h-[210px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#1B1410]/15 bg-white/35 p-5 text-center transition hover:border-[#FC6C26]/50 hover:bg-[#FC6C26]/5">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1B1410] text-[#FFF4D6]">
        <ArrowRight size={18} />
      </span>
      <span className="text-xs font-black uppercase tracking-[.08em] text-[#1B1410]/70">Ver carta completa</span>
      <span className="max-w-[150px] text-[10px] font-semibold leading-4 text-[#1B1410]/40">
        Explora categorías, extras y todas las opciones disponibles.
      </span>
    </a>
  );
}

function DishTile({
  dish, quantity, liveReady, onQuickAdd, onQuickRemove, onPersonalize, onOpenPhoto,
}: {
  dish: FeaturedDish;
  quantity: number;
  liveReady: boolean;
  onQuickAdd: () => void;
  onQuickRemove: () => void;
  onPersonalize: () => void;
  onOpenPhoto: () => void;
}) {
  const soldOut = liveReady && dish.remaining === 0;
  const unavailableBySchedule =
    liveReady &&
    dish.venue_type !== "bar" &&
    dish.available_by_menu_now === false;

  const groups = dish.menu_item_option_groups || [];
  const customizable =
    liveReady &&
    !unavailableBySchedule &&
    groups.length > 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#1B1410]/8 bg-white shadow-[0_6px_18px_rgba(27,20,16,.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(27,20,16,.09)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1B1410]/5">
        {dish.image_url ? (
          <button type="button" onClick={onOpenPhoto} className="absolute inset-0" aria-label={`Ver foto de ${dish.name}`}>
            <Image src={dish.image_url} alt={dish.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-[1.035]" />
          </button>
        ) : (
          <div className="flex h-full items-center justify-center text-[#1B1410]/20"><UtensilsCrossed size={28} /></div>
        )}

        {soldOut && <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2.5 py-1 text-[8px] font-black uppercase text-white shadow-sm">Agotado</span>}

        {!soldOut && unavailableBySchedule && (
          <span className="absolute right-2 top-2 rounded-full bg-[#1B1410]/90 px-2.5 py-1 text-[8px] font-black uppercase text-white shadow-sm">
            Según horario
          </span>
        )}

        {customizable && !soldOut && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[8px] font-black uppercase text-[#1B1410] shadow-sm">
            <Settings2 size={9} /> Personalizable
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-2 text-sm leading-snug text-[#1B1410]" style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}>{dish.name}</h4>
          <strong className="shrink-0 text-sm text-[#1B1410]">${Number(dish.price).toFixed(2)}</strong>
        </div>
        {dish.description && <p className="mt-1 line-clamp-1 text-[11px] text-[#1B1410]/45">{dish.description}</p>}
        {liveReady && dish.remaining !== null && dish.remaining !== undefined && dish.remaining > 0 && dish.remaining <= 5 && (
          <p className="mt-1 text-[9px] font-black uppercase text-amber-700">Quedan {dish.remaining}</p>
        )}

        <div className="mt-auto pt-3">
          {!liveReady ? (
            <a href="/menu/deparis" className="flex w-full items-center justify-center rounded-full bg-[#1B1410] px-3 py-2.5 text-[10px] font-black uppercase text-white">Ver en la carta</a>
          ) : soldOut ? (
            <div className="rounded-full bg-red-50 px-3 py-2.5 text-center text-[9px] font-black uppercase text-red-600">
              No disponible ahora
            </div>
          ) : unavailableBySchedule ? (
            <a
              href="/menu/deparis"
              className="flex w-full items-center justify-center rounded-full border border-[#1B1410]/15 bg-[#1B1410]/[.04] px-3 py-2.5 text-[9px] font-black uppercase text-[#1B1410]/60"
            >
              Ver disponibilidad en la carta
            </a>
          ) : customizable ? (
            <button type="button" onClick={onPersonalize} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#FC6C26] px-3 py-2.5 text-[10px] font-black uppercase text-white">
              <Settings2 size={12} /> Personalizar
            </button>
          ) : quantity === 0 ? (
            <button type="button" onClick={onQuickAdd} className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#FC6C26] px-3 py-2.5 text-[10px] font-black uppercase text-white">
              <Plus size={13} /> Agregar
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center rounded-full bg-[#1B1410] p-1 text-white">
                <button type="button" onClick={onQuickRemove} className="flex h-6 w-6 items-center justify-center rounded-full"><Minus size={12} /></button>
                <span className="w-6 text-center text-xs font-black">{quantity}</span>
                <button type="button" onClick={onQuickAdd} className="flex h-6 w-6 items-center justify-center rounded-full"><Plus size={12} /></button>
              </div>
              <span className="text-[9px] font-black uppercase text-emerald-600">En pedido</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function DishGrid(props: {
  items: FeaturedDish[];
  menuHref: string;
  quantities: Record<string, number>;
  liveReady: boolean;
  onAdd: (d: FeaturedDish) => void;
  onRemove: (d: FeaturedDish) => void;
  onPersonalize: (d: FeaturedDish) => void;
  onPhoto: (d: FeaturedDish) => void;
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {props.items.map((dish, index) => (
        <motion.div key={dish.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .4, delay: (index % 4) * .05 }} className="h-full">
          <DishTile
            dish={dish}
            quantity={props.quantities[dish.id] || 0}
            liveReady={props.liveReady}
            onQuickAdd={() => props.onAdd(dish)}
            onQuickRemove={() => props.onRemove(dish)}
            onPersonalize={() => props.onPersonalize(dish)}
            onOpenPhoto={() => props.onPhoto(dish)}
          />
        </motion.div>
      ))}
      <SeeFullMenuTile menuHref={props.menuHref} />
    </div>
  );
}

export default function DeParisFeaturedDishes({ dishes: initialDishes, menuHref, storeSlug = "deparis" }: Props) {
  const { locale } = useDeParisLanguage();
  const { cart, setCart } = useSharedCart(storeSlug);
  const [liveDishes, setLiveDishes] = useState<FeaturedDish[]>(initialDishes);
  const [liveReady, setLiveReady] = useState(false);
  const [photoDish, setPhotoDish] = useState<FeaturedDish | null>(null);
  const [activeDish, setActiveDish] = useState<FeaturedDish | null>(null);
  const [activeMenuNames, setActiveMenuNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/landing-featured?slug=${encodeURIComponent(storeSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setLiveDishes(data?.dishes || []);
        setActiveMenuNames((data?.activeMenus || []).map((m: { name: string }) => m.name));
        setLiveReady(true);
      })
      .catch(() => { if (!cancelled) setLiveReady(false); });
    return () => { cancelled = true; };
  }, [storeSlug]);

  const localizedDishes = useMemo(() => liveDishes.map((dish) => ({
    ...dish,
    name: locale === "en" && dish.name_en?.trim() ? dish.name_en : dish.name,
    description: locale === "en" && dish.description_en?.trim() ? dish.description_en : dish.description,
  })), [liveDishes, locale]);
  const platos = useMemo(() => localizedDishes.filter((d) => d.venue_type !== "bar").slice(0, MAX_DISHES), [localizedDishes]);
  const bebidas = useMemo(() => localizedDishes.filter((d) => d.venue_type === "bar").slice(0, MAX_DRINKS), [localizedDishes]);

  const quantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of cart) {
      if (line.selected_options.length === 0) map[line.menu_item_id] = (map[line.menu_item_id] || 0) + line.quantity;
    }
    return map;
  }, [cart]);

  const getQuickLine = (id: string) => cart.find((line) => line.menu_item_id === id && line.selected_options.length === 0);

  const quickAdd = (dish: FeaturedDish) => {
    if (dish.remaining === 0) return;
    if (
      dish.venue_type !== "bar" &&
      dish.available_by_menu_now === false
    ) {
      return;
    }
    const existing = getQuickLine(dish.id);
    if (existing) {
      setCart((prev) => prev.map((line) => line.lineId === existing.lineId ? { ...line, quantity: line.quantity + 1 } : line));
    } else {
      setCart((prev) => [...prev, {
        lineId: crypto.randomUUID(),
        menu_item_id: dish.id,
        name: dish.name,
        unit_base_price: dish.price,
        quantity: 1,
        selected_options: [],
      }]);
    }
  };

  const quickRemove = (dish: FeaturedDish) => {
    const existing = getQuickLine(dish.id);
    if (!existing) return;
    if (existing.quantity <= 1) setCart((prev) => prev.filter((line) => line.lineId !== existing.lineId));
    else setCart((prev) => prev.map((line) => line.lineId === existing.lineId ? { ...line, quantity: line.quantity - 1 } : line));
  };

  const addCustomized = (line: MenuCartLine) => {
    setCart((prev) => [...prev, line]);
    setActiveDish(null);
  };

  const totalItems = cart.reduce((sum, line) => sum + line.quantity, 0);
  const totalPrice = getCartTotal(cart);

  if (!menuHref || liveDishes.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[#FFF4D6] py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0 opacity-[.035]" style={{ backgroundImage: "repeating-linear-gradient(45deg,#1B1410 0,#1B1410 1px,transparent 1px,transparent 14px),repeating-linear-gradient(-45deg,#1B1410 0,#1B1410 1px,transparent 1px,transparent 14px)" }} />

      <div className="relative mx-auto max-w-7xl px-5 pb-24 sm:px-8 sm:pb-8">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.3em] text-[#FC6C26]">Selección destacada disponible ahora</p>
            <h2 className="mt-3 text-3xl leading-tight text-[#1B1410] sm:text-4xl" style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}>Lo mejor de la casa</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-bold text-[#1B1410]/55">
              {platos.length > 0 && <span><CountUp end={platos.length} className="text-[#FC6C26]" /> platos</span>}
              {bebidas.length > 0 && <span><CountUp end={bebidas.length} className="text-[#FC6C26]" /> bebidas</span>}
              {activeMenuNames.length > 0 && <span className="text-emerald-700">• {activeMenuNames.join(" · ")} activo ahora</span>}
            </div>
          </div>
          <a href={menuHref} className="inline-flex items-center gap-1.5 text-sm font-black text-[#1B1410]/75 hover:text-[#FC6C26]">Ver carta completa <ArrowRight size={15} /></a>
        </div>

        {platos.length > 0 && (
          <div id="restaurante" className="mt-9 scroll-mt-32">
            <h3 className="text-xl text-[#1B1410] sm:text-2xl" style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}>Para comer</h3>
            <p className="mt-1 text-xs font-semibold text-[#1B1410]/40">Una selección corta para pedir rápido. La carta contiene todas las opciones.</p>
            <DishGrid items={platos} menuHref={menuHref} quantities={quantities} liveReady={liveReady} onAdd={quickAdd} onRemove={quickRemove} onPersonalize={setActiveDish} onPhoto={setPhotoDish} />
          </div>
        )}

        {bebidas.length > 0 && (
          <div id="bar" className="mt-12 scroll-mt-32">
            <h3 className="text-xl text-[#1B1410] sm:text-2xl" style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}>De la barra</h3>
            <DishGrid items={bebidas} menuHref={`${menuHref}?tipo=bar`} quantities={quantities} liveReady={liveReady} onAdd={quickAdd} onRemove={quickRemove} onPersonalize={setActiveDish} onPhoto={setPhotoDish} />
          </div>
        )}
      </div>

      {totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <a href={menuHref} className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-[#1B1410] px-5 py-4 text-[#FFF4D6] shadow-[0_16px_40px_rgba(27,20,16,.35)]">
            <span className="flex items-center gap-2 text-sm font-black"><ShoppingBag size={18} className="text-[#FC6C26]" />{totalItems} {totalItems === 1 ? "producto" : "productos"}</span>
            <span className="flex items-center gap-2 text-sm font-black">${totalPrice.toFixed(2)} · Completar pedido <ArrowRight size={15} /></span>
          </a>
        </div>
      )}

      {activeDish && liveReady && (
        <MenuItemModal item={asMenuItem(activeDish)} accentColor={ACCENT} onClose={() => setActiveDish(null)} onAdd={addCustomized} />
      )}

      {photoDish?.image_url && (
        <ImageLightbox src={photoDish.image_url} alt={photoDish.name} onClose={() => setPhotoDish(null)} />
      )}
    </section>
  );
}
