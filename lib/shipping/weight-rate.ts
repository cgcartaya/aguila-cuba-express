export function weightRate(rate: { rate_per_lb: number | string; weight_threshold_lb?: number | string | null; rate_at_or_above_threshold?: number | string | null }, weight: number): number {
  return rate.weight_threshold_lb != null && rate.rate_at_or_above_threshold != null && weight >= Number(rate.weight_threshold_lb)
    ? Number(rate.rate_at_or_above_threshold) : Number(rate.rate_per_lb);
}
