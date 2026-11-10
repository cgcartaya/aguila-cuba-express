export type TravelRate = { label: string; amount: number };
export type TravelDeparture = {
  id: string;
  start: string;
  end: string;
  deadline: string;
  origin: string;
  status: 'available' | 'sold_out' | 'closed';
  rates: TravelRate[];
  pdf: string;
};
export type TravelDay = { title: string; description: string };
export type TravelContent = {
  review_notes?: string[];
  source_hash?: string;
  title: string;
  category: 'group' | 'custom' | 'cruise';
  permanent: boolean;
  featured: boolean;
  sort_order: number;
  countries: string[];
  description: string;
  route: string;
  days: number | null;
  nights: number | null;
  image: string;
  gallery: string[];
  includes: string[];
  excludes: string[];
  accommodation: string;
  conditions: string;
  itinerary: TravelDay[];
  pdf: string;
  source_text: string;
  source_url: string;
  departures: TravelDeparture[];
};
export type TravelPackage = {
  id: string;
  store_id: string;
  status: 'draft' | 'published' | 'paused' | 'archived';
  version: number;
  content: TravelContent;
  updated_at: string;
};
export const LUXURY_SLUG = 'luxury-travel-point';
export const TRAVEL_BUCKET = 'travel-assets';

export function emptyTravelContent(): TravelContent {
  return { title: '', category: 'group', permanent: false, featured: false, sort_order: 0, countries: [], description: '', route: '', days: null, nights: null, image: '', gallery: [], includes: [], excludes: [], accommodation: '', conditions: '', itinerary: [], pdf: '', source_text: '', source_url: '', departures: [] };
}
export function emptyDeparture(): TravelDeparture {
  return { id: crypto.randomUUID(), start: '', end: '', deadline: '', origin: '', status: 'available', rates: [], pdf: '' };
}
export function todayInMiami(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}
export function isDepartureOpen(departure: TravelDeparture, today = todayInMiami()) {
  return departure.status === 'available' && departure.start >= today && (!departure.deadline || departure.deadline >= today);
}
export function availableDepartures(content: TravelContent, today = todayInMiami()) {
  return content.departures.filter(departure => isDepartureOpen(departure, today)).sort((a, b) => a.start.localeCompare(b.start));
}
export function isPackageVisible(pkg: TravelPackage, today = todayInMiami()) {
  return pkg.status === 'published' && (pkg.content.permanent || availableDepartures(pkg.content, today).length > 0);
}
export function safeMediaUrl(value: string) {
  if (/^\/(?!\/)[\w/.-]+$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
function validDate(value: string) {
  const parsed = new Date(value + 'T12:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function validateTravelContent(content: TravelContent, status: TravelPackage['status']): string | null {
  if (!content || typeof content !== 'object') return 'Contenido inválido.';
  if (typeof content.title !== 'string' || !content.title.trim() || content.title.length > 200) return 'Escribe un título de hasta 200 caracteres.';
  if (!['group', 'custom', 'cruise'].includes(content.category)) return 'Categoría inválida.';
  if (content.days !== null && (!Number.isInteger(content.days) || content.days < 1 || content.days > 365)) return 'Revisa la duración del viaje.';
  if (content.nights !== null && (!Number.isInteger(content.nights) || content.nights < 0 || content.nights > 365)) return 'Revisa las noches de alojamiento.';
  if (!Number.isInteger(content.sort_order) || Math.abs(content.sort_order) > 100000) return 'Orden inválido.';
  if (typeof content.permanent !== 'boolean' || typeof content.featured !== 'boolean') return 'Vigencia inválida.';
  for (const key of ['description', 'route', 'accommodation', 'conditions', 'source_text', 'source_url', 'pdf', 'image'] as const) {
    if (typeof content[key] !== 'string' || content[key].length > 150000) return 'El contenido es demasiado extenso o inválido.';
  }
  for (const values of [content.countries, content.includes, content.excludes, content.gallery]) {
    if (!Array.isArray(values) || values.length > 100 || values.some(value => typeof value !== 'string' || value.length > 6000)) return 'Revisa los listados del paquete.';
  }
  for (const value of [content.image, content.pdf, content.source_url, ...content.gallery]) {
    if (value && !safeMediaUrl(value)) return 'Las imágenes y documentos deben tener una dirección HTTPS válida.';
  }
  if (!Array.isArray(content.itinerary) || content.itinerary.length > 365 || content.itinerary.some(day => typeof day.title !== 'string' || typeof day.description !== 'string' || day.title.length > 300 || day.description.length > 20000)) return 'Revisa el itinerario.';
  if (!Array.isArray(content.departures) || content.departures.length > 100) return 'Revisa las salidas.';
  const ids = new Set<string>();
  for (const departure of content.departures) {
    if (!departure.id || ids.has(departure.id)) return 'Hay salidas repetidas.';
    ids.add(departure.id);
    if (![departure.start, departure.end, departure.deadline, departure.origin, departure.pdf].every(value => typeof value === 'string')) return 'Datos de salida inválidos.';
    if (departure.start && !validDate(departure.start) || departure.end && !validDate(departure.end) || departure.deadline && !validDate(departure.deadline)) return 'Revisa las fechas de las salidas.';
    if (departure.end && (!departure.start || departure.end < departure.start)) return 'El regreso debe ser posterior o igual a la salida.';
    if (departure.deadline && (!departure.start || departure.deadline > departure.start)) return 'El cierre de reservas debe ser anterior o igual a la salida.';
    if (!['available', 'sold_out', 'closed'].includes(departure.status)) return 'Estado de salida inválido.';
    if (departure.pdf && !safeMediaUrl(departure.pdf)) return 'Documento de salida inválido.';
    if (!Array.isArray(departure.rates) || departure.rates.length > 20 || departure.rates.some(rate => typeof rate.label !== 'string' || !rate.label.trim() || rate.label.length > 100 || typeof rate.amount !== 'number' || !Number.isFinite(rate.amount) || rate.amount < 0 || rate.amount > 10000000)) return 'Revisa las tarifas de cada salida.';
    if (status === 'published' && !departure.start) return 'Completa la fecha de cada salida antes de publicar.';
  }
  if (status === 'published' && (!content.image || !content.description.trim() || !content.countries.length)) return 'Para publicar, completa portada, descripción y destinos.';
  if (status === 'published' && !content.permanent && !availableDepartures(content).length) return 'Añade una salida disponible o marca el paquete como permanente.';
  return null;
}
