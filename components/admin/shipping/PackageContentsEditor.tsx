"use client";

import { Plus, Trash2 } from 'lucide-react';
import { MAX_PACKAGE_CONTENTS, type PackageContentItem } from '@/lib/shipping/package-label';

export default function PackageContentsEditor({ value, onChange }: { value: PackageContentItem[]; onChange: (items: PackageContentItem[]) => void }) {
  function update(index: number, item: Partial<PackageContentItem>) {
    onChange(value.map((current, position) => position === index ? { ...current, ...item } : current));
  }
  return <div className="space-y-4">
    <p className="text-sm text-slate-600">Opcional. Describe el contenido para que el cliente pueda comprobarlo al recibir el paquete. Esta lista no modifica el precio ni el inventario.</p>
    {value.map((item, index) => <div key={index} className="grid grid-cols-[90px_1fr_40px] items-end gap-3 rounded-2xl border border-slate-200 p-3">
      <label className="text-sm font-bold">Cantidad<input aria-label={`Cantidad del artículo ${index + 1}`} type="number" min="0.01" max="1000000" step="0.01" value={item.quantity || ''} onChange={e => update(index, { quantity: Number(e.target.value) })} className="mt-2 w-full rounded-xl border p-3" /></label>
      <label className="text-sm font-bold">Descripción<input aria-label={`Descripción del artículo ${index + 1}`} value={item.description} maxLength={160} onChange={e => update(index, { description: e.target.value })} placeholder="Ej.: paquetes de café" className="mt-2 w-full rounded-xl border p-3" /></label>
      <button type="button" aria-label={`Eliminar artículo ${index + 1}`} onClick={() => onChange(value.filter((_, position) => position !== index))} className="mb-1 rounded-xl p-2 text-red-700"><Trash2 size={20} /></button>
    </div>)}
    <button type="button" disabled={value.length >= MAX_PACKAGE_CONTENTS} onClick={() => onChange([...value, { description: '', quantity: 1 }])} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 disabled:opacity-50"><Plus size={18} /> Añadir artículo</button>
    {value.length === 0 && <p className="text-sm text-slate-500">Ejemplo: 4 paquetes de café · 2 jabones · 1 lata de leche condensada.</p>}
  </div>;
}
