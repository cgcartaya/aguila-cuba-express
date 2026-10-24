export const LANDING_PERIODS = ['this_month', 'last_month', '7d', '30d'] as const;
export type LandingPeriod = typeof LANDING_PERIODS[number];
export type LandingEvent = { session_id: string | null; visitor_id: string | null; created_at: string };
export type LandingSummary = {
  period: LandingPeriod;
  timezone: string;
  startDate: string;
  endDate: string;
  updatedAt: string;
  totals: { visits: number; views: number; visitors: number };
  daily: { date: string; visits: number; views: number; visitors: number }[];
};
export function landingTimezone(value?: string | null) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value || 'America/New_York' }).format(); return value || 'America/New_York'; }
  catch { return 'America/New_York'; }
}
export function landingLocalDate(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (name: string) => parts.find(part => part.type === name)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
function shiftDay(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10);
}
// Iterative civil-time conversion keeps month boundaries correct across DST.
function midnight(date: string, timezone: string) {
  const desired = Date.parse(`${date}T00:00:00Z`);
  let timestamp = desired;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(timestamp));
    const value = (name: string) => parts.find(part => part.type === name)!.value;
    const civil = Date.parse(`${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}Z`);
    timestamp += desired - civil;
  }
  return new Date(timestamp).toISOString();
}
export function landingWindow(period: LandingPeriod, now: Date, value?: string | null) {
  const timezone = landingTimezone(value), today = landingLocalDate(now, timezone);
  let startDate = `${today.slice(0, 7)}-01`, endDate = today, end = now.toISOString();
  if (period === 'last_month') {
    endDate = shiftDay(startDate, -1);
    const nextMonth = startDate;
    startDate = `${endDate.slice(0, 7)}-01`;
    end = midnight(nextMonth, timezone);
  } else if (period === '7d' || period === '30d') startDate = shiftDay(today, period === '7d' ? -6 : -29);
  return { period, timezone, startDate, endDate, start: midnight(startDate, timezone), end, updatedAt: now.toISOString() };
}
export function summarizeLanding(rows: LandingEvent[], window: ReturnType<typeof landingWindow>): LandingSummary {
  const visits = new Set<string>(), visitors = new Set<string>();
  const buckets = new Map<string, { views: number; visits: Set<string>; visitors: Set<string> }>();
  for (let date = window.startDate; date <= window.endDate; date = shiftDay(date, 1)) buckets.set(date, { views: 0, visits: new Set(), visitors: new Set() });
  let views = 0;
  for (const row of rows) {
    const timestamp = Date.parse(row.created_at);
    if (!Number.isFinite(timestamp) || timestamp < Date.parse(window.start) || timestamp >= Date.parse(window.end)) continue;
    const bucket = buckets.get(landingLocalDate(new Date(row.created_at), window.timezone));
    if (!bucket) continue;
    views++; bucket.views++;
    const session = row.session_id?.trim(), visitor = row.visitor_id?.trim();
    if (session) { visits.add(session); bucket.visits.add(session); }
    if (visitor) { visitors.add(visitor); bucket.visitors.add(visitor); }
  }
  return { period: window.period, timezone: window.timezone, startDate: window.startDate, endDate: window.endDate, updatedAt: window.updatedAt, totals: { visits: visits.size, views, visitors: visitors.size }, daily: Array.from(buckets, ([date, bucket]) => ({ date, views: bucket.views, visits: bucket.visits.size, visitors: bucket.visitors.size })) };
}
