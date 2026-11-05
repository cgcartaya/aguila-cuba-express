export type ShipmentOperationType = 'package' | 'money' | 'mixed' | 'products';
export const MONEY_DELIVERY_STATUSES = ['preparing', 'out_for_delivery', 'delivered', 'issue'] as const;

export function operationContent(type: ShipmentOperationType) {
  return { contains_package: type !== 'money', contains_money: type === 'money' || type === 'mixed', products_only: type === 'products' };
}

export function resolveOperationTrip(input: { contains_package: boolean; contains_money: boolean; products_only?: boolean; store_products?: unknown[] }, selectedTripId?: string | null) {
  if (input.products_only) { if (!input.store_products?.length) throw new Error('Añade al menos un producto de la tienda.'); return null; }
  if (!input.contains_package && !input.contains_money) throw new Error('Selecciona el contenido de la operación.');
  if (!input.contains_package) return null;
  if (!selectedTripId) throw new Error('Selecciona el viaje al que pertenece el paquete.');
  return selectedTripId;
}
