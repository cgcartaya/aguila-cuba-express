import { deliveryLabel, type RemittanceDelivery } from '@/lib/shipping/remittance-delivery';
type Fields = Record<string, unknown>;
const text = (value: unknown, fallback = 'No informado') =>
  typeof value === 'string' && value.trim() ? value.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 600) : fallback;
export function remittanceWhatsappMessage(reference: string, fields: Fields, amount: unknown): string {
  const money = Number(amount);
  if (!Number.isFinite(money) || money <= 0) throw new Error('invalid_amount');
  return [
    'Álvarez Travel · Nueva remesa',
    `Referencia: ${text(reference)}`,
    `Remitente: ${text(fields.sender_name)}`,
    `Destinatario: ${text(fields.recipient_name)}`,
    `Número de destinatario: ${text(fields.recipient_phone)}`,
    `Dirección: ${text(fields.recipient_address)}`,
    '', 'DETALLE DE LA ORDEN:',
    `💵 Remesa a entregar: ${deliveryLabel({ ...fields, money_amount: money } as RemittanceDelivery)}`,
    ...(fields.money_delivery_currency === 'CUP' ? [`Cambio manual: 1 USD = ${Number(fields.money_exchange_rate)} CUP · Origen: ${money.toFixed(2)} USD`] : []),
    ...(Array.isArray(fields.store_products) ? fields.store_products.map(item => `📦 ${Number(item.quantity)}× ${text(item.name)}`) : []),
    `NOTA: ${text(fields.notes, 'Sin notas')}`,
    'Registrado desde Álvarez Travel',
  ].join('\n');
}
