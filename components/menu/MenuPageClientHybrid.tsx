"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  Martini,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import MenuItemModal from "./MenuItemModal";
import MenuCartDrawer from "./MenuCartDrawer";
import { useSharedCart } from "@/lib/menu/useSharedCart";
import { getCartTotal } from "@/lib/menu/whatsapp-message";
import type {
  MenuCartLine,
  MenuCartSelectedOption,
  MenuCategory,
  MenuItem,
  PublicDailyMenu,
} from "@/lib/menu/types";
import { useDeParisLanguage } from "@/components/deparis-i18n/DeParisLanguageProvider";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

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

type EditingState = {
  item: MenuItem;
  line: MenuCartLine;
} | null;

const INK = "#1B1410";
const CREAM = "#FBF6EC";
const CARD = "#FFFDF8";
const DEFAULT_ACCENT = "#FF6B35";

function canUseInlineConfigurator(item: MenuItem) {
  const groups = item.menu_item_option_groups || [];
  if (groups.length === 0) return false;
  if (groups.length > 2) return false;

  const optionCount = groups.reduce(
    (sum, group) => sum + group.menu_item_options.length,
    0
  );

  return (
    optionCount <= 8 &&
    groups.every(
      (group) =>
        group.max_selections === 1 &&
        group.menu_item_options.length <= 5
    )
  );
}

function getDefaultSelections(item: MenuItem) {
  const result: Record<string, string> = {};

  for (const group of item.menu_item_option_groups) {
    const available = group.menu_item_options.filter(
      (option) => option.is_available !== false
    );

    if (group.is_required && available.length === 1) {
      result[group.id] = available[0].id;
    }
  }

  return result;
}

