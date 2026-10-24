export type RestaurantZone = { id: string; name: string; fee: number; minimum_order: number };
export type RestaurantSection = { enabled: boolean; name: string; logo_url: string; description: string; accent: string; secondary_color: string; background_color: string; currency: 'USD' | 'CUP'; delivery_note: string; hours_note: string; zones: RestaurantZone[] };
export const RESTAURANT_NOTICE = 'Este pedido se prepara y entrega por separado de tus compras en la tienda. El delivery lo realiza el restaurante.';
export const RESTAURANT_PATH = '/restaurante/aguila';
export function emptyRestaurantSection(): RestaurantSection { return { enabled: false, name: '', logo_url: '', description: '', accent: '#b45309', secondary_color: '#17100c', background_color: '#fbf6ec', currency: 'USD', delivery_note: '', hours_note: '', zones: [] }; }
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const color = (value: unknown, fallback: string) => {
  const result = text(value || fallback, 7);
  if (!/^#[0-9a-f]{6}$/i.test(result)) throw Error('Selecciona colores válidos.');
  return result;
};
export function parseRestaurantSection(value: unknown): RestaurantSection {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const config = { ...emptyRestaurantSection(), enabled: source.enabled === true, name: text(source.name, 100), description: text(source.description, 400), logo_url: text(source.logo_url, 1000), accent: color(source.accent, '#b45309'), secondary_color: color(source.secondary_color, '#17100c'), background_color: color(source.background_color, '#fbf6ec'), currency: (source.currency === 'CUP' ? 'CUP' : 'USD') as 'USD' | 'CUP', delivery_note: text(source.delivery_note, 250), hours_note: text(source.hours_note, 200), zones: [] as RestaurantZone[] };
  if (config.logo_url && !/^https:\/\/[^\s]+$/i.test(config.logo_url)) throw Error('El logo debe usar una dirección HTTPS.');
  if (source.currency && !['USD','CUP'].includes(String(source.currency))) throw Error('Selecciona USD o CUP.');
  if (Array.isArray(source.zones)) {
    if (source.zones.length > 50) throw Error('Puedes configurar hasta 50 zonas.');
    const ids = new Set<string>();
    config.zones = source.zones.map((raw: Record<string, unknown>) => {
      if (!raw || typeof raw !== 'object') throw Error('Zona no válida.');
      const id = text(raw.id, 80), name = text(raw.name, 120), fee = Number(raw.fee), minimum_order = Number(raw.minimum_order);
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id) || !name || !Number.isFinite(fee) || fee < 0 || fee > 100000 || !Number.isFinite(minimum_order) || minimum_order < 0 || minimum_order > 100000) throw Error('Revisa los nombres, tarifas y mínimos de las zonas.');
      ids.add(id); return { id, name, fee: Math.round(fee * 100) / 100, minimum_order: Math.round(minimum_order * 100) / 100 };
    });
  }
  if (config.enabled && (!config.name || !config.zones.length)) throw Error('Para publicar completa el nombre del restaurante y al menos una zona de entrega.');
  return config;
}
export function restaurantDelivery(config: RestaurantSection, zoneId: string | undefined, subtotal: number) {
  const zone = config.zones.find(zone => zone.id === zoneId);
  if (!zone) throw Error('Selecciona una zona de entrega del restaurante.');
  if (subtotal < zone.minimum_order) throw Error(`El pedido mínimo para ${zone.name} es ${zone.minimum_order.toFixed(2)} ${config.currency}.`);
  return { name: zone.name, fee: zone.fee };
}
