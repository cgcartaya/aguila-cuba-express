"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Minus, Plus, ShoppingBag, UtensilsCrossed } from "lucide-react";

import { buildMenuOrderMessage } from "@/lib/menu/whatsapp-message";
import type { MenuCartLine } from "@/lib/menu/types";
import { WHATSAPP_PHONE } from "./constants";

export type FeaturedDish = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  venue_type: "bar" | "restaurant" | "general";
};

type Props = {
  dishes: FeaturedDish[];
  menuHref?: string;
};

// Cuántos productos como máximo se muestran por cuadrícula (Platos /
// Bebidas) — el resto está en la carta completa, a la que siempre se
// referencia con el link/tarjeta "Ver menú completo".
const MAX_PER_GRID = 8;

/**
 * Tarjeta compacta de producto: miniatura + nombre + precio + contador
 * de cantidad "− N +", el mismo patrón visual que ya usan los ítems
 * de agregado rápido en /menu/[slug]. Pensada para verse bien en 2
 * columnas en móvil.
 */
function DishTile({
  dish,
  quantity,
  onAdd,
  onRemove,
}: {
  dish: FeaturedDish;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-[#1B1410]/8 bg-white shadow-[0_6px_18px_rgba(27,20,16,0.05)] transition-shadow hover:shadow-[0_10px_26px_rgba(27,20,16,0.09)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1B1410]/5">
        {dish.image_url ? (
          <Image
            src={dish.image_url}
            alt={dish.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#1B1410]/20">
            <UtensilsCrossed size={28} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h4
          className="line-clamp-2 text-sm leading-snug text-[#1B1410]"
          style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
        >
          {dish.name}
        </h4>
        {dish.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-[#1B1410]/50">{dish.description}</p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-[#1B1410]">${dish.price.toFixed(2)}</span>

          {quantity === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              aria-label={`Agregar ${dish.name}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FC6C26] text-white transition hover:-translate-y-0.5 hover:bg-[#e85d1a]"
            >
              <Plus size={16} />
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-[#1B1410] px-1 py-1 text-white">
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Quitar ${dish.name}`}
                className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-white/15"
              >
                <Minus size={13} />
              </button>
              <span className="w-4 text-center text-xs font-bold">{quantity}</span>
              <button
                type="button"
                onClick={onAdd}
                aria-label={`Sumar ${dish.name}`}
                className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-white/15"
              >
                <Plus size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Última tarjeta de la cuadrícula: siempre invita a ver la carta completa. */
function SeeFullMenuTile({ menuHref }: { menuHref: string }) {
  return (
    <a
      href={menuHref}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#1B1410]/15 bg-[#1B1410]/[0.02] p-4 text-center transition hover:border-[#FC6C26]/50 hover:bg-[#FC6C26]/5"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1B1410] text-[#FFF4D6]">
        <ArrowRight size={17} />
      </span>
      <span className="text-xs font-bold uppercase tracking-wide text-[#1B1410]/70">
        Ver menú completo
      </span>
    </a>
  );
}

function DishGrid({
  items,
  menuHref,
  quantities,
  onAdd,
  onRemove,
}: {
  items: FeaturedDish[];
  menuHref?: string;
  quantities: Record<string, number>;
  onAdd: (dish: FeaturedDish) => void;
  onRemove: (dish: FeaturedDish) => void;
}) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {items.map((dish, i) => (
        <motion.div
          key={dish.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
        >
          <DishTile
            dish={dish}
            quantity={quantities[dish.id] ?? 0}
            onAdd={() => onAdd(dish)}
            onRemove={() => onRemove(dish)}
          />
        </motion.div>
      ))}
      {menuHref && <SeeFullMenuTile menuHref={menuHref} />}
    </div>
  );
}

// Si el negocio no tiene módulo de menú activo, o no marcó ningún
// platillo/bebida como destacado todavía, esta sección no se muestra
// — nunca deja un hueco vacío en la landing. Si solo tiene destacados
// de un tipo (solo platos, o solo bebidas), muestra únicamente ese
// bloque en vez de dejar un título "Bebidas" vacío.
export default function DeParisFeaturedDishes({ dishes, menuHref }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const platos = useMemo(
    () => dishes.filter((d) => d.venue_type !== "bar").slice(0, MAX_PER_GRID),
    [dishes]
  );
  const bebidas = useMemo(
    () => dishes.filter((d) => d.venue_type === "bar").slice(0, MAX_PER_GRID),
    [dishes]
  );

  const byId = useMemo(() => {
    const map = new Map<string, FeaturedDish>();
    dishes.forEach((d) => map.set(d.id, d));
    return map;
  }, [dishes]);

  const handleAdd = (dish: FeaturedDish) =>
    setQuantities((prev) => ({ ...prev, [dish.id]: (prev[dish.id] ?? 0) + 1 }));

  const handleRemove = (dish: FeaturedDish) =>
    setQuantities((prev) => {
      const next = (prev[dish.id] ?? 0) - 1;
      const copy = { ...prev };
      if (next <= 0) delete copy[dish.id];
      else copy[dish.id] = next;
      return copy;
    });

  const cartLines: MenuCartLine[] = useMemo(
    () =>
      Object.entries(quantities)
        .map(([id, quantity]) => {
          const dish = byId.get(id);
          if (!dish || quantity <= 0) return null;
          return {
            lineId: id,
            menu_item_id: id,
            name: dish.name,
            unit_base_price: dish.price,
            quantity,
            selected_options: [],
          } as MenuCartLine;
        })
        .filter((l): l is MenuCartLine => l !== null),
    [quantities, byId]
  );

  const totalItems = cartLines.reduce((sum, l) => sum + l.quantity, 0);
  const totalPrice = cartLines.reduce((sum, l) => sum + l.unit_base_price * l.quantity, 0);

  const whatsappOrderUrl = useMemo(() => {
    if (cartLines.length === 0) return null;
    const message = buildMenuOrderMessage({
      storeName: "De Paris",
      cart: cartLines,
      orderType: "dine_in",
    });
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  }, [cartLines]);

  if (!menuHref || dishes.length === 0) return null;

  return (
    <section className="relative bg-[#FFF4D6] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 sm:pb-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FC6C26]">
              Directo de nuestra cocina y barra
            </p>
            <h2
              className="mt-3 max-w-xl text-3xl leading-tight text-[#1B1410] sm:text-4xl"
              style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
            >
              Lo mejor de la casa
            </h2>
          </div>
          <a
            href={menuHref}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1B1410]/80 transition hover:text-[#FC6C26]"
          >
            Ver menú completo <ArrowRight size={15} />
          </a>
        </div>

        {platos.length > 0 && (
          <div id="platos-destacados" className="mt-10 scroll-mt-32">
            <h3
              className="text-xl text-[#1B1410] sm:text-2xl"
              style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
            >
              Platos principales
            </h3>
            <DishGrid
              items={platos}
              menuHref={menuHref}
              quantities={quantities}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
          </div>
        )}

        {bebidas.length > 0 && (
          <div id="bebidas-destacadas" className="mt-12 scroll-mt-32">
            <h3
              className="text-xl text-[#1B1410] sm:text-2xl"
              style={{ fontFamily: "var(--font-dp-display)", fontWeight: 600 }}
            >
              Bebidas principales
            </h3>
            <DishGrid
              items={bebidas}
              menuHref={`${menuHref}?tipo=bar`}
              quantities={quantities}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
          </div>
        )}
      </div>

      {/* Barra flotante: aparece solo cuando hay algo seleccionado y
          permite mandar el pedido directo por WhatsApp desde la
          landing, sin tener que entrar primero a la carta completa. */}
      {totalItems > 0 && whatsappOrderUrl && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <a
            href={whatsappOrderUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-[#1B1410] px-5 py-4 text-[#FFF4D6] shadow-[0_16px_40px_rgba(27,20,16,0.35)]"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <ShoppingBag size={18} className="text-[#FC6C26]" />
              {totalItems} {totalItems === 1 ? "producto" : "productos"}
            </span>
            <span className="flex items-center gap-2 text-sm font-bold">
              ${totalPrice.toFixed(2)} · Pedir por WhatsApp <ArrowRight size={15} />
            </span>
          </a>
        </div>
      )}
    </section>
  );
}
