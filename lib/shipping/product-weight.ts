export type WeightUnit = "g" | "lb" | "kg";
export function weightInPounds(weight: unknown, unit: unknown): number {
  const n = Number(weight);
  if (
    !Number.isFinite(n) ||
    n <= 0 ||
    !["g", "lb", "kg"].includes(String(unit))
  )
    throw new Error("Falta configurar el peso de uno de los productos.");
  return unit === "kg" ? n / 0.45359237 : unit === "g" ? n / 453.59237 : n;
}
export function shippingCharge(
  rate: {
    rate_per_lb: number | string;
    minimum_weight_lb: number | string;
    maximum_weight_lb?: number | string | null;
    minimum_charge: number | string;
    fixed_fee: number | string;
    weight_threshold_lb?: number | string | null;
    rate_at_or_above_threshold?: number | string | null;
  },
  weight: number,
) {
  if (!Number.isFinite(weight) || weight <= 0)
    throw new Error("Peso de envío inválido.");
  if (rate.maximum_weight_lb != null && weight > Number(rate.maximum_weight_lb))
    throw new Error("El pedido supera el peso máximo de esta tarifa.");
  const billable = Math.max(weight, Number(rate.minimum_weight_lb || 0));
  const perLb =
    rate.weight_threshold_lb != null &&
    rate.rate_at_or_above_threshold != null &&
    weight >= Number(rate.weight_threshold_lb)
      ? Number(rate.rate_at_or_above_threshold)
      : Number(rate.rate_per_lb);
  const amount = Math.max(
    billable * perLb + Number(rate.fixed_fee || 0),
    Number(rate.minimum_charge || 0),
  );
  if (![amount, perLb].every((n) => Number.isFinite(n) && n >= 0))
    throw new Error("La tarifa no es válida.");
  return {
    amount: Math.round((amount + Number.EPSILON) * 100) / 100,
    billable_weight_lb: billable,
    rate_per_lb: perLb,
  };
}
