export type RemittanceProduct = ({ product_id: string; combo_id?: never } | { combo_id: string; product_id?: never }) & { name: string; quantity: number; unit_price: number; base_price?: number; platform_fee_percent?: number; platform_fee_amount?: number };
export function remittanceItemKey(item: RemittanceProduct) {
 return item.combo_id ? `combo:${item.combo_id}` : `product:${item.product_id}`;
}
export type RemittanceDelivery = {
 contains_money?: boolean; products_only?: boolean;
 money_amount?: number; money_delivery_currency?: 'USD' | 'CUP' | 'MIXED'; money_exchange_rate?: number | null;
 money_usd_to_cup?: number; money_delivery_amount?: number; store_products?: RemittanceProduct[]; store_products_total?: number;
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
export function deliveryParts(value: RemittanceDelivery) {
 const amount = Number(value.money_amount || 0);
 const currency = value.money_delivery_currency || 'USD';
 if (currency === 'USD') return { usd: deliveryAmount(amount, 'USD'), cup: 0, convertedUsd: 0 };
 if (!Number.isFinite(amount) || amount <= 0 || amount > 100000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) throw new Error('Importe de remesa inválido.');
 const convertedUsd = currency === 'CUP' ? amount : Number(value.money_usd_to_cup);
 if (!Number.isFinite(convertedUsd) || convertedUsd <= 0 || convertedUsd > amount || (currency === 'MIXED' && convertedUsd >= amount) || Math.abs(convertedUsd * 100 - Math.round(convertedUsd * 100)) > 0.00001) throw new Error('Indica cuántos USD se convierten a MN; en una entrega mixta deben ser menos que el monto enviado.');
 return { usd: Number((amount - convertedUsd).toFixed(2)), cup: deliveryAmount(convertedUsd, 'CUP', value.money_exchange_rate), convertedUsd };
}
export function deliveryLabel(value: RemittanceDelivery) {
 const parts = deliveryParts(value);
 const format = (n: number) => new Intl.NumberFormat('en-US', {minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
 if (value.money_delivery_currency === 'CUP') return `${format(parts.cup)} CUP (MN)`;
 if (value.money_delivery_currency === 'MIXED') return `${format(parts.usd)} USD + ${format(parts.cup)} CUP (MN)`;
 return `${format(parts.usd)} USD`;
}
export function productsTotal(items: RemittanceProduct[] = []) {
 return Math.round(items.reduce((sum, item) => sum + Math.round(item.unit_price * 100) * item.quantity, 0)) / 100;
}
