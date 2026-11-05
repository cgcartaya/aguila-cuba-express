"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { productsTotal, remittanceItemKey, type RemittanceProduct } from '@/lib/shipping/remittance-delivery';
type Product = { id: string; name: string; price: number; stock: number; kind: "product" | "combo" };
export default function RemittanceProductsEditor({ storeId, value, onChange }: { storeId: string; value: RemittanceProduct[]; onChange: (value: RemittanceProduct[]) => void }) {
 const [kind, setKind] = useState<'all' | 'product' | 'combo'>('all');
 const [search, setSearch] = useState(''); const [products, setProducts] = useState<Product[]>([]);
 const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
 useEffect(() => {
  const abort = new AbortController();
  const timer = setTimeout(() => { void (async () => {
   try {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/remittances/products?${new URLSearchParams({ storeId, search, kind })}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, signal: abort.signal });
    const body = await response.json(); if (!response.ok) throw Error(body.error || 'No se pudieron cargar los productos.');
    if (!abort.signal.aborted) { setProducts(body.products); setError(''); }
   } catch (cause) { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'Error al consultar productos.'); }
   finally { if (!abort.signal.aborted) setLoading(false); }
  })(); }, 250);
  return () => { clearTimeout(timer); abort.abort(); };
 }, [storeId, search, kind]);
 return <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
  <h3 className="font-bold">Añadir productos de la tienda</h3><p className="text-sm text-slate-600">Los productos nuevos se cobran al precio base y se entregan al mismo destinatario. El inventario se descuenta al guardar el envío.</p>
  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
   <label className="block text-sm font-semibold">Buscar en la tienda
    <input type="search" value={search} onChange={event => setSearch(event.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3" placeholder="Nombre del producto o combo" />
   </label>
   <label className="block text-sm font-semibold">Tipo
    <select value={kind} onChange={event => setKind(event.target.value as typeof kind)} className="mt-2 block w-full rounded-xl border bg-white p-3">
     <option value="all">Todos</option><option value="product">Productos</option><option value="combo">Combos</option>
    </select>
   </label>
  </div>
  {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  <div className="max-h-56 space-y-2 overflow-y-auto">
   {loading ? <p className="text-sm">Buscando en la tienda…</p> : products.length === 0 ? <p className="text-sm">No hay resultados.</p> : products.map(product => {
    const item: RemittanceProduct = {
     ...(product.kind === 'combo' ? { combo_id: product.id } : { product_id: product.id }),
     name: product.name, quantity: 1, unit_price: product.price,
    };
    const key = remittanceItemKey(item);
    return <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm">
     <div><strong>{product.name}</strong>{item.combo_id && <span className="ml-2 text-xs text-slate-500">Combo</span>}
      <p>${product.price.toFixed(2)} USD · {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}</p></div>
     <button type="button" disabled={product.stock <= 0 || value.some(row => remittanceItemKey(row) === key) || value.length >= 20} onClick={() => onChange([...value, item])} className="rounded-lg border px-3 py-2 disabled:opacity-40">Añadir</button>
    </div>;
   })}
  </div>
  {value.map(item => {
   const key = remittanceItemKey(item);
   return <div key={key} className="flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
    <strong className="min-w-32 flex-1">{item.name}{item.combo_id && ' · Combo'}</strong>
    <label>Cantidad<input type="number" min={1} max={999} step={1} value={item.quantity} onChange={event => onChange(value.map(row => remittanceItemKey(row) === key ? { ...row, quantity: Number(event.target.value) } : row))} className="ml-2 w-20 rounded-lg border bg-white p-2" /></label>
    <span>${(item.quantity * item.unit_price).toFixed(2)}</span>
    <button type="button" onClick={() => onChange(value.filter(row => remittanceItemKey(row) !== key))} className="rounded-lg px-2 py-2 text-red-700">Quitar</button>
   </div>;
  })}
  <p className="font-bold">Productos y combos: ${productsTotal(value).toFixed(2)} USD</p>
 </div>;
}
