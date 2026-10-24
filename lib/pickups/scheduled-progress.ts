/** Schedule estimates only. Never represents GPS, completed visits, or customer pickup status. */
export type ScheduledCity = { name: string; start_time?: string | null; end_time?: string | null };
export type ScheduledProgress = {
  phase: 'unavailable' | 'upcoming' | 'stop' | 'transit' | 'finished';
  currentIndices: number[];
  previousIndices: number[];
  nextIndices: number[];
  fromIndex: number | null;
  toIndex: number | null;
  fraction: number;
  travelSeconds: number;
  localTime: string;
  timezone: string;
};

export function scheduleTimezone(value?: string | null) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value || 'America/New_York' }).format(); return value || 'America/New_York'; }
  catch { return 'America/New_York'; }
}
function minutes(value?: string | null) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export function getScheduledProgress(route: { route_date: string; cities: ScheduledCity[] }, now: Date, timezone?: string | null): ScheduledProgress {
  const zone = scheduleTimezone(timezone);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  const day = `${part('year')}-${part('month')}-${part('day')}`;
  const time = Number(part('hour')) * 60 + Number(part('minute')) + Number(part('second')) / 60;
  const result: ScheduledProgress = { phase: 'unavailable', currentIndices: [], previousIndices: [], nextIndices: [], fromIndex: null, toIndex: null, fraction: 0, travelSeconds: 0, timezone: zone, localTime: new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(now) };
  const groups: { start: number; end: number; indices: number[] }[] = [];
  for (const [index, city] of route.cities.entries()) {
    const start = minutes(city.start_time), end = minutes(city.end_time);
    // Missing/overlapping hours cannot support a reliable automatic position.
    if (start === null || end === null || end <= start) return result;
    const previous = groups.at(-1);
    if (previous && start === previous.start && end === previous.end) previous.indices.push(index);
    else {
      if (previous && start < previous.end) return result;
      groups.push({ start, end, indices: [index] });
    }
  }
  if (!groups.length) return result;
  if (day < route.route_date || (day === route.route_date && time < groups[0].start)) return { ...result, phase: 'upcoming', nextIndices: groups[0].indices };
  if (day > route.route_date || time >= groups.at(-1)!.end) return { ...result, phase: 'finished', previousIndices: route.cities.map((_, i) => i) };
  for (const [index, group] of groups.entries()) {
    if (time >= group.end) { result.previousIndices.push(...group.indices); continue; }
    if (time >= group.start) return { ...result, phase: 'stop', currentIndices: group.indices, nextIndices: groups[index + 1]?.indices || [] };
    const previous = groups[index - 1];
    return { ...result, phase: 'transit', nextIndices: group.indices, fromIndex: previous.indices.at(-1)!, toIndex: group.indices[0], fraction: (time - previous.end) / (group.start - previous.end), travelSeconds: (group.start - previous.end) * 60 };
  }
  return result;
}

export function progressNames(cities: ScheduledCity[], indices: number[]) {
  return indices.map((index) => cities[index]?.name).filter(Boolean).join(' / ');
}
