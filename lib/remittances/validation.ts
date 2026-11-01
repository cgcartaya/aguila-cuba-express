import { CUBA_PROVINCES } from '@/lib/checkout/cuba-provinces';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function remittanceAmount(value: unknown) {
  const text=String(value??'').trim().replace(',','.');
  if(!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Indica un importe válido con hasta dos decimales.');
  const amount=Number(text);
  if(!Number.isFinite(amount)||amount<=0||amount>100000) throw new Error('El importe debe ser mayor que cero y hasta 100,000 USD.');
  return amount;
}
export function remittancePayload(input: Record<string,unknown>) {
  const text=(key:string,min:number,max:number)=>{
    const value=typeof input[key]==='string'?input[key].trim():'';
    if(value.length<min||value.length>max)throw new Error('Completa correctamente los datos del remitente y destinatario.');
    return value;
  };
  const phone=(key:string)=>{
    const value=text(key,8,30).replace(/[\s()-]/g,'');
    if(!/^\+?\d{8,15}$/.test(value))throw new Error('Escribe teléfonos válidos con el prefijo del país.');
    return value;
  };
  const province=text('recipient_province',2,80);
  if(!(CUBA_PROVINCES as readonly string[]).includes(province))throw new Error('Selecciona una provincia de Cuba.');
  return {
    amount:remittanceAmount(input.amount).toFixed(2),
    sender_name:text('sender_name',2,120),sender_phone:phone('sender_phone'),
    recipient_name:text('recipient_name',2,120),recipient_phone:phone('recipient_phone'),
    recipient_address:text('recipient_address',5,400),recipient_province:province,
    recipient_municipality:text('recipient_municipality',2,100),notes:text('notes',0,500),
  };
}
