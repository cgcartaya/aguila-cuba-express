import { useMemo, useState, type ReactNode } from "react";
import { useStore } from "@/hooks/useStore";
import {
  catalogWeightLb,
  catalogWeightRanges,
  filterCatalog,
} from "@/lib/storefront/catalog-filters";
import { getPlatformFeePercent } from "@/lib/storefront/product-quantity-pricing";
import type { Product } from "@/types/cart";
import ProductCard from "./ProductCard";

type Props = {
  products: Product[];
  onAddToCart: (product: Product) => void;
  showWeightFilter?: boolean;
  children?: ReactNode;
  inset?: boolean;
};

export default function CatalogFilters({
  products,
  onAddToCart,
  showWeightFilter,
  children,
  inset,
}: Props) {
  const { store } = useStore();
  const [sort, setSort] = useState("default");
  const [weightRange, setWeightRange] = useState("");
  const hasWeight = useMemo(
    () => showWeightFilter ?? products.some((product) => catalogWeightLb(product) !== null),
    [products, showWeightFilter],
  );
  const range = hasWeight && weightRange ? catalogWeightRanges[Number(weightRange)] : undefined;
  const sortByPrice = sort === "price-asc";
  const feePercent = getPlatformFeePercent(store);
  const results = useMemo(
    () => filterCatalog(products, range, sortByPrice, feePercent),
    [products, range, sortByPrice, feePercent],
  );
  const active = sortByPrice || Boolean(range);
  const selectClass = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

  return (
    <>
      {(products.length > 0 || hasWeight) && (
        <div className={`mb-4 flex flex-wrap items-end gap-3 ${inset ? "px-2 sm:px-4" : ""}`}>
          <label className="text-sm font-semibold text-slate-700">
            Ordenar por
            <select className={selectClass} value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="default">Orden de la tienda</option>
              <option value="price-asc">Precio de menor a mayor</option>
            </select>
          </label>
          {hasWeight && (
            <label className="text-sm font-semibold text-slate-700">
              Peso
              <select className={selectClass} value={weightRange} onChange={(event) => setWeightRange(event.target.value)}>
                <option value="">Todos los pesos</option>
                {catalogWeightRanges.map((option, index) => (
                  <option key={option.min} value={index}>{option.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {!active && children ? children : (
        <div className={inset ? "px-2 sm:px-4" : undefined}>
          <p role="status" className="mb-3 text-sm font-semibold text-slate-600">
            {results.length === 1 ? "1 producto encontrado" : `${results.length} productos encontrados`}
          </p>
          {results.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-slate-600">
              {range ? "No hay productos en este rango de peso." : "No encontramos productos."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
