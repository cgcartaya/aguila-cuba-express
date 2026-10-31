export type ShipmentOperationType = 'package' | 'money' | 'mixed';
export const MONEY_DELIVERY_STATUSES = ['preparing', 'out_for_delivery', 'delivered', 'issue'] as const;

export function operationContent(type: ShipmentOperationType) {
  return { contains_package: type !== 'money', contains_money: type !== 'package' };
}

export function resolveOperationTrip(input: { contains_package: boolean; contains_money: boolean }, selectedTripId?: string | null) {
  if (!input.contains_package && !input.contains_money) throw new Error('Selecciona el contenido de la operación.');
  if (!input.contains_package) return null;
  if (!selectedTripId) throw new Error('Selecciona el viaje al que pertenece el paquete.');
  return selectedTripId;
}
