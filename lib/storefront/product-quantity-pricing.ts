export type QuantityPriceTier = {
  min_quantity: number;
  unit_price: number;
};

export function normalizeQuantityPriceTiers(
  tiers?: QuantityPriceTier[] | null
): QuantityPriceTier[] {
  return (tiers || [])
    .map((tier) => ({
      min_quantity: Number(tier.min_quantity),
      unit_price: Number(tier.unit_price),
    }))
    .filter(
      (tier) =>
        Number.isInteger(tier.min_quantity) &&
        tier.min_quantity >= 2 &&
        Number.isFinite(tier.unit_price) &&
        tier.unit_price >= 0
    )
    .sort((a, b) => a.min_quantity - b.min_quantity);
}

export function getUnitPriceForQuantity(
  basePrice: number,
  quantity: number,
  tiers?: QuantityPriceTier[] | null
) {
  const safeBasePrice = Number(basePrice || 0);
  const safeQuantity = Math.max(1, Number(quantity || 1));

  let unitPrice = safeBasePrice;

  for (const tier of normalizeQuantityPriceTiers(tiers)) {
    if (safeQuantity >= tier.min_quantity) {
      unitPrice = Math.min(unitPrice, tier.unit_price);
    }
  }

  return Number(unitPrice.toFixed(2));
}

export function getPurchaseQuantityLimit(params: {
  stock?: number | null;
  maxQuantityPerOrder?: number | null;
}) {
  const stock = Math.max(0, Number(params.stock || 0));

  if (params.maxQuantityPerOrder == null) {
    return stock;
  }

  const configuredLimit = Math.max(
    1,
    Number(params.maxQuantityPerOrder)
  );

  return Math.min(stock, configuredLimit);
}

export function getNextQuantityPriceTier(
  quantity: number,
  tiers?: QuantityPriceTier[] | null
) {
  const safeQuantity = Math.max(0, Number(quantity || 0));

  return (
    normalizeQuantityPriceTiers(tiers).find(
      (tier) => tier.min_quantity > safeQuantity
    ) || null
  );
}
