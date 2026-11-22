import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getStoreBySlug } from "@/lib/services/stores";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { applyPlatformFee, getPlatformFeePercent } from "@/lib/storefront/product-quantity-pricing";
import { xpressWhatsApp } from "./content";
import styles from "./xpress.module.css";

const featuredSkus = [
  "XPRESS-FRESH-pina",
  "66542",
  "55675",
  "73137",
  "XPRESS-FRESH-fresas",
  "XPRESS-FRESH-bananas",
  "36897",
  "30127",
];
const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default async function XpressCatalog({ storeSlug, canonicalUrl }: { storeSlug?: string; canonicalUrl?: string }) {
  const store = storeSlug ? await getStoreBySlug(storeSlug) : null;
  const shop = canonicalUrl
    ? new URL("/tienda", canonicalUrl).href
    : storeSlug ? `/tienda/${storeSlug}` : null;
  const result = store?.is_active && store.module_store_enabled
    ? await supabaseAdmin.from("products")
        .select("id,sku,name,category,price,image_url,platform_fee_exempt")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .eq("combo_only", false)
        .is("deleted_at", null)
        .gt("stock", 0)
        .in("sku", featuredSkus)
    : null;
  const candidates = featuredSkus.flatMap((sku) => {
    const product = result?.data?.find((item) => item.sku === sku);
    return product?.image_url && /^(https:\/\/|\/(?!\/))/.test(product.image_url)
      ? [{ ...product, image_url: product.image_url }]
      : [];
  });
  const fruit = candidates.find((item) => item.sku.startsWith("XPRESS-FRESH-"));
  const products = [fruit, ...candidates.filter((item) => item !== fruit)].filter(
    (item): item is (typeof candidates)[number] => item !== undefined,
  ).slice(0, 4);
  const feePercent = getPlatformFeePercent(store);

  return (
    <section id="tienda" className={styles.catalog} aria-labelledby="xpress-catalog-heading">
      <header className={styles.catalogHeading}>
        <h2 id="xpress-catalog-heading">Compra en Xpress</h2>
        <p>Frutas frescas, alimentos y más para enviar a Cuba.</p>
      </header>
      {shop && products.length > 0 && (
        <ul className={styles.catalogGrid}>
          {products.map((product) => (
            <li key={product.id}>
              <Link href={`${shop}/producto/${product.id}`} className={styles.catalogCard}>
                <div className={styles.catalogPhoto}>
                  <Image src={product.image_url} alt="" fill unoptimized sizes="(max-width: 700px) 43vw, 270px" />
                </div>
                <div className={styles.catalogInfo}>
                  <p>{product.category}</p>
                  <h3>{product.name}</h3>
                  <strong>{dollars.format(applyPlatformFee(Number(product.price), product.platform_fee_exempt ? 0 : feePercent))} <small>USD</small></strong>
                  <span>Ver producto <ArrowRight size={16} aria-hidden /></span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {shop ? (
        <Link className={styles.primary} href={shop}>Ver catálogo completo <ArrowRight size={18} aria-hidden /></Link>
      ) : (
        <a className={styles.primary} href={xpressWhatsApp("Hola, quisiera consultar los productos de la tienda.")}>Consultar productos</a>
      )}
    </section>
  );
}
