export type RemittanceProduct = { product_id: string; name: string; quantity: number; unit_price: number };
export type RemittanceDelivery = {
 money_amount?: number; money_delivery_currency?: 'USD' | 'CUP'; money_exchange_rate?: number | null;
 money_delivery_amount?: number; store_products?: RemittanceProduct[]; store_products_total?: number;
};
export function deliveryAmount(amount: number, currency: 'USD' | 'CUP', rate?: number | null) {
 if (!Number.isFinite(amount) || amount < 0 || amount > 100000) throw new Error('Importe de remesa inválido.');
 if (currency === 'USD') return amount;
 if (!Number.isFinite(rate) || Number(rate) <= 0 || Number(rate) > 1000000) throw new Error('Indica un cambio manual mayor que cero.');
 // Integer arithmetic matches Postgres numeric rounding, including half cents.
 const principalCents = BigInt(Math.round(amount * 100));
 const rateUnits = BigInt(Math.round(Number(rate) * 10000));
 return Number((principalCents * rateUnits + BigInt(5000)) / BigInt(10000)) / 100;
}
export function deliveryLabel(value: RemittanceDelivery) {
 const cup = value.money_delivery_currency === 'CUP';
 const amount = cup ? value.money_delivery_amount ?? deliveryAmount(Number(value.money_amount || 0), 'CUP', value.money_exchange_rate) : Number(value.money_amount || 0);
 return `${new Intl.NumberFormat('en-US', {minimumFractionDigits:2,maximumFractionDigits:2}).format(amount)} ${cup ? 'CUP (MN)' : 'USD'}`;
}
export function productsTotal(items: RemittanceProduct[] = []) {
 return Math.round(items.reduce((sum, item) => sum + Math.round(item.unit_price * 100) * item.quantity, 0)) / 100;
}
