"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { productsTotal, type RemittanceProduct } from '@/lib/shipping/remittance-delivery';
type Product = { id: string; name: string; price: number; base_price?: number; platform_fee_percent?: number; stock: number };
export default function RemittanceProductsEditor({ storeId, value, onChange }: { storeId: string; value: RemittanceProduct[]; onChange: (value: RemittanceProduct[]) => void }) {
 const [search, setSearch] = useState(''); const [products, setProducts] = useState<Product[]>([]);
 const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
 useEffect(() => {
  const abort = new AbortController();
  const timer = setTimeout(() => { void (async () => {
   try {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/remittances/products?${new URLSearchParams({ storeId, search })}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, signal: abort.signal });
    const body = await response.json(); if (!response.ok) throw Error(body.error || 'No se pudieron cargar los productos.');
    if (!abort.signal.aborted) { setProducts(body.products); setError(''); }
   } catch (cause) { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'Error al consultar productos.'); }
   finally { if (!abort.signal.aborted) setLoading(false); }
  })(); }, 250);
  return () => { clearTimeout(timer); abort.abort(); };
 }, [storeId, search]);
 return <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
  <h3 className="font-bold">Añadir productos de la tienda</h3><p className="text-sm text-slate-600">Se cobran aparte de la remesa y se entregan al mismo destinatario. El precio incluye la comisión configurada de la tienda. Se crea una orden vinculada a la remesa; el inventario se descuenta una sola vez.</p>
  <label className="block text-sm font-semibold">Buscar producto<input type="search" value={search} onChange={event => setSearch(event.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3" placeholder="Pollo, cervezas…" /></label>
  {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  <div className="max-h-56 space-y-2 overflow-y-auto">{loading ? <p className="text-sm">Buscando productos…</p> : products.map(product => <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"><div><strong>{product.name}</strong><p>${Number(product.price).toFixed(2)} USD · {product.stock} disponibles</p></div><button type="button" disabled={value.some(item => item.product_id === product.id) || value.length >= 20} onClick={() => onChange([...value, { product_id: product.id, name: product.name, quantity: 1, unit_price: Number(product.price), base_price: Number(product.base_price ?? product.price), platform_fee_percent: Number(product.platform_fee_percent || 0), platform_fee_amount: Number((Number(product.price) - Number(product.base_price ?? product.price)).toFixed(2)) }])} className="rounded-lg border px-3 py-2 disabled:opacity-40">Añadir</button></div>)}</div>
  {value.map(item => <div key={item.product_id} className="flex flex-wrap items-center gap-3 border-t pt-3 text-sm"><strong className="min-w-32 flex-1">{item.name}</strong><label>Cantidad<input type="number" min={1} max={999} step={1} value={item.quantity} onChange={event => onChange(value.map(row => row.product_id === item.product_id ? { ...row, quantity: Number(event.target.value) } : row))} className="ml-2 w-20 rounded-lg border bg-white p-2" /></label><span>${(item.quantity * item.unit_price).toFixed(2)}</span><button type="button" onClick={() => onChange(value.filter(row => row.product_id !== item.product_id))} className="rounded-lg px-2 py-2 text-red-700">Quitar</button></div>)}
  <p className="font-bold">Productos: ${productsTotal(value).toFixed(2)} USD</p>
 </div>;
}
