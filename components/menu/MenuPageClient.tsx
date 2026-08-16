"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Bodoni_Moda, Manrope } from "next/font/google";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Clock3, ShoppingBag, Sparkles } from "lucide-react";

import MenuItemModal from "./MenuItemModal";
import MenuCartDrawer from "./MenuCartDrawer";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { useSharedCart } from "@/lib/menu/useSharedCart";
import type { MenuCartLine, MenuCategory, MenuItem, PublicDailyMenu } from "@/lib/menu/types";

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
  dailyMenus: PublicDailyMenu[];
  whatsappNumber: string | null;
  landingHref?: string;
  // Slug de la tienda — clave del carrito compartido con la landing
  // (localStorage) y de la marca de agua "Mesa N" cuando se llega
  // desde un código QR de mesa.
  storeSlug: string;
};

// Paleta elegante de "carta impresa" por defecto — cualquier tienda
// se ve bien sin configurar nada. primary_color/secondary_color (ya
// existentes en cada tienda) permiten afinar el acento y el fondo a
// la marca real del negocio, sin tocar código.
const DEFAULT_ACCENT = "#B45309";
const DEFAULT_BG = "#FAF6EF";
const INK = "#1B1410";

type VenueFilter = "bar" | "restaurant";

export default function MenuPageClient({ store, categories, dailyMenus, whatsappNumber, landingHref, storeSlug }: Props) {
  const accent = store.primary_color || DEFAULT_ACCENT;
  const bg = store.secondary_color || DEFAULT_BG;

  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [photoItem, setPhotoItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  // Carrito compartido (localStorage) con la landing: si el cliente ya
  // agregó productos desde la vitrina de la landing, aparecen acá
  // listos para completar el pedido — y viceversa.
  const { cart, setCart } = useSharedCart(storeSlug);
  const [orderSentMessage, setOrderSentMessage] = useState(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  // Disponibilidad en tiempo real (cupo diario + inventario
  // permanente combinados) — undefined mientras carga, null en el
  // mapa = ese platillo no tiene restricción y se puede pedir libre.
  const [availability, setAvailability] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/menu-availability?slug=${encodeURIComponent(storeSlug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.availability) setAvailability(data.availability);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storeSlug]);

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

  // Permite llegar directo a la pestaña Bar desde otra página (ej. el
  // botón "Bebidas principales" de la landing) con /menu/slug?tipo=bar.
  // Si el parámetro no viene o no es válido, se queda en "restaurant"
  // como hasta ahora.
  //
  // ?mesa=N es el mismo mecanismo pero para los códigos QR físicos que
  // se dejan en cada mesa (muy común en bares/restaurantes de Cuba):
  // al escanear, el cliente llega directo a la carta con el pedido ya
  // marcado "En el restaurante" y el número de mesa pre-llenado, sin
  // tener que escribirlo a mano.
  const searchParams = useSearchParams();
  const initialVenueFilter: VenueFilter = searchParams.get("tipo") === "bar" ? "bar" : "restaurant";
  const [venueFilter, setVenueFilter] = useState<VenueFilter>(initialVenueFilter);
  const tableNumberFromQr = searchParams.get("mesa")?.trim() || null;

  const visibleCategories = showVenueTabs
    ? categoriesWithItems.filter(
        (cat) => cat.venue_type === "general" || cat.venue_type === venueFilter
      )
    : categoriesWithItems;

  // Filtro de Menú del día (Almuerzo/Cena...) — independiente del de
  // Bar/Restaurante, se pueden combinar. "Todo" no filtra nada.
  const [dailyMenuFilter, setDailyMenuFilter] = useState<string | null>(null);
  const activeDailyMenuItemIds =
    dailyMenuFilter ? dailyMenus.find((m) => m.id === dailyMenuFilter)?.itemIds ?? [] : null;

  const dailyFilteredCategories = activeDailyMenuItemIds
    ? visibleCategories
        .map((cat) => ({
          ...cat,
          menu_items: cat.menu_items.filter((item) => activeDailyMenuItemIds.includes(item.id)),
        }))
        .filter((cat) => cat.menu_items.length > 0)
    : visibleCategories;

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
  }, [dailyFilteredCategories]);

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
      <header className="relative overflow-hidden" style={{ backgroundColor: INK }}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#FFF4E6_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full blur-[110px]" style={{ backgroundColor: accent, opacity: 0.22 }} />

        <div className="relative mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          {landingHref ? (
            <Link href={landingHref} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-white/65 transition hover:text-white">
              <ArrowLeft size={15} /> Volver a De Paris
            </Link>
          ) : <span />}
          <div className="flex items-center gap-2">
            {tableNumberFromQr && (
              <span
                className="rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide"
                style={{ borderColor: accent, color: accent }}
              >
                Mesa {tableNumberFromQr}
              </span>
            )}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
              aria-label={`Abrir pedido con ${totalItems} productos`}
            >
              <ShoppingBag size={17} />
              {totalItems > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black" style={{ backgroundColor: accent, color: INK }}>{totalItems}</span>}
            </button>
          </div>
        </div>

        <div className="relative mx-auto grid max-w-5xl items-end gap-7 px-5 pb-9 pt-5 md:grid-cols-[1fr_auto] md:pb-12 md:pt-8">
          <div className="flex items-center gap-5 md:gap-7">
          {store.logo_url ? (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/5 shadow-2xl md:h-24 md:w-24">
              <Image src={store.logo_url} alt={store.name} fill className="object-cover" />
            </div>
          ) : (
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border text-lg md:h-24 md:w-24"
              style={{ borderColor: accent, color: accent, fontFamily: "var(--menu-font-display)" }}
            >
              {store.name.slice(0, 2).toUpperCase()}
            </div>
          )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>{store.name}</p>
              <h1 className="mt-1 text-4xl leading-none text-white md:text-6xl" style={{ fontFamily: "var(--menu-font-display)", fontWeight: 600 }}>La Carta</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/55">Elige tus favoritos, personalízalos y envía tu pedido directamente por WhatsApp.</p>
            </div>
          </div>
          <div className="flex gap-4 text-[11px] font-bold uppercase tracking-wide text-white/55 md:pb-1">
            <span className="inline-flex items-center gap-1.5"><Sparkles size={14} style={{ color: accent }} /> Hecho al momento</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 size={14} style={{ color: accent }} /> Pedido rápido</span>
          </div>
        </div>

        {showVenueTabs && (
          <div className="relative mx-auto flex max-w-5xl gap-2 px-5 pb-5">
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

        {dailyMenus.length > 0 && (
          <div className="scrollbar-none relative mx-auto flex max-w-5xl gap-2 overflow-x-auto px-5 pb-5">
            <button
              onClick={() => setDailyMenuFilter(null)}
              className="shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition"
              style={
                dailyMenuFilter === null
                  ? { backgroundColor: accent, borderColor: accent, color: INK }
                  : { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.25)", color: "#FFF4E6" }
              }
            >
              Todo
            </button>
            {dailyMenus.map((menu) => (
              <button
                key={menu.id}
                onClick={() => setDailyMenuFilter(menu.id)}
                className="shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition"
                style={
                  dailyMenuFilter === menu.id
                    ? { backgroundColor: accent, borderColor: accent, color: INK }
                    : { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.25)", color: "#FFF4E6" }
                }
              >
                {menu.name}
              </button>
            ))}
          </div>
        )}

      </header>

      {dailyFilteredCategories.length > 0 && (
          <nav className="scrollbar-none sticky top-0 z-30 mx-auto flex max-w-5xl gap-2 overflow-x-auto border-b border-[#1B1410]/10 bg-[#FAF6EF]/90 px-5 py-3 shadow-[0_8px_24px_rgba(27,20,16,0.06)] backdrop-blur-xl" style={{ backgroundColor: `${bg}F2` }}>
            {dailyFilteredCategories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              return (
                <a
                  key={cat.id}
                  href={`#cat-${cat.id}`}
                  className="shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition"
                  style={
                    isActive
                      ? { backgroundColor: accent, borderColor: accent, color: INK }
                      : { borderColor: "rgba(27,20,16,0.12)", color: "rgba(27,20,16,0.62)" }
                  }
                >
                  {cat.name}
                </a>
              );
            })}
          </nav>
      )}

      <div className="mx-auto max-w-5xl px-5 py-10 md:py-14">
        {dailyFilteredCategories.length === 0 ? (
          <div className="rounded-2xl bg-white/70 p-10 text-center shadow-sm">
            <p className="text-sm font-semibold" style={{ color: INK, opacity: 0.6 }}>
              {dailyMenuFilter ? "Este menú no tiene platillos disponibles ahora mismo." : "Este menú todavía no tiene platillos publicados."}
            </p>
          </div>
        ) : (
          <div className="space-y-14">
            {dailyFilteredCategories.map((category) => (
              <section
                key={category.id}
                id={`cat-${category.id}`}
                ref={(el) => {
                  sectionRefs.current[category.id] = el;
                }}
              >
                <div className="flex items-end justify-between gap-4 border-b border-[#1B1410]/10 pb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>Selección De Paris</p>
                    <h2 className="mt-1 text-3xl text-[#1B1410]" style={{ fontFamily: "var(--menu-font-display)", fontWeight: 600 }}>{category.name}</h2>
                  </div>
                  <span className="text-xs font-semibold text-[#1B1410]/40">{category.menu_items.length} opciones</span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {category.menu_items.map((item) => (
                    <article key={item.id} className="group flex min-h-[124px] items-stretch overflow-hidden rounded-2xl border border-[#1B1410]/10 bg-white/55 shadow-[0_12px_30px_rgba(27,20,16,0.04)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_34px_rgba(27,20,16,0.08)]">
                      {item.image_url && (
                        <button
                          onClick={() => setPhotoItem(item)}
                          aria-label={`Ver foto de ${item.name}`}
                          className="relative w-28 shrink-0 overflow-hidden bg-black/5 sm:w-32"
                        >
                          <Image
                            src={item.image_url}
                            alt=""
                            fill
                            loading="lazy"
                            sizes="128px"
                            className="object-cover transition duration-500 group-hover:scale-105"
                          />
                        </button>
                      )}

                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-4">
                        <button onClick={() => setActiveItem(item)} className="text-left">
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className="text-lg leading-tight"
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
                            className="shrink-0 text-lg"
                            style={{
                              fontFamily: "var(--menu-font-display)",
                              fontWeight: 700,
                              color: accent,
                            }}
                          >
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                        {(() => {
                          const remaining = availability[item.id];
                          if (remaining === undefined || remaining === null) return null;
                          return (
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                remaining === 0
                                  ? "bg-red-100 text-red-600"
                                  : remaining <= 5
                                  ? "bg-amber-100 text-amber-700"
                                  : "text-[#1B1410]/40"
                              }`}
                            >
                              {remaining === 0 ? "Agotado por hoy" : `Quedan ${remaining}`}
                            </span>
                          );
                        })()}
                        {item.description && (
                          <p
                            className="mt-1 text-[13px] italic"
                            style={{ color: INK, opacity: 0.55 }}
                          >
                            {item.description}
                          </p>
                        )}
                        </button>

                        <div className="flex items-center justify-between gap-3">
                      {(() => {
                        const remaining = availability[item.id];
                        const soldOut = remaining === 0;
                        if (soldOut) {
                          return (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#1B1410]/35">
                              No disponible
                            </span>
                          );
                        }
                        return isQuickAddable(item) ? (
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
                          className="shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
                          style={{ borderColor: accent, color: accent }}
                        >
                          Elegir
                        </button>
                      );
                      })()}
                          <button onClick={() => setActiveItem(item)} className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#1B1410]/45 transition hover:text-[#1B1410]">Detalles <ChevronRight size={13} /></button>
                        </div>
                      </div>
                    </article>
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

      {photoItem?.image_url && (
        <ImageLightbox
          src={photoItem.image_url}
          alt={photoItem.name}
          onClose={() => setPhotoItem(null)}
        />
      )}

      {cartOpen && (
        <MenuCartDrawer
          storeSlug={storeSlug}
          storeName={store.name}
          whatsappNumber={whatsappNumber}
          cart={cart}
          accentColor={accent}
          initialTableNumber={tableNumberFromQr || undefined}
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
          Pedido registrado. En breve {store.name} te confirma.
          <button className="ml-3 underline" onClick={() => setOrderSentMessage(false)}>
            Cerrar
          </button>
        </div>
      )}
    </main>
  );
}
