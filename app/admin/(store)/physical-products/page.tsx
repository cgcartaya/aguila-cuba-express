"use client";

import { useEffect, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { listPhysicalProducts, savePhysicalProduct, type PhysicalStoreProduct } from "@/lib/services/physical-store-products";

export default function PhysicalProductsPage() {
  const access = useAdminAccess();
  const selected = useStore();
  const store = access.isSuperAdmin ? selected.store || access.store : access.store;

  if (access.loading || selected.loading) return <p>Cargando tienda…</p>;
  if (!store || store.slug !== "alvarez-travel") return <p>Catálogo físico no disponible para esta tienda.</p>;
  return <PhysicalCatalog key={store.id} storeId={store.id} />;
}

function PhysicalCatalog({ storeId }: { storeId: string }) {
  const [products, setProducts] = useState<PhysicalStoreProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<PhysicalStoreProduct | "new" | null>(null);

  useEffect(() => {
    let active = true;
    listPhysicalProducts(storeId).then(rows => {
      if (active) setProducts(rows);
    }).catch(cause => {
      if (active) setError(cause.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [storeId]);

  async function save(values: Omit<PhysicalStoreProduct, "id">, previous?: PhysicalStoreProduct) {
    setError("");
    setSaving(true);
    try {
      await savePhysicalProduct(storeId, values, previous);
      setEditing(null);
      setProducts(await listPhysicalProducts(storeId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  const visible = products.filter(product => product.name.toLowerCase().includes(search.trim().toLowerCase()));

  return <main className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Productos tienda física</h1>
        <p className="text-sm text-slate-600">Catálogo de Hialeah para paquetes con viaje. Precios en USD y existencias por unidad.</p></div>
      <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-white" disabled={loading || saving} onClick={() => setEditing("new")}>Agregar producto</button>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
    {editing && <ProductForm key={editing === "new" ? editing : editing.id}
      product={editing === "new" ? undefined : editing} saving={saving}
      onCancel={() => setEditing(null)} onSave={save} />}
    <label className="block text-sm font-semibold">Buscar en el catálogo
      <input type="search" value={search} onChange={event => setSearch(event.target.value)} className="mt-1 block w-full max-w-md rounded-xl border p-3" />
    </label>
    {loading ? <p>Cargando productos…</p> : <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50"><tr><th className="p-3">Producto</th><th className="p-3">Precio</th><th className="p-3">Stock</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
        <tbody>{visible.map(product => <tr key={product.id} className="border-t">
          <td className="p-3 font-semibold">{product.name}</td>
          <td className="p-3 whitespace-nowrap">{product.price === null ? "Pendiente" : `$${product.price.toFixed(2)}`}</td>
          <td className="p-3">{product.stock}</td>
          <td className="p-3">{!product.is_active ? "Retirado" : product.price === null ? "Sin precio" : product.stock === 0 ? "Agotado" : "Disponible"}</td>
          <td className="p-3 whitespace-nowrap">
            <button type="button" className="mr-3 underline" disabled={saving} onClick={() => setEditing(product)}>Editar</button>
            <button type="button" className="underline" disabled={saving} onClick={() => {
              const { name, price, stock, is_active } = product;
              void save({ name, price, stock, is_active: !is_active }, product);
            }}>{product.is_active ? "Retirar" : "Reactivar"}</button>
          </td>
        </tr>)}</tbody>
      </table>
      {!visible.length && <p className="p-3">No hay productos que coincidan.</p>}
    </div>}
  </main>;
}

function ProductForm({ product, saving, onCancel, onSave }: {
  product?: PhysicalStoreProduct;
  saving: boolean;
  onCancel: () => void;
  onSave: (values: Omit<PhysicalStoreProduct, "id">, previous?: PhysicalStoreProduct) => Promise<void>;
}) {
  return <form className="rounded-xl border bg-slate-50 p-4" onSubmit={event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const price = String(form.get("price"));
    void onSave({
      name: String(form.get("name")).trim(),
      price: price === "" ? null : Number(price),
      stock: Number(form.get("stock")),
      is_active: product?.is_active ?? true,
    }, product);
  }}>
    <h2 className="mb-3 font-bold">{product ? "Editar producto" : "Nuevo producto"}</h2>
    <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
      <label>Nombre<input name="name" required maxLength={200} defaultValue={product?.name} className="block w-full rounded-lg border bg-white p-2" /></label>
      <label>Precio (USD)<input name="price" type="number" min={0} max={99999999.99} step="0.01" defaultValue={product?.price ?? ""} className="block w-full rounded-lg border bg-white p-2" /></label>
      <label>Stock<input name="stock" type="number" required min={0} max={2147483647} step={1} defaultValue={product?.stock ?? 0} className="block w-full rounded-lg border bg-white p-2" /></label>
    </div>
    <div className="mt-4 flex gap-3">
      <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Guardar</button>
      <button type="button" onClick={onCancel} disabled={saving} className="px-4 py-2">Cancelar</button>
    </div>
  </form>;
}
