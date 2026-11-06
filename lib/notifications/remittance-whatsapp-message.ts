import { deliveryLabel, type RemittanceDelivery } from '@/lib/shipping/remittance-delivery';
type Fields = Record<string, unknown>;
const text = (value: unknown, fallback = 'No informado') =>
  typeof value === 'string' && value.trim() ? value.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 600) : fallback;
export function remittanceWhatsappMessage(reference: string, fields: Fields, amount: unknown): string {
  const money = Number(amount);
  const products = Array.isArray(fields.store_products) ? fields.store_products : [];
  if (!Number.isFinite(money) || money < 0 || money === 0 && (!products.length || fields.contains_money === true)) throw new Error('invalid_amount');
  const hasMoney = fields.contains_money !== false && money > 0;
  return [
    hasMoney ? 'Álvarez Travel · Nueva remesa' : 'Álvarez Travel · Nuevo envío de productos',
    `Referencia: ${text(reference)}`,
    `Remitente: ${text(fields.sender_name)}`,
    `Destinatario: ${text(fields.recipient_name)}`,
    `Número de destinatario: ${text(fields.recipient_phone)}`,
    ...(text(fields.recipient_phone_alt, "") ? [`Teléfono alternativo: ${text(fields.recipient_phone_alt)}`] : []),
    `Dirección: ${text(fields.recipient_address)}`,
    '', 'DETALLE DE LA ORDEN:',
    ...(hasMoney ? [`💵 Remesa a entregar: ${deliveryLabel({ ...fields, money_amount: money } as RemittanceDelivery)}`] : []),
    ...((hasMoney && (fields.money_delivery_currency === 'CUP' || fields.money_delivery_currency === 'MIXED')) ? [`Cambio manual: 1 USD = ${Number(fields.money_exchange_rate)} CUP`] : []),
    ...(Array.isArray(fields.store_products) ? fields.store_products.map(item => `📦 ${Number(item.quantity)}× ${text(item.name)}`) : []),
    `NOTA: ${text(fields.notes, 'Sin notas')}`,
    'Registrado desde Álvarez Travel',
  ].join('\n');
}
