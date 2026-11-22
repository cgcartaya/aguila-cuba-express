import { shippingCharge } from "./product-weight";

type XpressWeightRate = Parameters<typeof shippingCharge>[0];

export type XpressDestination = {
  id: string;
  province: string;
  municipality?: string;
  pricing: XpressWeightRate;
};

export type XpressRate = {
  id: string;
  label: string;
  mode: string;
  unitPrice: number | null;
  destinations: XpressDestination[];
};

export function xpressQuote(rate: XpressRate, destination: XpressDestination, quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000) return null;
  const delivery = Number(destination.pricing.fixed_fee);
  if (!Number.isFinite(delivery) || delivery < 0) return null;
  const round = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

  if (rate.unitPrice !== null) {
    if (!Number.isInteger(quantity)) return null;
    const transport = round(rate.unitPrice * quantity);
    return { transport, delivery, total: round(transport + delivery) };
  }

  try {
    const { amount: total } = shippingCharge(destination.pricing, quantity);
    return { transport: round(total - delivery), delivery, total };
  } catch {
    return null;
  }
}
