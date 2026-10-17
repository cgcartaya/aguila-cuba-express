"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { shareappApi, type Result } from "@/lib/shareapp/client";
import Results from "@/components/shareapp/Results";

type Membership = {
  id: string;
  store_id: string;
  display_name: string;
  stores: { name: string };
};
type Item = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  stock?: number;
  product_images?: { image_url: string; is_main: boolean }[];
  combo_items?: {
    quantity: number;
    products: {
      stock: number;
      is_active: boolean;
      store_id: string;
      deleted_at: string | null;
    } | null;
  }[];
};
function available(item: Item, storeId: string, kind: string) {
  if (kind === "product") return Number(item.stock) > 0;
  return (
    Boolean(item.combo_items?.length) &&
    item.combo_items!.every(
      (row) =>
        row.quantity > 0 &&
        row.products?.is_active &&
        !row.products.deleted_at &&
        row.products.store_id === storeId &&
        row.products.stock >= row.quantity,
    )
  );
}
export default function GestoresPage() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [storeId, setStoreId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [rows, setRows] = useState<Result[]>([]);
  const [kind, setKind] = useState("product");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [network, setNetwork] = useState("whatsapp");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invite, setInvite] = useState("");
  const loadStores = useCallback(async () => {
    const data = await shareappApi<{ memberships: Membership[] }>("stores");
    setMemberships(data.memberships);
    setStoreId((current) =>
      data.memberships.some((row) => row.store_id === current)
        ? current
        : data.memberships[0]?.store_id || "",
    );
  }, []);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setInvite(
        new URLSearchParams(window.location.search).get("invite") || "",
      );
      setSignedIn(Boolean(data.session));
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (signedIn)
      void supabase.auth
        .getSession()
        .then(() => loadStores())
        .catch((e) => setError(e.message));
  }, [signedIn, loadStores]);
  useEffect(() => {
    if (!signedIn || !storeId) return;
    let canceled = false;
    void Promise.all([
      shareappApi<{ items: Item[]; hasMore: boolean }>(
        `catalog?storeId=${storeId}&kind=${kind}&q=${encodeURIComponent(search)}&page=${page}`,
      ),
      shareappApi<{ results: Result[] }>(`results?storeId=${storeId}`),
    ])
      .then(([catalog, stats]) => {
        if (!canceled) {
          setItems(catalog.items);
          setMore(catalog.hasMore);
          setRows(stats.results);
        }
      })
      .catch((e) => {
        if (!canceled) setError(e.message);
      });
    return () => {
      canceled = true;
    };
  }, [signedIn, storeId, kind, search, page]);
  async function act(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar.");
    } finally {
      setBusy(false);
    }
  }
  async function prepare(item?: Item) {
    const result = await shareappApi<{ url: string }>("links", {
      storeId,
      kind: item ? kind : "store",
      itemId: item?.id,
      network,
      title: item?.name || "Visita mi tienda",
    });
    setUrl(result.url);
    setText(
      item
        ? `${item.name}\nPrecio: ${Number(item.price).toFixed(2)} USD\n${item.description || ""}`
        : `Descubre los productos de ${memberships.find((row) => row.store_id === storeId)?.stores.name || "nuestra tienda"}.`,
    );
    setNotice(
      "Enlace preparado. Revisa el texto y compártelo desde el recuadro de publicación.",
    );
  }
  async function copy() {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setNotice("Texto y enlace copiados.");
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text: `${text}\n${url}` });
      } catch (e) {
        if ((e as Error).name !== "AbortError") throw e;
      }
    } else await copy();
  }
  if (!ready) return <main className="p-8">Cargando ShareAPP…</main>;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
              Perla Marketplace
            </p>
            <h1 className="mt-1 text-4xl font-black">ShareAPP</h1>
            <p className="mt-2 text-slate-500">
              Comparte productos. Conoce tus resultados.
            </p>
          </div>
          {signedIn && (
            <button
              className="rounded-xl border bg-white px-4 py-2"
              onClick={() =>
                void act(async () => {
                  await supabase.auth.signOut();
                  setMemberships([]);
                  setStoreId("");
                  setItems([]);
                  setRows([]);
                  setUrl("");
                  setText("");
                })
              }
            >
              Cerrar sesión
            </button>
          )}
        </header>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 p-4 text-emerald-800"
          >
            {notice}
          </p>
        )}
        {!signedIn ? (
          <form
            className="mx-auto max-w-md space-y-4 rounded-3xl border bg-white p-6"
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password,
                });
                if (error) throw error;
                setPassword("");
              });
            }}
          >
            <h2 className="text-xl font-bold">Entrar como gestor</h2>
            <p className="text-sm text-slate-500">
              Usa tu cuenta de Perla Marketplace. Si aún no tienes cuenta,
              solicita al administrador que la prepare antes de aceptar la
              invitación.
            </p>
            <label className="block">
              Correo
              <input
                className="mt-1 w-full rounded-xl border p-3"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              Contraseña
              <input
                className="mt-1 w-full rounded-xl border p-3"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              disabled={busy}
              className="w-full rounded-xl bg-indigo-600 p-3 font-bold text-white disabled:opacity-50"
            >
              Entrar
            </button>
          </form>
        ) : (
          <>
            {invite && (
              <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                <h2 className="font-bold">
                  Tienes una invitación para promocionar una tienda
                </h2>
                <p className="mt-2 text-sm">
                  Al aceptarla se vinculará a la cuenta con la que has iniciado
                  sesión.
                </p>
                <button
                  disabled={busy}
                  className="mt-3 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white"
                  onClick={() =>
                    void act(async () => {
                      await shareappApi("join", { code: invite });
                      setInvite("");
                      window.history.replaceState(null, "", "/gestores");
                      await loadStores();
                      setNotice("Invitación aceptada.");
                    })
                  }
                >
                  Aceptar invitación
                </button>
              </section>
            )}
            {!memberships.length ? (
              <section className="rounded-2xl border bg-white p-8 text-center">
                <h2 className="text-xl font-bold">
                  Todavía no tienes tiendas habilitadas
                </h2>
                <p className="mt-3 text-slate-500">
                  Pide al dueño que habilite ShareAPP y te comparta una
                  invitación.
                </p>
                <button
                  className="mt-4 rounded-xl border px-4 py-2"
                  onClick={() => void act(loadStores)}
                >
                  Actualizar mis tiendas
                </button>
              </section>
            ) : (
              <>
                <label className="block font-bold">
                  Mi tienda
                  <select
                    className="mt-2 w-full rounded-xl border bg-white p-3"
                    value={storeId}
                    onChange={(e) => {
                      setStoreId(e.target.value);
                      setItems([]);
                      setRows([]);
                      setUrl("");
                      setText("");
                      setError("");
                      setPage(0);
                    }}
                  >
                    {memberships.map((row) => (
                      <option key={row.id} value={row.store_id}>
                        {row.stores.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Results rows={rows} />
                <section className="space-y-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <h2 className="mr-auto text-2xl font-black">
                      Catálogo para compartir
                    </h2>
                    <label>
                      Contenido
                      <select
                        className="ml-2 rounded-xl border bg-white p-2"
                        value={kind}
                        onChange={(e) => {
                          setKind(e.target.value);
                          setItems([]);
                          setPage(0);
                        }}
                      >
                        <option value="product">Productos</option>
                        <option value="combo">Combos</option>
                      </select>
                    </label>
                    <label>
                      Red
                      <select
                        className="ml-2 rounded-xl border bg-white p-2"
                        value={network}
                        onChange={(e) => {
                          setNetwork(e.target.value);
                          setUrl("");
                          setText("");
                        }}
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                        <option value="telegram">Telegram</option>
                        <option value="other">Otra</option>
                      </select>
                    </label>
                  </div>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setPage(0);
                      setItems([]);
                      setSearch(q);
                    }}
                  >
                    <input
                      aria-label="Buscar productos"
                      className="min-w-0 flex-1 rounded-xl border bg-white p-3"
                      placeholder="Buscar por nombre…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                    <button className="rounded-xl bg-slate-900 px-4 text-white">
                      Buscar
                    </button>
                  </form>
                  <button
                    disabled={busy}
                    className="rounded-xl border bg-white px-4 py-3 font-bold"
                    onClick={() => void act(() => prepare())}
                  >
                    Preparar enlace de la tienda completa
                  </button>
                  {url && (
                    <section className="space-y-3 rounded-2xl border-2 border-indigo-200 bg-white p-5">
                      <h3 className="font-bold">Tu publicación</h3>
                      <textarea
                        aria-label="Texto de publicación"
                        className="min-h-28 w-full rounded-xl border p-3"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                      />
                      <p className="break-all rounded-lg bg-slate-50 p-3 text-sm">
                        {url}
                      </p>
                      <p className="text-sm text-slate-500">
                        Conserva este enlace en la publicación para que las
                        visitas y pedidos se atribuyan a tu cuenta. El precio y
                        la disponibilidad se confirman en la tienda.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          disabled={busy}
                          className="rounded-xl border px-4 py-3 font-bold"
                          onClick={() => void act(copy)}
                        >
                          Copiar texto y enlace
                        </button>
                        <button
                          disabled={busy}
                          className="rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white"
                          onClick={() => void act(share)}
                        >
                          Compartir…
                        </button>
                      </div>
                    </section>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => {
                      const inStock = available(item, storeId, kind);
                      const image =
                        item.image_url ||
                        item.product_images?.find((row) => row.is_main)
                          ?.image_url ||
                        item.product_images?.[0]?.image_url;
                      return (
                        <article
                          key={item.id}
                          className="flex flex-col rounded-2xl border bg-white p-4"
                        >
                          {image ? (
                            <div className="mb-3 flex h-40 items-center justify-center">
                              <Image
                                unoptimized
                                width={240}
                                height={160}
                                alt={item.name}
                                src={image}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="mb-3 grid h-40 place-items-center rounded-xl bg-slate-100 text-slate-400">
                              Sin imagen
                            </div>
                          )}
                          <h3 className="font-bold">{item.name}</h3>
                          <p className="mt-2 text-xl font-black text-indigo-600">
                            ${Number(item.price).toFixed(2)} USD
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {inStock ? "Disponible" : "Sin disponibilidad"}
                          </p>
                          <button
                            disabled={busy || !inStock}
                            className="mt-4 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-40"
                            onClick={() => void act(() => prepare(item))}
                          >
                            Preparar publicación
                          </button>
                        </article>
                      );
                    })}
                  </div>
                  {!items.length && (
                    <p className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                      No hay resultados para esta búsqueda.
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      className="rounded-xl border px-4 py-2 disabled:opacity-30"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </button>
                    <span>Página {page + 1}</span>
                    <button
                      className="rounded-xl border px-4 py-2 disabled:opacity-30"
                      disabled={!more}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                    </button>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
