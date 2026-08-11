"use client";

import { useState } from "react";
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

  const handleAddToCart = (line: MenuCartLine) => {
    setCart((prev) => [...prev, line]);
    setCartOpen(true);
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
            {visibleCategories.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className="shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide"
                style={{ borderColor: "rgba(255,255,255,0.2)", color: "#FFF4E6" }}
              >
                {cat.name}
              </a>
            ))}
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
              <section key={category.id} id={`cat-${category.id}`}>
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

                <div className="mt-5 space-y-6">
                  {category.menu_items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveItem(item)}
                      className="block w-full text-left"
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
                        <span
                          className="relative top-[-3px] flex-1 border-b border-dotted"
                          style={{ borderColor: "rgba(27,20,16,0.35)" }}
                        />
                        <span
                          className="text-base"
                          style={{
                            fontFamily: "var(--menu-font-display)",
                            fontWeight: 600,
                            color: INK,
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
