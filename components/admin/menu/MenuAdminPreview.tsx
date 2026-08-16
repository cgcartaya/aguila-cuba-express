"use client";

import { Clock3, Smartphone } from "lucide-react";
import { getRestaurantNow, isMenuScheduleActive } from "@/lib/menu/daytime";
import type { DailyMenu, EligibleDailyMenuItem } from "@/lib/menu/types";

type Props = {
  menus: DailyMenu[];
  memberMap: Record<string, string[]>;
  items: EligibleDailyMenuItem[];
  timeZone: string;
};

export default function MenuAdminPreview({ menus, memberMap, items, timeZone }: Props) {
  const now = getRestaurantNow(timeZone);

  const activeMenus = menus.filter((menu) => {
    const rules = menu.menu_daily_menu_schedules || [];
    if (!menu.is_active) return false;
    if (rules.length === 0) return true;
    return rules.some(
      (rule) =>
        rule.is_active &&
        isMenuScheduleActive({
          weekdays: rule.weekdays,
          startTime: rule.start_time,
          endTime: rule.end_time,
          now,
        })
    );
  });

  const itemById = new Map(items.map((item) => [item.id, item]));

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Clock3 size={18} className="text-violet-600" />
          <div>
            <h2 className="text-base font-black text-slate-900">Qué está activo ahora</h2>
            <p className="text-xs font-semibold text-slate-400">
              {now.date} · {now.time} · {timeZone}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {activeMenus.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-400">
              No hay ningún menú activo para este momento.
            </p>
          ) : (
            activeMenus.map((menu) => (
              <div key={menu.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-black text-slate-900">{menu.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {(memberMap[menu.id] || []).length} platos asignados
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-[32px] border-[8px] border-slate-900 bg-slate-900 p-2 shadow-2xl">
        <div className="min-h-[560px] rounded-[24px] bg-[#FAF6EF] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900">DeParis</span>
            <Smartphone size={16} className="text-slate-400" />
          </div>

          <h3 className="mt-5 text-2xl font-black text-slate-900">La Carta</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Vista previa según la hora actual.
          </p>

          <div className="mt-4 flex gap-2 overflow-x-auto">
            {activeMenus.map((menu) => (
              <span key={menu.id} className="shrink-0 rounded-full bg-orange-500 px-3 py-1.5 text-[10px] font-black text-white">
                {menu.name}
              </span>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {activeMenus.flatMap((menu) =>
              (memberMap[menu.id] || []).slice(0, 3).map((id) => {
                const item = itemById.get(id);
                if (!item) return null;
                return (
                  <div key={`${menu.id}-${id}`} className="rounded-2xl bg-white p-3 shadow-sm">
                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs font-bold text-orange-600">${item.price.toFixed(2)}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
