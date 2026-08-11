"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Bodoni_Moda, Manrope } from "next/font/google";
import { ShoppingBag } from "lucide-react";

import MenuItemModal from "./MenuItemModal";
import MenuCartDrawer from "./MenuCartDrawer";
import type { MenuCartLine, MenuCategory, MenuItem } from "@/lib/menu/types";

const display = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--menu-font-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--menu-font-body",
  display: "swap",
});

type StoreForMenu = {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

type Props = {
  store: StoreForMenu;
  categories: MenuCategory[];
  whatsappNumber: string | null;
};

// Paleta elegante de "carta impresa" por defecto — cualquier tienda
// se ve bien sin configurar nada. primary_color/secondary_color (ya
// existentes en cada tienda) permiten afinar el acento y el fondo a
// la marca real del negocio, sin tocar código.
const DEFAULT_ACCENT = "#B45309";
const DEFAULT_BG = "#FAF6EF";
const INK = "#1B1410";

type VenueFilter = "bar" | "restaurant";

export default function MenuPageClient({ store, categories, whatsappNumber }: Props) {
  const accent = store.primary_color || DEFAULT_ACCENT;
  const bg = store.secondary_color || DEFAULT_BG;

  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<MenuCartLine[]>([]);
  const [orderSentMessage, setOrderSentMessage] = useState(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Un platillo se puede agregar directo (sin abrir el modal) si no
  // tiene ningún grupo de opciones OBLIGATORIO — así lo simple sigue
  // siendo un solo toque, y lo que de verdad necesita una elección
  // (término, salsa, etc.) sigue abriendo el modal para elegir.
  const isQuickAddable = (item: MenuItem) =>
    item.menu_item_option_groups.every((group) => !group.is_required);

  const showAddedToast = (name: string) => {
    setAddedToast(name);
    window.setTimeout(() => setAddedToast((current) => (current === name ? null : current)), 1600);
  };

  // Para platillos sin opciones, agregar de nuevo suma a la misma
  // línea (en vez de crear una línea repetida), así el "+" se puede
  // convertir en un contador "- N +" que refleja cuántos ya agregó.
  const getQuickLine = (itemId: string) =>
    cart.find((line) => line.menu_item_id === itemId && line.selected_options.length === 0);

  const getQuickQuantity = (itemId: string) => getQuickLine(itemId)?.quantity ?? 0;

  const handleQuickAdd = (item: MenuItem) => {
    const existing = getQuickLine(item.id);
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
        menu_item_id: item.id,
        name: item.name,
        unit_base_price: item.price,
        quantity: 1,
        selected_options: [],
      },
    ]);
  };

  const handleQuickDecrement = (item: MenuItem) => {
    const existing = getQuickLine(item.id);
    if (!existing) return;
    if (existing.quantity <= 1) {
      setCart((prev) => prev.filter((l) => l.lineId !== existing.lineId));
    } else {
      setCart((prev) =>
        prev.map((l) => (l.lineId === existing.lineId ? { ...l, quantity: l.quantity - 1 } : l))
      );
    }
  };

  const categoriesWithItems = categories.filter((cat) => cat.menu_items.length > 0);

  const hasBar = categoriesWithItems.some((cat) => cat.venue_type === "bar");
  const hasRestaurant = categoriesWithItems.some((cat) => cat.venue_type === "restaurant");
  const showVenueTabs = hasBar && hasRestaurant;

  const [venueFilter, setVenueFilter] = useState<VenueFilter>("restaurant");

  const visibleCategories = showVenueTabs
    ? categoriesWithItems.filter(
        (cat) => cat.venue_type === "general" || cat.venue_type === venueFilter
      )
    : categoriesWithItems;

  // Resalta sola la pestaña de categoría de la sección que se está
  // viendo mientras el cliente hace scroll (como en las apps de
  // delivery). Usa IntersectionObserver nativo del navegador — sin
  // librerías, sin costo de rendimiento perceptible.
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const sections = Object.values(sectionRefs.current).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveCategoryId(visible[0].target.id.replace("cat-", ""));
        }
      },
      { rootMargin: "-140px 0px -70% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [visibleCategories]);

  const handleAddToCart = (line: MenuCartLine) => {
    setCart((prev) => [...prev, line]);
    showAddedToast(line.name);
  };

  const handleUpdateQuantity = (lineId: string, quantity: number) => {
    setCart((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)));
  };

  const handleRemove = (lineId: string) => {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId));
  };

  const totalItems = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <main
      className={`${display.variable} ${body.variable} min-h-screen pb-28`}
      style={{ backgroundColor: bg, fontFamily: "var(--menu-font-body)" }}
    >
      <header className="pb-2" style={{ backgroundColor: INK }}>
        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pb-6 pt-9 text-center">
          {store.logo_url ? (
            <div className="relative mb-3 h-12 w-12 overflow-hidden rounded-full border border-white/20">
              <Image src={store.logo_url} alt={store.name} fill className="object-cover" />
            </div>
          ) : (
            <div
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border text-sm"
              style={{ borderColor: accent, color: accent, fontFamily: "var(--menu-font-display)" }}
            >
              {store.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <p
            className="text-[10px] font-bold uppercase tracking-[0.3em]"
            style={{ color: accent }}
          >
            {store.name}
          </p>
          <h1
            className="mt-1 text-3xl text-white"
            style={{ fontFamily: "var(--menu-font-display)", fontWeight: 600 }}
          >
            La Carta
          </h1>
        </div>

        {showVenueTabs && (
          <div className="mx-auto flex max-w-2xl gap-2 px-4 pb-4">
            {(["restaurant", "bar"] as VenueFilter[]).map((type) => (
              <button
                key={type}
                onClick={() => setVenueFilter(type)}
                className="flex-1 rounded-full border py-2.5 text-xs font-bold uppercase tracking-wide transition"
                style={
                  venueFilter === type
                    ? { backgroundColor: accent, borderColor: accent, color: INK }
                    : { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.25)", color: "#FFF4E6" }
                }
              >
                {type === "restaurant" ? "Restaurante" : "Bar"}
              </button>
            ))}
          </div>
        )}

        {visibleCategories.length > 0 && (
          <nav className="scrollbar-none mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 pb-4">
            {visibleCategories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              return (
                <a
                  key={cat.id}
                  href={`#cat-${cat.id}`}
                  className="shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition"
                  style={
                    isActive
                      ? { backgroundColor: accent, borderColor: accent, color: INK }
                      : { borderColor: "rgba(255,255,255,0.2)", color: "#FFF4E6" }
                  }
                >
                  {cat.name}
                </a>
              );
            })}
          </nav>
        )}
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8">
        {visibleCategories.length === 0 ? (
          <div className="rounded-2xl bg-white/70 p-10 text-center shadow-sm">
            <p className="text-sm font-semibold" style={{ color: INK, opacity: 0.6 }}>
              Este menú todavía no tiene platillos publicados.
            </p>
          </div>
        ) : (
          <div className="space-y-11">
            {visibleCategories.map((category) => (
              <section
                key={category.id}
                id={`cat-${category.id}`}
                ref={(el) => {
                  sectionRefs.current[category.id] = el;
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: accent }}
                >
                  {category.name}
                </p>
                <div
                  className="mt-2 h-px w-full"
                  style={{ backgroundColor: "#C89B3C", opacity: 0.35 }}
                />

                <div className="mt-5 space-y-5">
                  {category.menu_items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      {item.image_url && (
                        <button
                          onClick={() => setActiveItem(item)}
                          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black/5"
                        >
                          <Image
                            src={item.image_url}
                            alt=""
                            fill
                            loading="lazy"
                            sizes="56px"
                            className="object-cover"
                          />
                        </button>
                      )}

                      <button
                        onClick={() => setActiveItem(item)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-baseline gap-2">
                          <span
                            className="text-base"
                            style={{
                              fontFamily: "var(--menu-font-display)",
                              fontWeight: 600,
                              color: INK,
                            }}
                          >
                            {item.name}
                          </span>
                          {item.is_featured && (
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                              style={{ backgroundColor: `${accent}1a`, color: accent }}
                            >
                              Recomendado
                            </span>
                          )}
                          <span
                            className="relative top-[-3px] flex-1 border-b border-dotted"
                            style={{ borderColor: "rgba(27,20,16,0.35)" }}
                          />
                          <span
                            className="text-base"
                            style={{
                              fontFamily: "var(--menu-font-display)",
                              fontWeight: 700,
                              color: accent,
                            }}
                          >
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                        {item.description && (
                          <p
                            className="mt-1 text-[13px] italic"
                            style={{ color: INK, opacity: 0.55 }}
                          >
                            {item.description}
                          </p>
                        )}
                      </button>

                      {isQuickAddable(item) ? (
                        getQuickQuantity(item.id) > 0 ? (
                          <div
                            className="flex shrink-0 items-center gap-2 rounded-full px-1.5 py-1"
                            style={{ backgroundColor: accent }}
                          >
                            <button
                              onClick={() => handleQuickDecrement(item)}
                              aria-label={`Quitar uno de ${item.name}`}
                              className="flex h-6 w-6 items-center justify-center text-sm font-bold transition active:scale-90"
                              style={{ color: INK }}
                            >
                              −
                            </button>
                            <span className="w-3 text-center text-sm font-bold" style={{ color: INK }}>
                              {getQuickQuantity(item.id)}
                            </span>
                            <button
                              onClick={() => handleQuickAdd(item)}
                              aria-label={`Agregar uno más de ${item.name}`}
                              className="flex h-6 w-6 items-center justify-center text-sm font-bold transition active:scale-90"
                              style={{ color: INK }}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleQuickAdd(item)}
                            aria-label={`Agregar ${item.name}`}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-bold transition active:scale-90"
                            style={{ backgroundColor: accent, color: INK }}
                          >
                            +
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => setActiveItem(item)}
                          aria-label={`Elegir opciones de ${item.name}`}
                          className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                          style={{ borderColor: accent, color: accent }}
                        >
                          Elegir
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {totalItems > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold shadow-lg"
          style={{ backgroundColor: accent, color: INK }}
        >
          <ShoppingBag size={18} />
          Ver pedido ({totalItems})
        </button>
      )}

      {activeItem && (
        <MenuItemModal
          item={activeItem}
          accentColor={accent}
          onClose={() => setActiveItem(null)}
          onAdd={handleAddToCart}
        />
      )}

      {cartOpen && (
        <MenuCartDrawer
          storeName={store.name}
          whatsappNumber={whatsappNumber}
          cart={cart}
          accentColor={accent}
          onClose={() => setCartOpen(false)}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={handleRemove}
          onOrderSent={() => {
            setOrderSentMessage(true);
            setCart([]);
            setCartOpen(false);
          }}
        />
      )}

      {addedToast && (
        <div
          className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg transition-opacity"
          style={{ backgroundColor: INK }}
        >
          ✓ {addedToast} agregado
        </div>
      )}

      {orderSentMessage && (
        <div
          className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full px-5 py-2.5 text-xs font-bold text-white shadow-lg"
          style={{ backgroundColor: INK }}
        >
          Pedido enviado por WhatsApp. En breve {store.name} te confirma.
          <button className="ml-3 underline" onClick={() => setOrderSentMessage(false)}>
            Cerrar
          </button>
        </div>
      )}
    </main>
  );
}
