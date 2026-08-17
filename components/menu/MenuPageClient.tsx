"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Clock3, Martini, Search, ShoppingBag, UtensilsCrossed } from "lucide-react";

import MenuItemModal from "./MenuItemModal";
import MenuCartDrawer from "./MenuCartDrawer";
import { useSharedCart } from "@/lib/menu/useSharedCart";
import type { MenuCartLine, MenuCategory, MenuItem, PublicDailyMenu } from "@/lib/menu/types";

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
  dailyMenus: PublicDailyMenu[];
  whatsappNumber: string | null;
  landingHref?: string;
  storeSlug: string;
};

type VenueFilter = "restaurant" | "bar";
type EditingState = { item: MenuItem; line: MenuCartLine } | null;

const INK = "#1B1410";
const DEFAULT_ACCENT = "#FF6B35";
const DEFAULT_BG = "#FFF8E8";

export default function MenuPageClient({
  store,
  categories,
  dailyMenus,
  whatsappNumber,
  landingHref,
  storeSlug,
}: Props) {
  const params = useSearchParams();
  const accent = store.primary_color || DEFAULT_ACCENT;
  const bg = store.secondary_color || DEFAULT_BG;
  const tableFromQr = params.get("mesa")?.trim() || null;

  const availableCategories = useMemo(
    () => categories.filter((cat) => cat.menu_items.length > 0),
    [categories]
  );

  const allItems = useMemo(
    () => availableCategories.flatMap((cat) => cat.menu_items),
    [availableCategories]
  );

  const hasRestaurant = availableCategories.some((c) => c.venue_type !== "bar");
  const hasBar = availableCategories.some((c) => c.venue_type === "bar" || c.venue_type === "general");

  const [venue, setVenue] = useState<VenueFilter>(
    params.get("tipo") === "bar" ? "bar" : hasRestaurant ? "restaurant" : "bar"
  );
  const [dailyMenuId, setDailyMenuId] = useState<string | null>(dailyMenus[0]?.id || null);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [editing, setEditing] = useState<EditingState>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<Record<string, number | null>>({});
  const [toast, setToast] = useState<string | null>(null);
  const { cart, setCart } = useSharedCart(storeSlug);

  useEffect(() => {
    fetch(`/api/public/menu-availability?slug=${encodeURIComponent(storeSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.availability) setAvailability(data.availability);
      })
      .catch(() => {});
  }, [storeSlug]);

  useEffect(() => {
    if (!dailyMenuId && dailyMenus[0]) setDailyMenuId(dailyMenus[0].id);
  }, [dailyMenus, dailyMenuId]);

  const activeDailyMenu = dailyMenus.find((m) => m.id === dailyMenuId) || dailyMenus[0] || null;
  const dailyIds = venue === "restaurant" && activeDailyMenu ? new Set(activeDailyMenu.itemIds) : null;
  const q = search.trim().toLowerCase();

  const visibleCategories = availableCategories
    .filter((cat) => cat.venue_type === "general" || cat.venue_type === venue)
    .map((cat) => ({
      ...cat,
      menu_items: cat.menu_items.filter((item) => {
        if (dailyIds && !dailyIds.has(item.id)) return false;
        if (q && !`${item.name} ${item.description || ""}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    }))
    .filter((cat) => cat.menu_items.length > 0);

  const totalItems = cart.reduce((sum, line) => sum + line.quantity, 0);

  const addQuick = (item: MenuItem) => {
    const existing = cart.find(
      (line) => line.menu_item_id === item.id && line.selected_options.length === 0
    );
    if (existing) {
      setCart((prev) =>
        prev.map((line) =>
          line.lineId === existing.lineId ? { ...line, quantity: line.quantity + 1 } : line
        )
      );
    } else {
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
    }
    setToast(item.name);
    window.setTimeout(() => setToast(null), 1400);
  };

  const addFromModal = (line: MenuCartLine) => {
    setCart((prev) => [...prev, line]);
    setToast(line.name);
    window.setTimeout(() => setToast(null), 1400);
  };

  const saveEditedLine = (line: MenuCartLine) => {
    setCart((prev) => prev.map((current) => (current.lineId === line.lineId ? line : current)));
    setEditing(null);
    setCartOpen(true);
    setToast(`${line.name} actualizado`);
    window.setTimeout(() => setToast(null), 1400);
  };

  const editCartLine = (line: MenuCartLine) => {
    const item = allItems.find((candidate) => candidate.id === line.menu_item_id);
    if (!item) return;
    setCartOpen(false);
    setEditing({ item, line });
  };

  return (
    <main className="min-h-screen pb-28" style={{ backgroundColor: bg, color: INK }}>
      <header className="bg-[#19120E] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          {landingHref ? (
            <Link
              href={landingHref}
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/60"
            >
              <ArrowLeft size={14} /> Volver
            </Link>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            {tableFromQr && (
              <span
                className="rounded-full border px-3 py-1 text-[10px] font-black"
                style={{ borderColor: accent, color: accent }}
              >
                Mesa {tableFromQr}
              </span>
            )}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/20"
            >
              <ShoppingBag size={17} />
              {totalItems > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black"
                  style={{ backgroundColor: accent }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-8 pt-3 sm:px-6">
          <div className="flex items-center gap-4">
            {store.logo_url && (
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-white">
                <Image src={store.logo_url} alt={store.name} fill className="object-contain p-1" />
              </div>
            )}

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.26em]" style={{ color: accent }}>
                {store.name}
              </p>
              <h1 className="mt-1 text-3xl font-black sm:text-4xl">
                {venue === "bar" ? "Bar & Bebidas" : "Menú del día"}
              </h1>

              {venue === "restaurant" && activeDailyMenu && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/60">
                  <strong className="text-white">{activeDailyMenu.name}</strong>
                  {activeDailyMenu.scheduleLabel && (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} style={{ color: accent }} />
                      {activeDailyMenu.scheduleLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {hasRestaurant && (
              <button
                onClick={() => setVenue("restaurant")}
                className="flex items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-black uppercase"
                style={
                  venue === "restaurant"
                    ? { backgroundColor: accent, borderColor: accent, color: INK }
                    : { borderColor: "rgba(255,255,255,.22)", color: "white" }
                }
              >
                <UtensilsCrossed size={14} /> Restaurante
              </button>
            )}
            {hasBar && (
              <button
                onClick={() => setVenue("bar")}
                className="flex items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-black uppercase"
                style={
                  venue === "bar"
                    ? { backgroundColor: accent, borderColor: accent, color: INK }
                    : { borderColor: "rgba(255,255,255,.22)", color: "white" }
                }
              >
                <Martini size={14} /> Bar
              </button>
            )}
          </div>

          {venue === "restaurant" && dailyMenus.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {dailyMenus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => setDailyMenuId(menu.id)}
                  className="shrink-0 rounded-full border px-4 py-2 text-[11px] font-black"
                  style={
                    activeDailyMenu?.id === menu.id
                      ? { backgroundColor: "white", borderColor: "white", color: INK }
                      : { borderColor: "rgba(255,255,255,.2)", color: "rgba(255,255,255,.7)" }
                  }
                >
                  {menu.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={venue === "bar" ? "Buscar bebida..." : "Buscar plato..."}
              className="w-full rounded-2xl border border-black/10 bg-[#FFFCF6] py-2.5 pl-9 pr-4 text-sm font-semibold outline-none"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto">
            {visibleCategories.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className="shrink-0 rounded-full border border-black/10 px-3 py-1.5 text-[10px] font-black uppercase text-black/55"
              >
                {cat.name}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {visibleCategories.length === 0 ? (
          <div className="rounded-3xl bg-white/70 p-10 text-center text-sm font-bold text-black/40">
            No hay opciones disponibles en este momento.
          </div>
        ) : (
          <div className="space-y-12">
            {visibleCategories.map((category) => (
              <section key={category.id} id={`cat-${category.id}`}>
                <div className="mb-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.24em]" style={{ color: accent }}>
                    {venue === "bar" ? "Nuestra selección" : "Menú del día"}
                  </p>
                  <h2 className="mt-1 text-2xl font-black">{category.name}</h2>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {category.menu_items.map((item) => {
                    const remaining = availability[item.id];
                    const soldOut = remaining === 0;
                    const hasOptions = item.menu_item_option_groups.length > 0;

                    return (
                      <article
                        key={item.id}
                        className="overflow-hidden rounded-3xl border border-black/[0.07] bg-white/85 shadow-[0_10px_25px_rgba(27,20,16,.04)]"
                      >
                        <div className="flex min-h-[150px]">
                          {item.image_url && (
                            <button
                              onClick={() => setActiveItem(item)}
                              className="relative w-32 shrink-0 overflow-hidden bg-black/5 sm:w-40"
                            >
                              <Image src={item.image_url} alt={item.name} fill sizes="160px" className="object-cover" />
                            </button>
                          )}

                          <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
                            <button onClick={() => setActiveItem(item)} className="text-left">
                              <div className="flex justify-between gap-3">
                                <h3 className="text-base font-black">{item.name}</h3>
                                <strong className="shrink-0" style={{ color: accent }}>
                                  ${item.price.toFixed(2)}
                                </strong>
                              </div>

                              {item.description && (
                                <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-5 text-black/45">
                                  {item.description}
                                </p>
                              )}

                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {hasOptions && (
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-500">
                                    Personalizable
                                  </span>
                                )}
                                {remaining !== null && remaining !== undefined && (
                                  <span
                                    className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                                      soldOut ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                                    }`}
                                  >
                                    {soldOut ? "Agotado" : `Quedan ${remaining}`}
                                  </span>
                                )}
                              </div>
                            </button>

                            <div className="mt-4">
                              {soldOut ? (
                                <span className="text-[10px] font-black uppercase text-black/35">
                                  No disponible
                                </span>
                              ) : (
                                <button
                                  onClick={() => (hasOptions ? setActiveItem(item) : addQuick(item))}
                                  className="rounded-full px-4 py-2 text-[10px] font-black uppercase"
                                  style={{ backgroundColor: accent, color: INK }}
                                >
                                  {hasOptions ? "Personalizar" : "Agregar"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {totalItems > 0 && !cartOpen && !editing && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black shadow-2xl"
          style={{ backgroundColor: accent, color: INK }}
        >
          <ShoppingBag size={17} /> Ver pedido ({totalItems})
        </button>
      )}

      {activeItem && !editing && (
        <MenuItemModal
          item={activeItem}
          accentColor={accent}
          onClose={() => setActiveItem(null)}
          onAdd={addFromModal}
        />
      )}

      {editing && (
        <MenuItemModal
          item={editing.item}
          initialLine={editing.line}
          accentColor={accent}
          onClose={() => {
            setEditing(null);
            setCartOpen(true);
          }}
          onAdd={saveEditedLine}
        />
      )}

      {cartOpen && !editing && (
        <MenuCartDrawer
          storeSlug={storeSlug}
          storeName={store.name}
          whatsappNumber={whatsappNumber}
          cart={cart}
          accentColor={accent}
          initialTableNumber={tableFromQr || undefined}
          onClose={() => setCartOpen(false)}
          onUpdateQuantity={(lineId, quantity) =>
            setCart((prev) =>
              prev.map((line) => (line.lineId === lineId ? { ...line, quantity } : line))
            )
          }
          onRemove={(lineId) =>
            setCart((prev) => prev.filter((line) => line.lineId !== lineId))
          }
          onEdit={editCartLine}
          onOrderSent={() => {
            setCart([]);
            setCartOpen(false);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[#19120E] px-4 py-2 text-xs font-black text-white shadow-xl">
          ✓ {toast}
        </div>
      )}
    </main>
  );
}
