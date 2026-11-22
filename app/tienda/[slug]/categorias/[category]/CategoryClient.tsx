"use client";

/* =========================================================
   PÁGINA INDIVIDUAL DE CATEGORÍA - TIENDA POR SLUG

   Ruta:
   /tienda/[slug]/categorias/[category]

   Fix:
   - Carga productos usando el store default.
   - Filtra por categoría normalizada.
   - Los botones vuelven a /tienda.
========================================================= */

import { isXpressFreshProduct, XPRESS_PACKAGING_NOTICE } from "@/lib/shipping/xpress-checkout";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getWfCargoComboMunicipalities, getWfCargoComboDeliveryFee } from "@/lib/checkout/wfcargo-delivery";
import { CUBA_PROVINCES } from "@/lib/checkout/cuba-provinces";
import { productMatchesSearch } from "@/lib/utils/search";
import { getStoreProductsByStoreId } from "@/lib/services/products";
import { getStoreBySlug } from "@/lib/services/stores";
import CatalogFilters from "@/components/tienda/CatalogFilters";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/types/cart";

type Props = {
  slug: string;
  category: string;
};

type ProductImage = {
  image_url: string;
  is_main: boolean;
  position: number | null;
};

type ProductFromSupabase = Product & {
  product_images?: ProductImage[] | null;
};

const normalizarTexto = (texto: string = "") =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export default function CategoryClient({ slug, category }: Props) {
  const { addToCart } = useCart();

  const [province, setProvince] = useState("");
  const [busqueda] = useState("");
  const [productos, setProductos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryName = decodeURIComponent(category);
  const storeSlug = decodeURIComponent(slug);
  const needsProvince = storeSlug === "wf-cago" && normalizarTexto(categoryName) === "combos";
  const tiendaUrl = `/tienda/${storeSlug}`;

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("provincia");
    setProvince(CUBA_PROVINCES.find((option) => option === requested) ?? "");
    let mounted = true;

    async function cargarProductos() {
      setLoading(true);

      if (!storeSlug) {
        setProductos([]);
        setLoading(false);
        return;
      }

      const store = await getStoreBySlug(storeSlug);

      if (!mounted) return;

      if (!store?.id) {
        setProductos([]);
        setLoading(false);
        return;
      }

      const { data, error } = await getStoreProductsByStoreId(store.id);

      if (!mounted) return;

      if (error) {
        console.error("Error cargando productos de categoría:", error);
        setProductos([]);
        setLoading(false);
        return;
      }

      const productosConImagenPrincipal =
        ((data || []) as ProductFromSupabase[]).map((producto) => {
          const imagenPrincipal =
            producto.product_images?.find((img) => img.is_main) ||
            producto.product_images
              ?.slice()
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];

          return {
            ...producto,
            image_url: imagenPrincipal?.image_url || producto.image_url,
          };
        }) || [];

      setProductos(productosConImagenPrincipal);
      setLoading(false);
    }

    cargarProductos();

    return () => {
      mounted = false;
    };
  }, [storeSlug]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((producto) => {
      const mismaCategoria =
        normalizarTexto(producto.category ?? "") === normalizarTexto(categoryName);

      const coincideBusqueda = productMatchesSearch(producto, busqueda);

      return mismaCategoria && coincideBusqueda &&
        (!needsProvince || Boolean(province && producto.delivery_provinces?.includes(province)));
    });
  }, [productos, categoryName, busqueda, needsProvince, province]);

  const deliveryMunicipalities = getWfCargoComboMunicipalities(province);

  return (
    <main className="pb-28">
      <div className="px-4 pt-5">
        <div className="mb-6">
          <Link
            href={tiendaUrl}
            className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2563eb] hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#2563eb]">
              <ArrowLeft size={20} />
            </div>

            <div className="text-left">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Navegación
              </p>
              <p className="font-black text-[#061b3a]">Volver a la tienda</p>
            </div>
          </Link>
        </div>

        <h1 className="text-4xl font-black capitalize text-[#061b3a]">
          {categoryName}
        </h1>

        <p className="mt-2 text-sm font-medium text-slate-500">
          {needsProvince ? "Consulta las condiciones de domicilio de cada oferta." : "Todos los productos disponibles en esta categoría."}
        </p>
      </div>

      <section className="px-4 pt-4">
        {storeSlug === "xpress" && isXpressFreshProduct(categoryName) && (
          <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-800">{XPRESS_PACKAGING_NOTICE}</p>
        )}
        {needsProvince && (
          <label className="mb-5 block max-w-md rounded-2xl border border-slate-200 bg-white p-4 font-semibold text-slate-900">
            Provincia de entrega
            <select value={province} onChange={(event) => setProvince(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 p-3">
              <option value="">Selecciona la provincia de entrega</option>
              {CUBA_PROVINCES.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        )}
        {needsProvince && province !== "La Habana" && deliveryMunicipalities.length === 1 && productosFiltrados.length > 0 && (
          <p className="mb-5 text-sm font-semibold text-slate-700">
            Entrega solo en el municipio {deliveryMunicipalities[0]}. Domicilio: ${getWfCargoComboDeliveryFee(productosFiltrados, province)} USD por pedido.
          </p>
        )}
        {needsProvince && !province ? null : loading ? (
          <p className="py-10 text-center text-sm font-semibold text-slate-500">
            Cargando productos...
          </p>
        ) : productosFiltrados.length > 0 ? (
          <CatalogFilters
            key={`${storeSlug}:${categoryName}:${province}`}
            products={productosFiltrados}
            onAddToCart={addToCart}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-xl font-black text-[#061b3a]">
              No hay productos disponibles
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {needsProvince ? "Por el momento no hay combos disponibles para esta provincia." : "No encontramos productos activos para esta categoría."}
            </p>
          </div>
        )}
      </section>

      <div className="mt-10 flex justify-center px-4">
        <Link
          href={tiendaUrl}
          className="rounded-full bg-[#061b3a] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#0d2b57]"
        >
          Seguir comprando
        </Link>
      </div>
    </main>
  );
}
