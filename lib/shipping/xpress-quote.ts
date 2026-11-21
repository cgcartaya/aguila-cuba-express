export type XpressRate = {
  id: string;
  label: string;
  mode: string;
  fixed: boolean;
  rate: number;
  fee: number;
  minimum: number;
  minWeight: number;
  maxWeight: number | null;
  threshold: number | null;
  thresholdRate: number | null;
};

export function xpressSubtotal(rate: XpressRate, quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000) return null;
  if (rate.fixed && !Number.isInteger(quantity)) return null;
  if (!rate.fixed && rate.maxWeight !== null && quantity > rate.maxWeight) return null;
  const unitPrice = rate.threshold !== null && quantity >= rate.threshold
    ? rate.thresholdRate ?? rate.rate : rate.rate;
  const amount = rate.fixed ? rate.fee * quantity
    : Math.max(Math.max(quantity, rate.minWeight) * unitPrice + rate.fee, rate.minimum);
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
