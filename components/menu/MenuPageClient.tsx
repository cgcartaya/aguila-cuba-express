"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";

import MenuItemModal from "./MenuItemModal";
import MenuCartDrawer from "./MenuCartDrawer";
import type { MenuCartLine, MenuCategory, MenuItem } from "@/lib/menu/types";

type StoreForMenu = {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
};

type Props = {
  store: StoreForMenu;
  categories: MenuCategory[];
  whatsappNumber: string | null;
};

const DEFAULT_ACCENT = "#061b3a";

export default function MenuPageClient({ store, categories, whatsappNumber }: Props) {
  const accentColor = store.primary_color || DEFAULT_ACCENT;

  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<MenuCartLine[]>([]);
  const [orderSentMessage, setOrderSentMessage] = useState(false);

  const visibleCategories = categories.filter((cat) => cat.menu_items.length > 0);

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
    <main className="min-h-screen bg-slate-50 pb-28">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-5">
          {store.logo_url && (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
              <Image src={store.logo_url} alt={store.name} fill className="object-cover" />
            </div>
          )}
          <div>
            <p className="text-xs font-black uppercase tracking-wide" style={{ color: accentColor }}>
              Menú digital
            </p>
            <h1 className="text-xl font-black text-slate-900">{store.name}</h1>
          </div>
        </div>

        {visibleCategories.length > 0 && (
          <nav className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3">
            {visibleCategories.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className="shrink-0 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-600"
              >
                {cat.name}
              </a>
            ))}
          </nav>
        )}
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {visibleCategories.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Este menú todavía no tiene platillos publicados.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {visibleCategories.map((category) => (
              <section key={category.id} id={`cat-${category.id}`}>
                <h2 className="mb-3 text-lg font-black text-slate-900">{category.name}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {category.menu_items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveItem(item)}
                      className="flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {item.image_url && (
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">{item.name}</p>
                        {item.description && (
                          <p className="truncate text-xs font-semibold text-slate-500">
                            {item.description}
                          </p>
                        )}
                        <p className="mt-0.5 text-sm font-black" style={{ color: accentColor }}>
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
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
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black text-white shadow-lg"
          style={{ backgroundColor: accentColor }}
        >
          <ShoppingBag size={18} />
          Ver pedido ({totalItems})
        </button>
      )}

      {activeItem && (
        <MenuItemModal
          item={activeItem}
          accentColor={accentColor}
          onClose={() => setActiveItem(null)}
          onAdd={handleAddToCart}
        />
      )}

      {cartOpen && (
        <MenuCartDrawer
          storeName={store.name}
          whatsappNumber={whatsappNumber}
          cart={cart}
          accentColor={accentColor}
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
        <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-lg">
          Pedido enviado por WhatsApp. En breve {store.name} te confirma.
          <button className="ml-3 underline" onClick={() => setOrderSentMessage(false)}>
            Cerrar
          </button>
        </div>
      )}
    </main>
  );
}
