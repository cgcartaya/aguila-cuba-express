"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Package, Plus, Search, Store } from "lucide-react";
import { gestorApi } from "@/lib/shareapp/client";
import {
  itemAvailable,
  newDraft,
  type CatalogItem,
  type Draft,
} from "@/lib/shareapp/workspace-types";
import { catalogImage } from "@/lib/shareapp/workspace-types";
import styles from "./workspace.module.css";
export default function CatalogPanel({
  storeId,
  storeName,
  online,
  onPrepare,
}: {
  storeId: string;
  storeName: string;
  online: boolean;
  onPrepare: (draft: Draft) => void;
}) {
  const [kind, setKind] = useState<"product" | "combo">("product");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    void gestorApi<{ items: CatalogItem[]; hasMore: boolean }>(
      `catalog?storeId=${storeId}&kind=${kind}&q=${encodeURIComponent(search)}&page=${page}`,
    )
      .then((data) => {
        if (current) {
          setError("");
          setItems(data.items);
          setMore(data.hasMore);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (current) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [storeId, kind, search, page]);
  function changeKind(value: "product" | "combo") {
    if (value === kind) return;
    setKind(value);
    setPage(0);
    setLoading(true);
    setError("");
  }
  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.segments}>
          <button
            aria-pressed={kind === "product"}
            onClick={() => changeKind("product")}
          >
            Productos
          </button>
          <button
            aria-pressed={kind === "combo"}
            onClick={() => changeKind("combo")}
          >
            Combos
          </button>
        </div>
        <form
          className={styles.search}
          onSubmit={(e) => {
            e.preventDefault();
            if (search !== query.trim() || page !== 0) {
              setLoading(true);
              setError("");
            }
            setSearch(query.trim());
            setPage(0);
          }}
        >
          <Search size={17} />
          <input
            aria-label="Buscar en el catálogo"
            placeholder="Buscar por nombre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button>Buscar</button>
        </form>
        <button
          className={styles.secondary}
          disabled={!online}
          onClick={() => onPrepare(newDraft(undefined, kind, storeName))}
        >
          <Store size={16} />
          Toda la tienda
        </button>
      </div>
      {error && (
        <p role="alert" className={`${styles.alert} ${styles.error}`}>
          {error}
        </p>
      )}
      {loading ? (
        <div aria-label="Cargando catálogo" className={styles.grid}>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className={styles.skeleton} />
          ))}
        </div>
      ) : items.length ? (
        <div className={styles.grid}>
          {items.map((item) => {
            const available = itemAvailable(item, storeId, kind);
            const image = catalogImage(item);
            return (
              <article key={item.id} className={styles.product}>
                <div className={styles.productImage}>
                  {image ? (
                    <Image
                      unoptimized
                      src={image}
                      width={230}
                      height={145}
                      alt={item.name}
                    />
                  ) : (
                    <Package size={42} color="#c0c4d4" />
                  )}
                  <span
                    className={`${styles.badge} ${!available ? styles.badgeMuted : ""}`}
                  >
                    {available ? "● Disponible" : "Sin disponibilidad"}
                  </span>
                </div>
                <div className={styles.productInfo}>
                  <span className={styles.category}>
                    {item.category ||
                      (kind === "combo"
                        ? "Combo de la tienda"
                        : "Producto de la tienda")}
                  </span>
                  <h3 title={item.name}>{item.name}</h3>
                  <div className={styles.price}>
                    ${Number(item.price).toFixed(2)}
                    <span>USD</span>
                  </div>
                  <button
                    className={styles.primary}
                    disabled={!available || !online}
                    onClick={() => onPrepare(newDraft(item, kind, storeName))}
                  >
                    <Plus size={15} />
                    Crear publicación
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <Search size={34} />
          <h2>No encontramos productos</h2>
          <p>Prueba otro nombre o cambia entre productos y combos.</p>
        </div>
      )}
      <div className={styles.pagination}>
        <button
          className={styles.secondary}
          disabled={!page || loading}
          onClick={() => {
            setPage((p) => p - 1);
            setLoading(true);
          }}
        >
          Anterior
        </button>
        <span>Página {page + 1}</span>
        <button
          className={styles.secondary}
          disabled={!more || loading}
          onClick={() => {
            setPage((p) => p + 1);
            setLoading(true);
          }}
        >
          Siguiente
        </button>
      </div>
      <p
        className={styles.fresh}
        style={{ textAlign: "center", marginTop: 18 }}
      >
        Precios y disponibilidad se confirman en la tienda al comprar.
      </p>
    </>
  );
}
