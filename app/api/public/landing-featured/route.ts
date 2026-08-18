import { NextRequest, NextResponse } from "next/server";
import { getPublicMenu } from "@/lib/services/menu";
import { getMenuAvailabilityMap } from "@/lib/services/menu-availability-public";

export const maxDuration = 15;

export async function GET(request: NextRequest) {
  try {
    const slug = (new URL(request.url).searchParams.get("slug") || "deparis").trim().toLowerCase();
    const menu = await getPublicMenu(slug);
    if (!menu?.store || !menu.store.module_menu_enabled) return NextResponse.json({ dishes: [] });

    const activeRestaurantIds = new Set(menu.dailyMenus.flatMap((m) => m.itemIds));
    const availability = await getMenuAvailabilityMap(menu.store.id);

    const dishes = menu.categories.flatMap((category) =>
      category.menu_items
        .filter((item) => item.is_active && item.is_featured)
        .filter((item) => category.venue_type === "bar" || activeRestaurantIds.has(item.id))
        .map((item) => ({
          ...item,
          venue_type: category.venue_type,
          remaining: availability[item.id] === undefined ? null : availability[item.id],
        }))
    );

    return NextResponse.json({
      dishes,
      activeMenus: menu.dailyMenus.map((m) => ({
        id: m.id,
        name: m.name,
        scheduleLabel: m.scheduleLabel || null,
      })),
    });
  } catch (error) {
    console.error("GET /api/public/landing-featured error:", error);
    return NextResponse.json({ dishes: [], activeMenus: [] });
  }
}
