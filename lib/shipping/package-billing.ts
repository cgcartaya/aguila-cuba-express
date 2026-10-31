import { calculateExtraFee } from '@/lib/shipping/extra-fee-calculation';
import type { ShipmentInput } from '@/lib/shipping/types';

/** A fee-only physical parcel is billed by fixed item charges, never by weight. */
export function normalizePackageBilling<T extends ShipmentInput>(input: T) {
  if (!input.contains_package) return { ...input, package_billing_mode: 'weight' as const };
  if (input.package_billing_mode !== 'fees_only') return input;
  if (!input.selected_fees.length || input.selected_fees.some(fee => fee.calculation_type !== 'fixed')) {
    throw new Error('Selecciona al menos un cargo fijo por artículo para enviar sin cobrar por peso.');
  }
  const fees = input.selected_fees.map(fee => calculateExtraFee(fee, 0, 0));
  if (!fees.some(fee => fee.calculated_amount > 0)) throw new Error('El envío por artículo necesita al menos un cargo mayor que cero.');
  return { ...input, package_billing_mode: 'fees_only' as const, weight_lb: 0, rate_per_lb: 0, weight_subtotal: 0, service_type_id: null, service_type_name: 'Por artículo', selected_fees: fees, extra_fees_total: Number(fees.reduce((sum, fee) => sum + fee.calculated_amount, 0).toFixed(2)) };
}
