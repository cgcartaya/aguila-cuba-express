export type SelectedExtraFee = {
  quantity?: number;
  calculation_type: 'fixed' | 'per_lb' | 'percentage';
  configured_amount: number;
  calculated_amount: number;
};

export function extraFeeQuantity(value?: number | null): number {
  const quantity = value ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
    throw new Error('La cantidad de cada cargo debe ser un número entero entre 1 y 9999.');
  }
  return quantity;
}

export function calculateExtraFee<T extends SelectedExtraFee>(fee: T, weight: number, packageSubtotal: number) {
  const quantity = extraFeeQuantity(fee.quantity);
  let unitAmount = Number(fee.configured_amount || 0);
  if (fee.calculation_type === 'per_lb') unitAmount *= weight;
  if (fee.calculation_type === 'percentage') unitAmount *= packageSubtotal / 100;
  return { ...fee, quantity, calculated_amount: Math.round(unitAmount * 100) * quantity / 100 };
}
