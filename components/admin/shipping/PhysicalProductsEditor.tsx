"use client";

import { useEffect, useState } from "react";
import { listPhysicalProducts, type PhysicalStoreProduct } from "@/lib/services/physical-store-products";
import { productsTotal, type PhysicalProductLine } from "@/lib/shipping/remittance-delivery";

type Props = {
  storeId: string;
  value: PhysicalProductLine[];
  onChange: (value: PhysicalProductLine[]) => void;
};

export default function PhysicalProductsEditor({ storeId, value, onChange }: Props) {
  const [products, setProducts] = useState<PhysicalStoreProduct[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listPhysicalProducts(storeId, true).then(rows => {
      if (active) setProducts(rows);
    }).catch(cause => {
      if (active) setError(cause.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [storeId]);

  const matches = products.filter(product => product.name.toLowerCase().includes(search.trim().toLowerCase()));

  return <div className="space-y-3">
    <p className="text-sm text-slate-600">Productos que se compran en la agencia de Hialeah y se colocan dentro del paquete. Pesa el paquete completo y registra el peso arriba.</p>
    <label className="block text-sm font-semibold">Buscar producto de Hialeah
      <input type="search" value={search} onChange={event => setSearch(event.target.value)} className="mt-1 w-full rounded-xl border p-3" />
    </label>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading && <p>Cargando productos…</p>}
    {!loading && !error && !matches.length && <p className="text-sm text-slate-600">No hay productos disponibles que coincidan.</p>}
    <div className="max-h-56 space-y-2 overflow-y-auto">
      {matches.map(product => <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
        <div><strong>{product.name}</strong><p>${product.price?.toFixed(2)} USD · {product.stock} disponibles</p></div>
        <button type="button" className="rounded-lg border px-3 py-2 disabled:opacity-40" disabled={value.some(item => item.product_id === product.id)}
          onClick={() => {
            if (product.price !== null) onChange([...value, { product_id: product.id, name: product.name, quantity: 1, unit_price: product.price }]);
          }}>Añadir</button>
      </div>)}
    </div>
    {value.map(item => <div key={item.product_id} className="flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
      <strong className="flex-1">{item.name}</strong>
      <label>Cantidad <input type="number" min={1} max={999} step={1} value={item.quantity || ""} className="w-20 rounded-lg border p-2"
        onChange={event => onChange(value.map(row => row.product_id === item.product_id ? { ...row, quantity: Number(event.target.value) } : row))} /></label>
      <span>${(item.quantity * item.unit_price).toFixed(2)}</span>
      <button type="button" className="px-2 py-2 text-red-700" onClick={() => onChange(value.filter(row => row.product_id !== item.product_id))}>Quitar</button>
    </div>)}
    <p className="font-bold">Subtotal tienda física: ${productsTotal(value).toFixed(2)} USD</p>
  </div>;
}
