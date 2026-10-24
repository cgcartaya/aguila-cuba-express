export type ItineraryGroup = {
  cities: string[];
  start_time: string | null;
  end_time: string | null;
};

export function cityKey(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function localDate(timezone = "America/New_York", now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function validRouteDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateItinerary(value: unknown): ItineraryGroup[] {
  if (!Array.isArray(value) || !value.length || value.length > 40) {
    throw new Error("Añade entre 1 y 40 grupos de ciudades.");
  }
  const seen = new Set<string>();
  let previousEnd = "";
  return value.map((raw) => {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.cities) || !raw.cities.length || raw.cities.length > 10) {
      throw new Error("Cada parada debe incluir al menos una ciudad.");
    }
    const cities = raw.cities.map((value: unknown) => {
      if (typeof value !== "string" || !value.trim() || value.trim().length > 100) throw new Error("Revisa los nombres de las ciudades.");
      const city = value.trim();
      const key = cityKey(city);
      if (seen.has(key)) throw new Error(`La ciudad ${city} está repetida.`);
      seen.add(key);
      return city;
    });
    const time = (value: unknown) => {
      if (value == null || value === "") return null;
      if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("Revisa los horarios (formato HH:MM).");
      return value;
    };
    const start = time(raw.start_time), end = time(raw.end_time);
    if (Boolean(start) !== Boolean(end)) throw new Error("Completa el inicio y el fin del horario, o deja ambos vacíos.");
    if (start && end) {
      if (end <= start) throw new Error("La hora final debe ser posterior a la inicial.");
      if (previousEnd && start < previousEnd) throw new Error("Hay horarios que se solapan o no siguen el orden del recorrido.");
      previousEnd = end;
    }
    return { cities, start_time: start, end_time: end };
  });
}

export function itineraryCities(groups: ItineraryGroup[]) {
  return groups.flatMap((group) => group.cities);
}

export function timeWindow(start?: string | null, end?: string | null) {
  if (!start || !end) return "Horario por coordinar";
  const format = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
  };
  return `${format(start)} – ${format(end)}`;
}
