import { z } from 'zod';

const copy = z.object({
  title: z.string().trim().min(1).max(180),
  price: z.string().max(160),
  description: z.string().max(1200),
  terms: z.string().max(1200),
  delivery: z.string().max(600),
  button: z.string().max(120),
  message: z.string().max(600),
});

export function secureUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

export const entrySchema = z.object({
  key: z.string().min(1).max(80),
  section: z.enum(['hero', 'rate', 'special', 'promotion', 'online']),
  service_key: z.string().nullable(),
  position: z.number().int(),
  enabled: z.boolean(),
  visible: z.boolean(),
  starts_on: z.iso.date().nullable(),
  ends_on: z.iso.date().nullable(),
  weekdays: z.array(z.number().int().min(0).max(6)),
  external_url: z.string().refine(value => !value || !!secureUrl(value)),
  copy: z.object({ es: copy, en: copy, fr: copy }),
}).refine(row => row.section !== 'promotion' || (
  row.starts_on && row.ends_on && row.ends_on >= row.starts_on
), { message: 'Indica fechas de inicio y fin válidas.' });

export type ShippingEntry = z.infer<typeof entrySchema>;

const agencyDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
});
const agencyWeekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' });
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function shippingStatus(row: ShippingEntry, now = new Date()) {
  if (!row.enabled || !row.visible) return 'hidden';
  if (row.section !== 'promotion') return 'active';
  const date = agencyDate.format(now);
  if (row.starts_on && date < row.starts_on) return 'scheduled';
  if (row.ends_on && date > row.ends_on) return 'expired';
  if (row.weekdays.length && !row.weekdays.includes(weekdays.indexOf(agencyWeekday.format(now)))) return 'weekday';
  return 'active';
}
