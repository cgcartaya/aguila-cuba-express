"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, Package, Plus, Search, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { listPhysicalProducts, savePhysicalProduct, type PhysicalStoreProduct } from "@/lib/services/physical-store-products";

const statuses = {
  available: { label: "Disponible", style: "bg-emerald-100 text-emerald-800" },
  unpriced: { label: "Sin precio", style: "bg-amber-100 text-amber-900" },
  soldOut: { label: "Agotado", style: "bg-rose-100 text-rose-800" },
  inactive: { label: "Retirado", style: "bg-slate-100 text-slate-700" },
};

const filters = [
  ["all", "Todos"],
  ["available", "Disponibles"],
  ["unpriced", "Sin precio"],
  ["soldOut", "Agotados"],
  ["inactive", "Retirados"],
] as const;

function productStatus(product: PhysicalStoreProduct): keyof typeof statuses {
  if (!product.is_active) return "inactive";
  if (product.price === null) return "unpriced";
  return product.stock === 0 ? "soldOut" : "available";
}

const pageSize = 8;
const actionStyle = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40";

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
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("all");
  const [page, setPage] = useState(1);
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

  const query = search.trim().toLowerCase();
  const matching = products.filter(product =>
    product.name.toLowerCase().includes(query) && (filter === "all" || productStatus(product) === filter)
  );
  const totalPages = Math.max(1, Math.ceil(matching.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;
  const visible = matching.slice(offset, offset + pageSize);
  const stats = [
    { label: "Productos", count: products.length, icon: Package },
    { label: "Disponibles", count: products.filter(product => productStatus(product) === "available").length, icon: CheckCircle2 },
    { label: "Sin precio", count: products.filter(product => productStatus(product) === "unpriced").length, icon: Tag },
  ];

  return <main className="space-y-5 rounded-2xl bg-slate-50 p-4 text-slate-950 sm:p-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm text-slate-500">Tienda / <span className="font-semibold text-slate-800">Inventario</span></p>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Productos tienda física</h1>
        <p className="text-sm text-slate-600">Catálogo de Hialeah para paquetes con viaje.</p>
      </div>
      <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
        disabled={loading || saving} onClick={() => setEditing("new")}><Plus size={18} aria-hidden="true" />Agregar producto</button>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
    <dl className="grid gap-3 sm:grid-cols-3">
      {stats.map(({ label, count, icon: Icon }) => <div key={label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="rounded-lg bg-slate-100 p-2.5 text-slate-800"><Icon size={23} aria-hidden="true" /></span>
        <div><dt className="text-sm font-medium text-slate-600">{label}</dt><dd className="text-2xl font-extrabold tabular-nums">{loading ? "—" : count}</dd></div>
      </div>)}
    </dl>
    {editing && <ProductForm key={editing === "new" ? editing : editing.id}
      product={editing === "new" ? undefined : editing} saving={saving}
      onCancel={() => setEditing(null)} onSave={save} />}
    <section aria-label="Catálogo de Hialeah" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Buscar en el catálogo</span>
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-500" />
          <input type="search" placeholder="Buscar producto…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm" />
        </label>
        <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
          {filters.map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key}
            onClick={() => { setFilter(key); setPage(1); }}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${filter === key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>{label}</button>)}
        </div>
      </div>
      {loading ? <p role="status" className="p-6 text-slate-600">Cargando productos…</p> : <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-slate-100 text-slate-700"><tr>
              {["Producto", "Precio USD", "Stock", "Estado", "Acciones"].map(label => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">{visible.map(product => {
              const status = statuses[productStatus(product)];
              return <tr key={product.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">{product.name}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{product.price === null ? "—" : `$${product.price.toFixed(2)}`}</td>
                <td className="px-4 py-3 tabular-nums">{product.stock}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${status.style}`}><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{status.label}</span></td>
                <td className="px-4 py-3"><div className="flex gap-2">
                  <button type="button" className={actionStyle} aria-label={`Editar ${product.name}`} disabled={saving} onClick={() => setEditing(product)}>Editar</button>
                  <button type="button" className={actionStyle} aria-label={`${product.is_active ? "Retirar" : "Reactivar"} ${product.name}`} disabled={saving} onClick={() => {
                    const { name, price, stock, is_active } = product;
                    void save({ name, price, stock, is_active: !is_active }, product);
                  }}>{product.is_active ? "Retirar" : "Reactivar"}</button>
                </div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {!visible.length && <p className="p-6 text-center text-sm text-slate-600">No hay productos que coincidan.</p>}
        {matching.length > 0 && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm text-slate-600">
          <p>Mostrando {offset + 1}–{offset + visible.length} de {matching.length} productos</p>
          {totalPages > 1 && <nav aria-label="Páginas del catálogo" className="flex items-center gap-2">
            <button type="button" aria-label="Página anterior" disabled={currentPage === 1} className={actionStyle} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} /></button>
            <span>Página {currentPage} de {totalPages}</span>
            <button type="button" aria-label="Página siguiente" disabled={currentPage === totalPages} className={actionStyle} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} /></button>
          </nav>}
        </footer>}
      </>}
    </section>
  </main>;
}

function ProductForm({ product, saving, onCancel, onSave }: {
  product?: PhysicalStoreProduct;
  saving: boolean;
  onCancel: () => void;
  onSave: (values: Omit<PhysicalStoreProduct, "id">, previous?: PhysicalStoreProduct) => Promise<void>;
}) {
  return <form className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={event => {
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
