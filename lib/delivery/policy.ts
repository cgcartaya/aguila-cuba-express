export type DriverScope = { storeId: string; staffId: string | null; legacyId: string | null };
export function assignmentFilter(scope: DriverScope) {
  // IDs come exclusively from validated server account records, never request data.
  const ids = [scope.staffId, scope.legacyId].filter(Boolean);
  if (!ids.length || ids.some(id => !/^[a-f0-9-]{36}$/i.test(id!))) throw new Error('Invalid driver scope');
  return [scope.staffId && `assigned_staff_id.eq.${scope.staffId}`, scope.legacyId && `and(assigned_staff_id.is.null,assigned_driver_id.eq.${scope.legacyId})`].filter(Boolean).join(',');
}
export const deliveryStatuses = ['out_for_delivery', 'delivered', 'issue'] as const;
export function operationPatch(status: string, now: string) {
  if (status === 'photo') return { updated_at: now };
  if (!deliveryStatuses.includes(status as typeof deliveryStatuses[number])) throw new Error('Estado no válido.');
  return { status, delivered: status === 'delivered', delivered_date: status === 'delivered' ? now : null, updated_at: now };
}
export function validVersion(value: unknown): value is string {
  return typeof value === 'string' && value.length < 50 && Number.isFinite(Date.parse(value));
}
export function ownedEvidencePath(path:string,scope:DriverScope,shipmentId:string,tracking:string|null){
  if(path.split('/').some(segment=>segment==='..'||segment==='.')||path.includes('\\'))return false;
  return path.startsWith(`${scope.storeId}/${shipmentId}/`) || path.startsWith(`${shipmentId}/`) || !!(tracking && /^[a-z0-9_-]+$/i.test(tracking) && path===`${tracking.toUpperCase()}/entrega.jpg`);
}
