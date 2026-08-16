export const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

export type ZonedRestaurantNow = {
  date: string;      // YYYY-MM-DD
  weekday: number;   // 0=domingo ... 6=sábado
  time: string;      // HH:mm
};

export function normalizeMenuTimeZone(value?: string | null) {
  const candidate = value?.trim() || "America/Havana";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "America/Havana";
  }
}

export function getRestaurantNow(
  timeZone: string,
  now = new Date()
): ZonedRestaurantNow {
  const tz = normalizeMenuTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value || "";

  const weekdayText = get("weekday").toLowerCase();
  const weekdayMap: Record<string, number> = {
    sun: 0, dom: 0,
    mon: 1, lun: 1,
    tue: 2, mar: 2,
    wed: 3, mié: 3, mie: 3,
    thu: 4, jue: 4,
    fri: 5, vie: 5,
    sat: 6, sáb: 6, sab: 6,
  };

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: weekdayMap[weekdayText] ?? now.getDay(),
    time: `${get("hour")}:${get("minute")}`,
  };
}

export function isMenuScheduleActive(args: {
  weekdays?: number[] | null;
  startTime?: string | null;
  endTime?: string | null;
  now: ZonedRestaurantNow;
}) {
  const weekdays = args.weekdays?.length ? args.weekdays : null;
  if (weekdays && !weekdays.includes(args.now.weekday)) return false;

  const start = args.startTime?.slice(0, 5) || null;
  const end = args.endTime?.slice(0, 5) || null;
  if (!start || !end) return true;

  const current = args.now.time;

  // Horario normal: 11:00 -> 15:00
  if (start <= end) return current >= start && current < end;

  // Cruza medianoche: 18:00 -> 02:00
  return current >= start || current < end;
}

export function scheduleLabel(
  weekdays?: number[] | null,
  startTime?: string | null,
  endTime?: string | null
) {
  const dayText =
    weekdays?.length === 7 || !weekdays?.length
      ? "Todos los días"
      : weekdays.map((d) => WEEKDAY_LABELS[d] ?? "?").join(", ");

  if (!startTime || !endTime) return dayText;
  return `${dayText} · ${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
}
