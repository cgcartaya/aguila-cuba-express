export type RemittanceEarningsRow = {
  id: string;
  status: string;
  contains_money: boolean;
  money_amount: number;
  money_commission: number;
  money_discount: number;
  discount_amount: number;
  billed: number;
  paid: number;
  weight_subtotal?: number;
  store_products_total?: number;
  physical_products_total?: number;
  extra_fees_total?: number;
  money_total?: number;
};

const cents = (amount: number) => Math.round(Number(amount || 0) * 100);

/** General invoice rebates reduce the agency commission first, down to zero. */
export function remittanceEarnings(rows: RemittanceEarningsRow[], platformCharges: { shipment_id: string; amount: number }[]) {
  const charges = new Map(platformCharges.map(row => [row.shipment_id, cents(row.amount)]));
  let count = 0, principal = 0, gross = 0, discounts = 0, earned = 0;
  let collected = 0, platform = 0, withoutCharge = 0, billed = 0, paid = 0;
  let weightSales = 0, virtualSales = 0, physicalSales = 0, extraFees = 0, invoiceRebates = 0;
  for (const row of rows) {
    if (row.status === "cancelled") continue;
    weightSales += cents(row.weight_subtotal || 0);
    virtualSales += cents(row.store_products_total || 0);
    physicalSales += cents(row.physical_products_total || 0);
    extraFees += cents(row.extra_fees_total || 0);
    invoiceRebates += cents(row.discount_amount || 0);
    billed += cents(row.billed);
    paid += cents(row.paid);
    if (!row.contains_money) continue;
    count++;
    principal += cents(row.money_amount);
    const fee = Math.max(cents(row.money_commission), 0);
    const rebate = Math.min(fee, Math.max(cents(row.money_discount), 0) + Math.max(cents(row.discount_amount), 0));
    const income = fee - rebate;
    gross += fee;
    discounts += rebate;
    earned += income;
    // Partial payments cannot be allocated reliably between principal and income.
    if (cents(row.paid) >= cents(row.billed)) collected += income;
    platform += charges.get(row.id) ?? 0;
    if (!charges.has(row.id)) withoutCharge++;
  }
  return {
    count, withoutCharge, billed: billed / 100, paid: paid / 100,
    principal: principal / 100, gross: gross / 100, discounts: discounts / 100,
    earned: earned / 100, collected: collected / 100, platform: platform / 100,
    weightSales: weightSales / 100, virtualSales: virtualSales / 100,
    physicalSales: physicalSales / 100, extraFees: extraFees / 100,
    invoiceRebates: invoiceRebates / 100,
    otherSalesBeforeRebates: (weightSales + virtualSales + physicalSales + extraFees) / 100,
    incomeExcludingPrincipal: (billed - principal) / 100,
    afterPlatform: (earned - platform) / 100,
  };
}

export type RemittanceEarnings = ReturnType<typeof remittanceEarnings>;
