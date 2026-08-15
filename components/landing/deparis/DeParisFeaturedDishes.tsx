"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Minus, Plus, ShoppingBag, UtensilsCrossed } from "lucide-react";

import { useSharedCart } from "@/lib/menu/useSharedCart";
import ImageLightbox from "@/components/ui/ImageLightbox";
import CountUp from "@/components/ui/CountUp";

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
  /** Slug de la tienda — misma llave que usa /menu/[slug] para que el
   *  carrito de la landing y el de la carta completa sean uno solo. */
  storeSlug?: string;
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
  onOpenPhoto,
}: {
  dish: FeaturedDish;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  onOpenPhoto: () => void;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-[#1B1410]/8 bg-white shadow-[0_6px_18px_rgba(27,20,16,0.05)] transition-shadow hover:shadow-[0_10px_26px_rgba(27,20,16,0.09)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1B1410]/5">
        {dish.image_url ? (
          <button
            type="button"
            onClick={onOpenPhoto}
            aria-label={`Ver foto de ${dish.name}`}
            className="absolute inset-0 h-full w-full"
          >
            <Image
              src={dish.image_url}
              alt={dish.name}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
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
  onOpenPhoto,
}: {
  items: FeaturedDish[];
  menuHref?: string;
  quantities: Record<string, number>;
  onAdd: (dish: FeaturedDish) => void;
  onRemove: (dish: FeaturedDish) => void;
  onOpenPhoto: (dish: FeaturedDish) => void;
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
            onOpenPhoto={() => onOpenPhoto(dish)}
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
export default function DeParisFeaturedDishes({ dishes, menuHref, storeSlug = "deparis" }: Props) {
  // Mismo carrito (localStorage) que usa /menu/[slug]: la landing es
  // la vitrina rápida para "picar" lo que se te antoja, y el pedido se
  // termina de armar y se envía por WhatsApp desde la carta completa
  // — sin tener que volver a elegir todo de nuevo.
  const { cart, setCart } = useSharedCart(storeSlug);
  const [photoDish, setPhotoDish] = useState<FeaturedDish | null>(null);

  const platos = useMemo(
    () => dishes.filter((d) => d.venue_type !== "bar").slice(0, MAX_PER_GRID),
    [dishes]
  );
  const bebidas = useMemo(
    () => dishes.filter((d) => d.venue_type === "bar").slice(0, MAX_PER_GRID),
    [dishes]
  );

  const quantities = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((line) => {
      if (line.selected_options.length === 0) {
        map[line.menu_item_id] = (map[line.menu_item_id] ?? 0) + line.quantity;
      }
    });
    return map;
  }, [cart]);

  const getQuickLine = (itemId: string) =>
    cart.find((line) => line.menu_item_id === itemId && line.selected_options.length === 0);

  const handleAdd = (dish: FeaturedDish) => {
    const existing = getQuickLine(dish.id);
    if (existing) {
      setCart((prev) =>
        prev.map((l) => (l.lineId === existing.lineId ? { ...l, quantity: l.quantity + 1 } : l))
      );
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        lineId: crypto.randomUUID(),
        menu_item_id: dish.id,
        name: dish.name,
        unit_base_price: dish.price,
        quantity: 1,
        selected_options: [],
      },
    ]);
  };

  const handleRemove = (dish: FeaturedDish) => {
    const existing = getQuickLine(dish.id);
    if (!existing) return;
    if (existing.quantity <= 1) {
      setCart((prev) => prev.filter((l) => l.lineId !== existing.lineId));
    } else {
      setCart((prev) =>
        prev.map((l) => (l.lineId === existing.lineId ? { ...l, quantity: l.quantity - 1 } : l))
      );
    }
  };

  const totalItems = cart.reduce((sum, l) => sum + l.quantity, 0);
  const totalPrice = cart.reduce((sum, l) => sum + l.unit_base_price * l.quantity, 0);

  if (!menuHref || dishes.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[#FFF4D6] py-20 sm:py-28">
      {/* Textura tipo mantel/papel — puro CSS (dos gradientes en
          diagonal muy sutiles), sin ninguna imagen de fondo, así que
          no agrega peso ni una sola petición de red. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #1B1410 0, #1B1410 1px, transparent 1px, transparent 14px), repeating-linear-gradient(-45deg, #1B1410 0, #1B1410 1px, transparent 1px, transparent 14px)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-5 pb-24 sm:px-8 sm:pb-8">
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

            {/* Números reales (no inventados): cuántos platos y
                bebidas destacados hay ahora mismo en la carta, con un
                pequeño conteo animado la primera vez que se ve. */}
            {(platos.length > 0 || bebidas.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-[#1B1410]/60">
                {platos.length > 0 && (
                  <span>
                    <CountUp end={platos.length} className="text-[#FC6C26]" /> platos destacados
                  </span>
                )}
                {bebidas.length > 0 && (
                  <span>
                    <CountUp end={bebidas.length} className="text-[#FC6C26]" /> bebidas destacadas
                  </span>
                )}
              </div>
            )}
          </div>
          <a
            href={menuHref}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1B1410]/80 transition hover:text-[#FC6C26]"
          >
            Ver menú completo <ArrowRight size={15} />
          </a>
        </div>

        {platos.length > 0 && (
          <div id="restaurante" className="mt-10 scroll-mt-32">
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
              onOpenPhoto={setPhotoDish}
            />
          </div>
        )}

        {bebidas.length > 0 && (
          <div id="bar" className="mt-12 scroll-mt-32">
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
              onOpenPhoto={setPhotoDish}
            />
          </div>
        )}
      </div>

      {/* Barra flotante: aparece solo cuando hay algo seleccionado.
          La landing es la vitrina rápida — el pedido se termina de
          armar y se envía por WhatsApp desde la carta completa, así
          que este botón lleva para allá con todo ya elegido. */}
      {totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <a
            href={menuHref}
            className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-[#1B1410] px-5 py-4 text-[#FFF4D6] shadow-[0_16px_40px_rgba(27,20,16,0.35)]"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <ShoppingBag size={18} className="text-[#FC6C26]" />
              {totalItems} {totalItems === 1 ? "producto" : "productos"}
            </span>
            <span className="flex items-center gap-2 text-sm font-bold">
              ${totalPrice.toFixed(2)} · Completar pedido <ArrowRight size={15} />
            </span>
          </a>
        </div>
      )}

      {photoDish?.image_url && (
        <ImageLightbox
          src={photoDish.image_url}
          alt={photoDish.name}
          onClose={() => setPhotoDish(null)}
        />
      )}
    </section>
  );
}
