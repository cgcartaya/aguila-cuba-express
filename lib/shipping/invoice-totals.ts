/** Amounts are in USD. A manual rebate applies once to the final invoice. */
export function shipmentInvoiceTotals(input: {
  contains_package: boolean;
  weight_subtotal: number;
  contains_money: boolean;
  money_total: number;
  extra_fees_total: number;
  discount_amount: number;
  amount_paid: number;
}) {
  const cents = (value: number) => Math.round(Number(value || 0) * 100);
  const subtotalCents = cents(input.contains_package ? input.weight_subtotal : 0)
    + cents(input.contains_money ? input.money_total : 0) + cents(input.extra_fees_total);
  if (!Number.isFinite(input.discount_amount) || input.discount_amount < 0) {
    throw new Error("La rebaja debe ser un importe válido mayor o igual a cero.");
  }
  const discountCents = cents(input.discount_amount);
  if (discountCents > subtotalCents) {
    throw new Error("La rebaja no puede superar el subtotal de la factura.");
  }
  const totalCents = Math.max(subtotalCents - discountCents, 0);
  const paidCents = Math.min(totalCents, Math.max(cents(input.amount_paid), 0));
  return {
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    total: totalCents / 100,
    paid: paidCents / 100,
    balance: (totalCents - paidCents) / 100,
  };
}
