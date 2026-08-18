import { NextRequest, NextResponse } from "next/server";

import { getPublicMenu } from "@/lib/services/menu";
import { getMenuAvailabilityMap } from "@/lib/services/menu-availability-public";

export const maxDuration = 15;

export async function GET(request: NextRequest) {
  try {
    const slug = (
      new URL(request.url).searchParams.get("slug") || "deparis"
    )
      .trim()
      .toLowerCase();

    const menu = await getPublicMenu(slug);

    if (!menu?.store || !menu.store.module_menu_enabled) {
      return NextResponse.json({ dishes: [], activeMenus: [] });
    }

    const activeRestaurantIds = new Set(
      menu.dailyMenus.flatMap((dailyMenu) => dailyMenu.itemIds)
    );

    const availability = await getMenuAvailabilityMap(menu.store.id);

    const dishes = menu.categories.flatMap((category) =>
      category.menu_items
        .filter((item) => item.is_active && item.is_featured)
        .map((item) => {
          const isBar = category.venue_type === "bar";
          const availableByMenuNow =
            isBar || activeRestaurantIds.has(item.id);

          return {
            ...item,
            venue_type: category.venue_type,

            // IMPORTANTE:
            // Ya NO ocultamos los platos destacados fuera de horario.
            // Los seguimos enseñando como vitrina, pero la UI impide
            // agregarlos si su menú no está activo ahora.
            available_by_menu_now: availableByMenuNow,

            remaining:
              availability[item.id] === undefined
                ? null
                : availability[item.id],
          };
        })
    );

    return NextResponse.json({
      dishes,
      activeMenus: menu.dailyMenus.map((dailyMenu) => ({
        id: dailyMenu.id,
        name: dailyMenu.name,
        scheduleLabel: dailyMenu.scheduleLabel || null,
      })),
    });
  } catch (error) {
    console.error("GET /api/public/landing-featured error:", error);
    return NextResponse.json({ dishes: [], activeMenus: [] });
  }
}
