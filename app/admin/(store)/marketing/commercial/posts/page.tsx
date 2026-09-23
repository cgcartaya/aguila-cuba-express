"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getAdminProductsByStoreId } from "@/lib/services/products";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string; name: string; price: number; image_url?: string | null;
  product_images?: { image_url: string; is_main: boolean; position: number | null }[] | null;
};
type Asset = { id: string; title: string; configuration: { product_id?: string; headline?: string; accent?: string; footer?: string }; created_at: string };
const colors = ["#C81E35", "#10233F", "#00875A", "#6D28D9", "#D97706"];
function imageFor(product: Product) {
  const images = product.product_images || [];
  return images.find((item) => item.is_main)?.image_url ||
    [...images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.image_url ||
    product.image_url || "";
}
function drawWrapped(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = value.split(/\s+/);
  let line = "", lines = 0;
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines++;
      line = word;
      if (lines >= maxLines) return;
    } else line = next;
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
}
async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.referrerPolicy = "no-referrer";
  image.src = url;
  await image.decode();
  return image;
}
export default function MarketingPostsPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore } = useStore();
  const store = useMemo(() => isSuperAdmin ? selectedStore || accessStore : accessStore, [isSuperAdmin, selectedStore, accessStore]);
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [productId, setProductId] = useState("");
  const [headline, setHeadline] = useState("¡Oferta especial!");
  const [footer, setFooter] = useState("Haz tu pedido hoy");
  const [accent, setAccent] = useState(colors[0]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const product = products.find((item) => item.id === productId);
  const storeId = store?.id;
  const enabled = store?.module_marketing_posts_enabled === true;

  useEffect(() => {
    let cancelled = false;
    setProducts([]); setAssets([]); setProductId(""); setError("");
    if (accessLoading || !storeId || !enabled) return;
    Promise.all([
      getAdminProductsByStoreId(storeId),
      supabase.from("marketing_commercial_assets")
        .select("id,title,configuration,created_at").eq("store_id", storeId).eq("kind", "post")
        .order("created_at", { ascending: false }).limit(20),
    ]).then(([catalog, saved]) => {
      if (cancelled) return;
      if (catalog.error || saved.error) setError("No se pudieron cargar todos los datos de la tienda.");
      const items = ((catalog.data || []) as Product[]).filter((item) => Boolean(imageFor(item)));
      setProducts(items);
      setProductId(items[0]?.id || "");
      setAssets((saved.data || []) as Asset[]);
    }).catch(() => { if (!cancelled) setError("No se pudo cargar el editor."); });
    return () => { cancelled = true; };
  }, [accessLoading, storeId, enabled]);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !product || !store) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const paint = async () => {
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = accent; ctx.fillRect(0, 0, 1080, 230);
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 46px Arial";
      drawWrapped(ctx, store.name || "Tienda", 55, 78, 960, 54, 2);
      ctx.font = "bold 62px Arial";
      drawWrapped(ctx, headline, 55, 176, 960, 64, 1);
      ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 230, 1080, 600);
      try {
        const img = await loadImage(imageFor(product));
        if (cancelled) return;
        const scale = Math.min(920 / img.width, 530 / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (1080 - w) / 2, 250 + (550 - h) / 2, w, h);
      } catch {
        if (cancelled) return;
        ctx.fillStyle = "#64748b"; ctx.font = "30px Arial";
        ctx.fillText("Imagen no disponible para exportar", 180, 520);
      }
      if (cancelled) return;
      ctx.fillStyle = "#0f172a"; ctx.font = "bold 43px Arial";
      drawWrapped(ctx, product.name, 55, 890, 950, 52, 2);
      ctx.fillStyle = accent; ctx.font = "bold 67px Arial";
      ctx.fillText("$" + Number(product.price).toFixed(2), 55, 1000);
      ctx.font = "26px Arial"; ctx.fillText(footer, 500, 995);
    };
    void paint();
    return () => { cancelled = true; };
  }, [product, store, headline, footer, accent]);

  async function save() {
    if (!storeId || !enabled || !product) return;
    setBusy(true); setError("");
    try {
      const { data, error: saveError } = await supabase.from("marketing_commercial_assets")
        .insert({ store_id: storeId, kind: "post", title: product.name,
          configuration: { product_id: product.id, headline, accent, footer }, is_published: false })
        .select("id,title,configuration,created_at").single();
      if (saveError) throw saveError;
      setAssets((current) => [data as Asset, ...current].slice(0, 20));
    } catch { setError("No se pudo guardar la publicación."); }
    finally { setBusy(false); }
  }
  function download() {
    const canvas = canvasRef.current;
    if (!canvas || !product) return;
    try {
      const link = document.createElement("a");
      link.download = "publicacion-" + product.id + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch { setError("El servidor de la fotografía no permite exportarla. Prueba otra imagen del producto."); }
  }
  if (accessLoading) return <main className="p-8">Verificando acceso...</main>;
  if (!storeId) return <main className="p-8">Selecciona una tienda.</main>;
  if (!enabled) return <main className="p-8"><h1 className="text-xl font-bold">Módulo no habilitado</h1><Link href="/admin">Volver al panel</Link></main>;
  return <main className="mx-auto max-w-7xl space-y-6 p-5 md:p-10">
    <div><h1 className="text-3xl font-black">Crear publicaciones</h1><p className="text-slate-600">Tienda: {store?.name}. Plantilla cuadrada 1080 × 1080 para redes sociales.</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-bold">1. Selecciona un producto</h2>
        <input className="w-full rounded-lg border p-3" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar productos de esta tienda" />
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {products.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())).map((item) =>
            <button type="button" key={item.id} onClick={() => setProductId(item.id)}
              className={"flex w-full items-center gap-3 rounded-lg border p-2 text-left " + (productId === item.id ? "border-blue-600 bg-blue-50" : "")}>
              <img src={imageFor(item)} alt="" className="h-12 w-12 object-contain" />
              <span className="flex-1">{item.name}</span><strong>${Number(item.price).toFixed(2)}</strong>
            </button>)}
          {!products.length && <p className="text-sm text-slate-600">No hay productos con fotografía disponibles.</p>}
        </div>
        <h2 className="text-xl font-bold">2. Personaliza la publicación</h2>
        <label className="block text-sm font-medium">Título promocional<input maxLength={70} className="mt-1 w-full rounded-lg border p-3" value={headline} onChange={(e) => setHeadline(e.target.value)} /></label>
        <label className="block text-sm font-medium">Texto inferior<input maxLength={60} className="mt-1 w-full rounded-lg border p-3" value={footer} onChange={(e) => setFooter(e.target.value)} /></label>
        <div className="flex flex-wrap gap-3" aria-label="Color de la plantilla">{colors.map((color) =>
          <button type="button" key={color} aria-label={"Elegir color " + color} aria-pressed={accent === color}
            onClick={() => setAccent(color)} className={"h-10 w-10 rounded-full " + (accent === color ? "ring-4 ring-blue-300" : "")} style={{ backgroundColor: color }} />)}</div>
        <div className="flex flex-wrap gap-3"><button type="button" disabled={!product || busy} onClick={save} className="rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-50">{busy ? "Guardando..." : "Guardar borrador"}</button>
          <button type="button" disabled={!product} onClick={download} className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50">Descargar PNG</button></div>
      </section>
      <section className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Vista previa</h2>
        <canvas ref={canvasRef} width={1080} height={1080} className="w-full rounded-xl border" aria-label="Vista previa de la publicación" />
        <p className="text-sm text-slate-500">El precio se toma del producto actual. Comprueba la imagen antes de compartirla.</p>
      </section>
    </div>
    <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Borradores guardados</h2>
      <div className="mt-3 space-y-2">{assets.map((asset) => <button key={asset.id} type="button" className="block w-full rounded-lg border p-3 text-left"
        onClick={() => { const match = products.find((item) => item.id === asset.configuration.product_id); if (!match) { setError("Este producto ya no está disponible."); return; }
          setProductId(match.id); setHeadline(asset.configuration.headline || "¡Oferta especial!"); setAccent(asset.configuration.accent || colors[0]); setFooter(asset.configuration.footer || "Haz tu pedido hoy"); }}>
        {asset.title} · {new Date(asset.created_at).toLocaleDateString("es")}</button>)}
        {!assets.length && <p className="text-sm text-slate-500">Aún no hay publicaciones guardadas.</p>}</div>
    </section>
  </main>;
}
