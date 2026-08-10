export type QuantityPriceTier = {
  min_quantity: number;
  unit_price: number;
};

/* =========================================================
   FEE DE PLATAFORMA (PERLA)

   El dueño de la tienda (ej. Águila) sigue escribiendo siempre
   su precio base real (el que quiere recibir). Si la tienda
   tiene el fee de plataforma activado, se le suma un porcentaje
   ENCIMA de ese precio base para calcular el precio que ve el
   cliente. El precio base nunca se modifica en la base de datos.
========================================================= */

export type StoreWithPlatformFee = {
  platform_fee_enabled?: boolean | null;
  platform_fee_percent?: number | null;
};

/**
 * Devuelve el porcentaje de fee a aplicar (0 si la tienda no lo
 * tiene activado o el valor configurado no es válido).
 */
export function getPlatformFeePercent(
  store?: StoreWithPlatformFee | null
): number {
  if (!store?.platform_fee_enabled) return 0;

  const percent = Number(store.platform_fee_percent);

  return Number.isFinite(percent) && percent > 0 ? percent : 0;
}

/**
 * Aplica el fee de plataforma a un monto (precio base o subtotal).
 * precio_cliente = monto_base × (1 + fee/100)
 */
export function applyPlatformFee(
  amount: number,
  feePercent: number
): number {
  const safeAmount = Number(amount || 0);
  const safeFee = Number(feePercent || 0);

  if (!Number.isFinite(safeFee) || safeFee <= 0) {
    return Number(safeAmount.toFixed(2));
  }

  return Number((safeAmount * (1 + safeFee / 100)).toFixed(2));
}

/**
 * Dado un precio ya calculado con fee incluido, calcula cuánto de
 * ese monto corresponde al fee de plataforma (para reportes/orden).
 * Ej: priceWithFee=12.81, feePercent=2.5 -> basePrice≈12.50, fee≈0.31
 */
export function splitPlatformFee(
  priceWithFee: number,
  feePercent: number
) {
  const safePriceWithFee = Number(priceWithFee || 0);
  const safeFee = Number(feePercent || 0);

  if (!Number.isFinite(safeFee) || safeFee <= 0) {
    return {
      basePrice: Number(safePriceWithFee.toFixed(2)),
      feeAmount: 0,
    };
  }

  const basePrice = Number(
    (safePriceWithFee / (1 + safeFee / 100)).toFixed(2)
  );

  return {
    basePrice,
    feeAmount: Number((safePriceWithFee - basePrice).toFixed(2)),
  };
}

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
  tiers?: QuantityPriceTier[] | null,
  feePercent = 0
) {
  const safeBasePrice = Number(basePrice || 0);
  const safeQuantity = Math.max(1, Number(quantity || 1));

  let unitPrice = safeBasePrice;

  for (const tier of normalizeQuantityPriceTiers(tiers)) {
    if (safeQuantity >= tier.min_quantity) {
      unitPrice = Math.min(unitPrice, tier.unit_price);
    }
  }

  // El fee se aplica DESPUÉS de resolver la escala por cantidad,
  // sobre el precio base que corresponda a esa cantidad.
  return applyPlatformFee(unitPrice, feePercent);
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
