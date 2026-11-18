import { wfCopy, type WfLocale } from "./Language";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { wfSlug } from "@/lib/procedures/server";
import styles from "./catalog-section.module.css";

const featuredIds = [
  "1464ba95-6319-4e5e-b257-9255d1274f26",
  "3bc8e1d2-55ea-4add-b351-d6b8e3f3b66a",
  "0fbfd6b2-f7a9-4f0f-b3a2-88683263096e",
  "109599c5-47d8-403b-9246-9839b0bd6ff9",
];

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function CatalogSection({ locale }: { locale: WfLocale }) {
  const t = wfCopy(locale);
  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id,slug")
    .eq("slug", wfSlug)
    .eq("is_active", true)
    .eq("module_store_enabled", true)
    .maybeSingle();

  if (storeError || !store) return null;

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id,name,category,price,image_url")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .eq("combo_only", false)
    .is("deleted_at", null)
    .gt("stock", 0)
    .in("id", featuredIds);

  if (error) return null;

  const products = featuredIds.flatMap((id) => {
    const product = data.find((item) => item.id === id);
    return product?.image_url ? [{ ...product, image_url: product.image_url }] : [];
  });
  const shop = `/tienda/${store.slug}`;

  return (
    <section id="tienda-virtual" className={styles.section} aria-labelledby="wf-catalog-heading">
      <header className={styles.heading}>
        <p><ShoppingBag size={17} aria-hidden="true" /> {t("Tienda virtual", "Online store")}</p>
        <h2 id="wf-catalog-heading">{t("Compra en WF Cargo", "Shop at WF Cargo")}</h2>
        <span>{t("Equipos para el hogar, telefonía y alimentos en un solo lugar.", "Home appliances, phones, and groceries in one place.")}</span>
      </header>
      {products.length > 0 && (
        <ul className={styles.grid}>
          {products.map((product) => (
            <li key={product.id}>
              <Link href={`${shop}/producto/${product.id}`} className={styles.card}>
                <div className={styles.photo}>
                  <Image src={product.image_url} alt="" fill sizes="(max-width: 700px) 42vw, (max-width: 1000px) 44vw, 260px" />
                </div>
                <div className={styles.info}>
                  <p>{product.category}</p>
                  <h3>{product.name}</h3>
                  <div className={styles.price}>{dollars.format(product.price)} <span>USD</span></div>
                  <span className={styles.detail}>{t("Ver producto", "View product")} <ArrowRight size={16} aria-hidden="true" /></span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link className={styles.cta} href={shop}>
        {t("Ver catálogo completo", "View full catalog")} <ArrowRight size={19} aria-hidden="true" />
      </Link>
    </section>
  );
}