function QuickOrderCard({
  item,
  soldOut,
  remaining,
  accent,
  onOpen,
  onAdd,
}: {
  item: MenuItem;
  soldOut: boolean;
  remaining: number | null | undefined;
  accent: string;
  onOpen: () => void;
  onAdd: (line: MenuCartLine) => void;
}) {
  const simple = canUseInlineConfigurator(item);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string>>(
    () => getDefaultSelections(item)
  );

  const groups = item.menu_item_option_groups || [];

  const selectedOptions = useMemo(() => {
    const selected: MenuCartSelectedOption[] = [];

    for (const group of groups) {
      const optionId = selections[group.id];
      if (!optionId) continue;

      const option = group.menu_item_options.find(
        (candidate) => candidate.id === optionId
      );

      if (!option || option.is_available === false) continue;

      selected.push({
        group_id: group.id,
        group_name: group.name,
        option_id: option.id,
        option_label: option.label,
        price_delta: Number(option.price_delta) || 0,
      });
    }

    return selected;
  }, [groups, selections]);

  const requiredReady = groups.every(
    (group) => !group.is_required || Boolean(selections[group.id])
  );

  const unitPrice =
    item.price +
    selectedOptions.reduce(
      (sum, option) => sum + Number(option.price_delta || 0),
      0
    );

  const addInline = () => {
    if (!requiredReady || soldOut) return;

    onAdd({
      lineId: crypto.randomUUID(),
      menu_item_id: item.id,
      name: item.name,
      unit_base_price: item.price,
      quantity,
      selected_options: selectedOptions,
    });
  };

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-[#E6DED2] bg-white shadow-[0_6px_18px_rgba(40,28,20,.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(40,28,20,.08)] sm:rounded-[22px]">
      <button
        type="button"
        onClick={onOpen}
        className="relative block h-28 w-full shrink-0 overflow-hidden bg-[#F0E9DE] text-left min-[390px]:h-32 sm:h-48"
      >
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 420px"
            className="object-cover transition duration-500 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-[.18em] text-black/25">
            {item.name}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />

        {item.is_featured && (
          <span
            className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[7px] font-black uppercase shadow-sm sm:left-3 sm:top-3 sm:px-2.5 sm:text-[9px]"
            style={{ backgroundColor: accent, color: INK }}
          >
            <Sparkles size={10} /> Recomendado
          </span>
        )}

        {soldOut && (
          <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[7px] font-black uppercase text-white shadow-sm sm:right-3 sm:top-3 sm:px-3 sm:text-[9px]">
            Agotado
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-2.5 sm:block sm:p-4">
        <button type="button" onClick={onOpen} className="w-full text-left">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <h3 className="line-clamp-2 min-h-[2.25rem] text-[13px] font-black leading-[1.125rem] text-[#201611] sm:min-h-0 sm:text-[16px] sm:leading-tight">
              {item.name}
            </h3>

            <strong className="shrink-0 text-[14px] sm:text-[16px]" style={{ color: accent }}>
              ${item.price.toFixed(2)}
            </strong>
          </div>

          {item.description && (
            <p className="mt-1.5 hidden text-xs font-medium leading-5 text-black/45 sm:line-clamp-2">
              {item.description}
            </p>
          )}
        </button>

        {!soldOut && (
          <button
            type="button"
            onClick={() =>
              groups.length > 0
                ? onOpen()
                : onAdd({
                    lineId: crypto.randomUUID(),
                    menu_item_id: item.id,
                    name: item.name,
                    unit_base_price: item.price,
                    quantity: 1,
                    selected_options: [],
                  })
            }
            className="mt-auto flex w-full items-center justify-center rounded-xl px-2 py-2.5 text-[10px] font-black sm:hidden"
            style={{ backgroundColor: accent, color: "#fff" }}
          >
            {groups.length > 0 ? "Elegir opciones" : "Agregar"}
          </button>
        )}

        <div className="hidden sm:block">
        {remaining !== null &&
          remaining !== undefined &&
          !soldOut &&
          remaining <= 5 && (
            <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-amber-700">
              Quedan {remaining}
            </p>
          )}

        {!soldOut && simple && (
          <div className="mt-4 space-y-2.5">
            {groups.map((group) => {
              const available = group.menu_item_options.filter(
                (option) => option.is_available !== false
              );

              return (
                <label key={group.id} className="block">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wide text-black/45">
                      {group.name}
                    </span>
                    {group.is_required ? (
                      <span className="text-[9px] font-black uppercase text-orange-600">
                        Requerido
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase text-black/30">
                        Opcional
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      value={selections[group.id] || ""}
                      onChange={(event) =>
                        setSelections((prev) => ({
                          ...prev,
                          [group.id]: event.target.value,
                        }))
                      }
                      className="w-full appearance-none rounded-xl border border-[#DDD4C8] bg-[#F8F4EE] px-3 py-2.5 pr-9 text-xs font-bold text-[#201611] outline-none focus:border-orange-300"
                    >
                      <option value="">
                        {group.is_required
                          ? `Elige ${group.name.toLowerCase()}`
                          : `${group.name} (opcional)`}
                      </option>

                      {available.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                          {Number(option.price_delta) > 0
                            ? ` (+$${Number(option.price_delta).toFixed(2)})`
                            : ""}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/45"
                    />
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {!soldOut && !simple && groups.length > 0 && (
          <button
            type="button"
            onClick={onOpen}
            className="mt-3 inline-flex items-center rounded-full bg-[#F4EEE6] px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-black/50"
          >
            Personalizable · {groups.length}{" "}
            {groups.length === 1 ? "grupo" : "grupos"}
          </button>
        )}

        {!soldOut && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex shrink-0 items-center rounded-full border border-[#DDD4C8] bg-[#F8F4EE] p-1">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full text-black/55 hover:bg-white"
                aria-label="Quitar uno"
              >
                <Minus size={13} />
              </button>

              <span className="w-7 text-center text-xs font-black">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => setQuantity((value) => value + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-black/55 hover:bg-white"
                aria-label="Agregar uno"
              >
                <Plus size={13} />
              </button>
            </div>

            {groups.length === 0 ? (
              <button
                type="button"
                onClick={() =>
                  onAdd({
                    lineId: crypto.randomUUID(),
                    menu_item_id: item.id,
                    name: item.name,
                    unit_base_price: item.price,
                    quantity,
                    selected_options: [],
                  })
                }
                className="flex flex-1 items-center justify-center rounded-full px-4 py-2.5 text-xs font-black"
                style={{ backgroundColor: accent, color: "#fff" }}
              >
                Agregar · ${(item.price * quantity).toFixed(2)}
              </button>
            ) : simple ? (
              <button
                type="button"
                onClick={addInline}
                disabled={!requiredReady}
                className="flex flex-1 items-center justify-center rounded-full px-4 py-2.5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: accent, color: "#fff" }}
              >
                Agregar · ${(unitPrice * quantity).toFixed(2)}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpen}
                className="flex flex-1 items-center justify-center rounded-full px-4 py-2.5 text-xs font-black"
                style={{ backgroundColor: accent, color: "#fff" }}
              >
                Personalizar
              </button>
            )}
          </div>
        )}

        {soldOut && (
          <div className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wide text-red-600">
            No disponible en este momento
          </div>
        )}
        </div>

        {soldOut && (
          <div className="mt-auto rounded-lg bg-red-50 px-2 py-2 text-center text-[8px] font-black uppercase text-red-600 sm:hidden">
            No disponible
          </div>
        )}
      </div>
    </article>
  );
}

export default function MenuPageClientHybrid({
  store,
  categories: sourceCategories,
  dailyMenus,
  whatsappNumber,
  landingHref,
  storeSlug,
}: Props) {
  const { locale } = useDeParisLanguage();
  const params = useSearchParams();
  const accent = store.primary_color || DEFAULT_ACCENT;

  const categories = useMemo(
    () => sourceCategories.map((category) => ({
      ...category,
      menu_items: category.menu_items.map((item) => ({
        ...item,
        name: locale === "en" && item.name_en?.trim() ? item.name_en : item.name,
        description: locale === "en" && item.description_en?.trim() ? item.description_en : item.description,
      })),
    })),
    [locale, sourceCategories]
  );

  const availableCategories = useMemo(
    () => categories.filter((category) => category.menu_items.length > 0),
    [categories]
  );

  const allItems = useMemo(
    () => availableCategories.flatMap((category) => category.menu_items),
    [availableCategories]
  );

  const hasRestaurant = availableCategories.some(
    (category) => category.venue_type !== "bar"
  );
  const hasBar = availableCategories.some(
    (category) =>
      category.venue_type === "bar" || category.venue_type === "general"
  );

  const [venue, setVenue] = useState<VenueFilter>(
    params.get("tipo") === "bar"
      ? "bar"
      : hasRestaurant
      ? "restaurant"
      : "bar"
  );
  const [dailyMenuId, setDailyMenuId] = useState<string | null>(
    dailyMenus[0]?.id || null
  );
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [editing, setEditing] = useState<EditingState>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<
    Record<string, number | null>
  >({});
  const [toast, setToast] = useState<string | null>(null);
  const categoriesAnchorRef = useRef<HTMLDivElement | null>(null);
  const [categoriesPinned, setCategoriesPinned] = useState(false);

  const { cart, setCart } = useSharedCart(storeSlug);

  useEffect(() => {
    fetch(
      `/api/public/menu-availability?slug=${encodeURIComponent(storeSlug)}`
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.availability) setAvailability(data.availability);
      })
      .catch(() => {});
  }, [storeSlug]);

  useEffect(() => {
    let frame = 0;

    const updatePinnedCategories = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const anchor = categoriesAnchorRef.current;
        if (!anchor) return;
        setCategoriesPinned(anchor.getBoundingClientRect().top <= 0);
      });
    };

    updatePinnedCategories();
    window.addEventListener("scroll", updatePinnedCategories, { passive: true });
    window.addEventListener("resize", updatePinnedCategories);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updatePinnedCategories);
      window.removeEventListener("resize", updatePinnedCategories);
    };
  }, []);

  const activeDailyMenu =
    dailyMenus.find((menu) => menu.id === dailyMenuId) ||
    dailyMenus[0] ||
    null;

  const dailyIds =
    venue === "restaurant" && activeDailyMenu
      ? new Set(activeDailyMenu.itemIds)
      : null;

  const q = search.trim().toLowerCase();

  const visibleCategories = availableCategories
    .filter(
      (category) =>
        category.venue_type === "general" || category.venue_type === venue
    )
    .map((category) => ({
      ...category,
      menu_items: category.menu_items.filter((item) => {
        if (dailyIds && !dailyIds.has(item.id)) return false;

        if (
          q &&
          !`${item.name} ${item.description || ""}`
            .toLowerCase()
            .includes(q)
        ) {
          return false;
        }

        return true;
      }),
    }))
    .filter((category) => category.menu_items.length > 0);

  const totalItems = cart.reduce(
    (sum, line) => sum + line.quantity,
    0
  );
  const cartTotal = getCartTotal(cart);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 1400);
  };

  const addLine = (line: MenuCartLine) => {
    setCart((prev) => [...prev, line]);
    trackAnalyticsEvent({
      storeId: store.id,
      eventName: "add_to_cart",
      menuItemId: line.menu_item_id,
      itemName: line.name,
      quantity: line.quantity,
      value: line.unit_base_price * line.quantity,
    });
    showToast(`${line.name} agregado`);
  };

  useEffect(() => {
    if (!activeItem) return;
    trackAnalyticsEvent({
      storeId: store.id,
      eventName: "menu_item_view",
      menuItemId: activeItem.id,
      itemName: activeItem.name,
      value: activeItem.price,
    });
  }, [activeItem, store.id]);

  const saveEditedLine = (line: MenuCartLine) => {
    setCart((prev) =>
      prev.map((current) =>
        current.lineId === line.lineId ? line : current
      )
    );
    setEditing(null);
    setCartOpen(true);
    showToast(`${line.name} actualizado`);
  };

  const editCartLine = (line: MenuCartLine) => {
    const item = allItems.find(
      (candidate) => candidate.id === line.menu_item_id
    );
    if (!item) return;

    setCartOpen(false);
    setEditing({ item, line });
  };

  const handleSuggestion = (itemId: string) => {
    const item = allItems.find(
      (candidate) => candidate.id === itemId
    );
    if (!item) return;

    if (item.menu_item_option_groups.length > 0) {
      setCartOpen(false);
      setActiveItem(item);
      return;
    }

    addLine({
      lineId: crypto.randomUUID(),
      menu_item_id: item.id,
      name: item.name,
      unit_base_price: item.price,
      quantity: 1,
      selected_options: [],
    });
  };

  return (
    <main
      className="min-h-screen pb-28 text-[#201611]"
      style={{ backgroundColor: CREAM }}
    >
      <header className="relative overflow-hidden bg-[#17100C] text-white">
        <div className="absolute inset-0 opacity-[.035] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="relative mx-auto max-w-6xl px-4 pb-7 pt-4 sm:px-6">
          <div className="flex items-center justify-between">
            {landingHref ? (
              <Link
                href={landingHref}
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-white/50 transition hover:text-white"
              >
                <ArrowLeft size={13} /> Volver
              </Link>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[.04]"
            >
              <ShoppingBag size={16} />
              {totalItems > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-black text-white"
                  style={{ backgroundColor: accent }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          <div className="mt-5 flex items-center gap-4">
            {store.logo_url && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white shadow-lg sm:h-20 sm:w-20">
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  fill
                  className="object-contain p-1"
                />
              </div>
            )}

            <div className="min-w-0">
              <p
                className="text-[9px] font-black uppercase tracking-[.28em]"
                style={{ color: accent }}
              >
                {store.name}
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                {venue === "bar" ? "Bar & Bebidas" : "Menú del día"}
              </h1>

              {venue === "restaurant" && activeDailyMenu && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black text-white">
                    {activeDailyMenu.name}
                  </span>

                  {activeDailyMenu.scheduleLabel && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white/55">
                      <Clock3 size={11} style={{ color: accent }} />
                      {activeDailyMenu.scheduleLabel}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400">
                    <Check size={10} /> Disponible ahora
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {hasRestaurant && (
              <button
                type="button"
                onClick={() => setVenue("restaurant")}
                className="flex items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-black uppercase transition"
                style={
                  venue === "restaurant"
                    ? {
                        backgroundColor: accent,
                        borderColor: accent,
                        color: "#fff",
                      }
                    : {
                        borderColor: "rgba(255,255,255,.18)",
                        color: "rgba(255,255,255,.72)",
                      }
                }
              >
                <UtensilsCrossed size={14} /> Restaurante
              </button>
            )}

            {hasBar && (
              <button
                type="button"
                onClick={() => setVenue("bar")}
                className="flex items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-black uppercase transition"
                style={
                  venue === "bar"
                    ? {
                        backgroundColor: accent,
                        borderColor: accent,
                        color: "#fff",
                      }
                    : {
                        borderColor: "rgba(255,255,255,.18)",
                        color: "rgba(255,255,255,.72)",
                      }
                }
              >
                <Martini size={14} /> Bar
              </button>
            )}
          </div>

          {venue === "restaurant" && dailyMenus.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {dailyMenus.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => setDailyMenuId(menu.id)}
                  className="shrink-0 rounded-full border px-4 py-2 text-[10px] font-black"
                  style={
                    activeDailyMenu?.id === menu.id
                      ? {
                          backgroundColor: "white",
                          borderColor: "white",
                          color: INK,
                        }
                      : {
                          borderColor: "rgba(255,255,255,.16)",
                          color: "rgba(255,255,255,.55)",
                        }
                  }
                >
                  {menu.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="border-b border-[#E9E0D4] bg-[#FBF6EC]">
        <div className="mx-auto max-w-6xl px-4 pb-3 pt-4 sm:px-6">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                venue === "bar" ? "Buscar bebida..." : "Buscar plato..."
              }
              className="w-full rounded-2xl border border-[#DDD4C8] bg-white py-3 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-orange-300"
            />
          </div>
        </div>
      </div>

      <div ref={categoriesAnchorRef} className="h-px w-full" aria-hidden="true" />
      {categoriesPinned && <div className="h-[53px] w-full" aria-hidden="true" />}
      <div
        className={`${
          categoriesPinned ? "fixed inset-x-0 top-0" : "relative"
        } z-50 w-full border-b border-[#E9E0D4] bg-[#FBF6EC] shadow-[0_4px_14px_rgba(32,22,17,.08)] [transform:translateZ(0)]`}
      >
        <nav className="flex w-full gap-2 overflow-x-auto overscroll-x-contain px-4 py-2.5 [-webkit-overflow-scrolling:touch] sm:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]">
            {visibleCategories.map((category) => (
              <a
                key={category.id}
                href={`#cat-${category.id}`}
                className="shrink-0 scroll-ml-4 rounded-full border border-[#DDD4C8] bg-white px-3.5 py-2 text-[9px] font-black uppercase tracking-wide text-black/55 active:border-orange-300 active:bg-orange-50"
              >
                {category.name}
              </a>
            ))}
        </nav>
      </div>

      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-10">
        {visibleCategories.length === 0 ? (
          <div className="rounded-3xl border border-[#E4DBCE] bg-white p-10 text-center">
            <p className="text-sm font-bold text-black/40">
              No hay opciones disponibles en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-9 sm:space-y-12">
            {visibleCategories.map((category) => (
              <section
                key={category.id}
                id={`cat-${category.id}`}
                className="scroll-mt-16"
              >
                <div className="mb-3 flex items-end justify-between gap-3 sm:mb-5">
                  <div>
                    <p
                      className="text-[9px] font-black uppercase tracking-[.24em]"
                      style={{ color: accent }}
                    >
                      {venue === "bar"
                        ? "Selección del bar"
                        : activeDailyMenu?.name || "Menú del día"}
                    </p>

                    <h2 className="mt-1 text-xl font-black tracking-tight text-[#201611] sm:text-2xl">
                      {category.name}
                    </h2>
                  </div>

                  <span className="text-[10px] font-bold text-black/30">
                    {category.menu_items.length}{" "}
                    {category.menu_items.length === 1 ? "opción" : "opciones"}
                  </span>
                </div>

                <div className="grid grid-cols-2 items-stretch gap-2.5 sm:gap-4 lg:grid-cols-3">
                  {category.menu_items.map((item) => {
                    const remaining = availability[item.id];
                    const soldOut = remaining === 0;

                    return (
                      <QuickOrderCard
                        key={item.id}
                        item={item}
                        soldOut={soldOut}
                        remaining={remaining}
                        accent={accent}
                        onOpen={() => setActiveItem(item)}
                        onAdd={addLine}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {totalItems > 0 && !cartOpen && !editing && !activeItem && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-5 sm:pb-5">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-xl items-center justify-between rounded-2xl px-4 py-3.5 text-white shadow-[0_14px_38px_rgba(0,0,0,.25)]"
            style={{ backgroundColor: accent }}
          >
            <span className="flex items-center gap-3">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white/20 px-2 text-xs font-black">
                {totalItems}
              </span>
              <span className="text-left">
                <span className="block text-[10px] font-black uppercase tracking-wide text-white/70">
                  Tu pedido
                </span>
                <strong className="text-sm">Ver pedido</strong>
              </span>
            </span>

            <strong className="text-lg">${cartTotal.toFixed(2)}</strong>
          </button>
        </div>
      )}

      {activeItem && !editing && (
        <MenuItemModal
          item={activeItem}
          accentColor={accent}
          onClose={() => setActiveItem(null)}
          onAdd={(line) => {
            addLine(line);
            setActiveItem(null);
          }}
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
          storeId={store.id}
          storeSlug={storeSlug}
          storeName={store.name}
          whatsappNumber={whatsappNumber}
          cart={cart}
          accentColor={accent}
          onClose={() => setCartOpen(false)}
          onUpdateQuantity={(lineId, quantity) =>
            setCart((prev) =>
              prev.map((line) =>
                line.lineId === lineId ? { ...line, quantity } : line
              )
            )
          }
          onRemove={(lineId) =>
            setCart((prev) =>
              prev.filter((line) => line.lineId !== lineId)
            )
          }
          onEdit={editCartLine}
          onSuggestion={handleSuggestion}
          onOrderSent={() => {
            setCart([]);
            setCartOpen(false);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[#17100C] px-4 py-2.5 text-xs font-black text-white shadow-xl">
          ✓ {toast}
        </div>
      )}
    </main>
  );
}
