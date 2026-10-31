"use client";

import type { ShipmentFeeSelection, ShippingExtraFee } from '@/lib/shipping/types';

export default function ShipmentExtraFees({ fees, value, onChange }: { fees: ShippingExtraFee[]; value: ShipmentFeeSelection[]; onChange: (fees: ShipmentFeeSelection[]) => void }) {
  function toggle(fee: ShippingExtraFee) {
    onChange(value.some(item => item.fee_id === fee.id) ? value.filter(item => item.fee_id !== fee.id) : [...value, { fee_id: fee.id, fee_name: fee.name, calculation_type: fee.calculation_type, configured_amount: Number(fee.amount), calculated_amount: Number(fee.amount), quantity: 1 }]);
  }
  return <div className="grid gap-3 md:grid-cols-2">{fees.filter(fee => fee.is_active).map(fee => {
    const selected = value.find(item => item.fee_id === fee.id);
    const amount = Number(selected?.configured_amount ?? fee.amount);
    const tariff = fee.calculation_type === 'percentage' ? `${amount}% del subtotal` : `$${amount.toFixed(2)}${fee.calculation_type === 'per_lb' ? '/lb' : ' por unidad'}`;
    return <div key={fee.id} className={`rounded-2xl border p-4 ${selected ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200'}`}>
      <label className="flex cursor-pointer items-center justify-between gap-3"><span className="font-bold">{fee.name}</span><input type="checkbox" checked={Boolean(selected)} onChange={() => toggle(fee)} /></label>
      <p className="mt-1 text-xs text-slate-500">{tariff}</p>
      {selected && <div className="mt-3 flex items-end justify-between gap-4">
        <label className="block text-sm font-bold">Cantidad<input aria-label={`Cantidad de ${fee.name}`} type="number" min={1} max={9999} step={1} value={selected.quantity ?? 1} onChange={event => onChange(value.map(item => item.fee_id === fee.id ? { ...item, quantity: Number(event.target.value) } : item))} className="mt-1 block w-24 rounded-xl border border-slate-200 bg-white px-3 py-2" /></label>
        <p className="text-right text-sm"><span className="block text-slate-500">Subtotal del cargo</span><strong className="text-lg">${Number(selected.calculated_amount || 0).toFixed(2)}</strong></p>
      </div>}
    </div>;
  })}</div>;
}
