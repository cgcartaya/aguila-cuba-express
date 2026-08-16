"use client";

import { Clock3 } from "lucide-react";
import { WEEKDAY_LABELS } from "@/lib/menu/daytime";
import type { DailyMenu } from "@/lib/menu/types";

type Props = {
  menus: DailyMenu[];
};

const hourToPercent = (value?: string | null) => {
  if (!value) return 8;
  const [h, m] = value.slice(0, 5).split(":").map(Number);
  return ((h + m / 60) / 24) * 100;
};

const durationToPercent = (start?: string | null, end?: string | null) => {
  if (!start || !end) return 12;
  const [sh, sm] = start.slice(0, 5).split(":").map(Number);
  const [eh, em] = end.slice(0, 5).split(":").map(Number);
  const s = sh + sm / 60;
  let e = eh + em / 60;
  if (e <= s) e += 24;
  return Math.max(6, ((e - s) / 24) * 100);
};

export default function WeeklyMenuCalendar({ menus }: Props) {
  const rules = menus.flatMap((menu) =>
    (menu.menu_daily_menu_schedules || []).map((rule) => ({
      ...rule,
      menuName: menu.name,
    }))
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Clock3 size={18} className="text-violet-600" />
        <div>
          <h2 className="text-base font-black text-slate-900">Calendario semanal</h2>
          <p className="text-xs font-semibold text-slate-400">
            Vista rápida de todos tus menús y horarios.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 overflow-x-auto">
        {WEEKDAY_LABELS.map((label, day) => (
          <div key={label} className="min-w-[120px]">
            <div className="mb-2 rounded-xl bg-slate-50 px-2 py-2 text-center text-xs font-black text-slate-500">
              {label}
            </div>
            <div className="relative h-[460px] overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/40">
              {[6, 9, 12, 15, 18, 21].map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-dashed border-slate-200"
                  style={{ top: `${(hour / 24) * 100}%` }}
                >
                  <span className="absolute left-1 top-0 -translate-y-1/2 bg-white/80 px-1 text-[8px] font-bold text-slate-300">
                    {hour}:00
                  </span>
                </div>
              ))}

              {rules
                .filter((rule) => rule.is_active && rule.weekdays.includes(day))
                .map((rule) => (
                  <div
                    key={rule.id}
                    className="absolute left-2 right-2 overflow-hidden rounded-xl border border-violet-200 bg-violet-100/90 px-2 py-1.5 shadow-sm"
                    style={{
                      top: `${hourToPercent(rule.start_time)}%`,
                      height: `${durationToPercent(rule.start_time, rule.end_time)}%`,
                    }}
                  >
                    <p className="truncate text-[10px] font-black text-violet-900">{rule.menuName}</p>
                    <p className="truncate text-[9px] font-bold text-violet-600">
                      {rule.start_time?.slice(0, 5) || "Todo el día"}{" "}
                      {rule.end_time ? `– ${rule.end_time.slice(0, 5)}` : ""}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
