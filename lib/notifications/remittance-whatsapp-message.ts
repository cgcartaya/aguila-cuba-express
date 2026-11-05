type Fields = Record<string, unknown>;
const text = (value: unknown, fallback = 'No informado') =>
  typeof value === 'string' && value.trim() ? value.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 600) : fallback;
export function remittanceWhatsappMessage(reference: string, fields: Fields, amount: unknown, paid: boolean): string {
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
    `💵 Remesa a entregar en USD: ${money.toFixed(2)}`,
    `NOTA: ${text(fields.notes, 'Sin notas')}`,
    `Estado del pago: ${paid ? 'Pago registrado' : 'Pendiente de pago; verificar antes de entregar'}`,
    'Registrado desde Álvarez Travel',
  ].join('\n');
}
