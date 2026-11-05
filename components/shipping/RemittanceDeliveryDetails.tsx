import { deliveryLabel, type RemittanceDelivery } from '@/lib/shipping/remittance-delivery';
export default function RemittanceDeliveryDetails({ value }: { value: RemittanceDelivery }) {
 return <section className="my-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
  <p className="font-bold">Dinero a entregar: {deliveryLabel(value)}</p>
  {value.money_delivery_currency === 'CUP' && <p className="mt-1">Origen: {Number(value.money_amount).toFixed(2)} USD · Cambio manual: 1 USD = {Number(value.money_exchange_rate)} CUP</p>}
  {!!value.store_products?.length && <><p className="mt-3 font-bold">Productos de la tienda para entregar</p><ul className="mt-1 space-y-1">{value.store_products.map(item => <li key={item.product_id}>{item.quantity} × {item.name} · ${(item.quantity * item.unit_price).toFixed(2)} USD</li>)}</ul></>}
 </section>;
}
