"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getAdminProductsByStoreId } from "@/lib/services/products";
import { supabase } from "@/lib/supabase";
import { renderPost, type Format, type Template, type PostProduct } from "@/lib/marketing/post-renderer";

type Product = { id: string; name: string; price: number; image_url?: string | null; product_images?: { image_url: string; is_main: boolean; position: number | null }[] | null };
type Config = { product_ids?: string[]; product_id?: string; template?: Template; format?: Format; headline?: string; footer?: string; accent?: string; showQr?: boolean; showPrice?: boolean };
type Asset = { id: string; title: string; configuration: Config; created_at: string };
const colors = ["#C81E35", "#10233F", "#00875A", "#6D28D9", "#D97706"];
const templates: { id: Template; label: string; description: string }[] = [
  { id: "offer", label: "Oferta destacada", description: "Un producto y su precio" },
  { id: "multi", label: "Varios productos", description: "Hasta seis productos" },
  { id: "combo", label: "Combo", description: "Un combo del inventario" },
  { id: "store", label: "Promoción de tienda", description: "Hasta cuatro productos" },
];
function imageFor(p: Product) { const imgs = p.product_images || []; return imgs.find(i => i.is_main)?.image_url || [...imgs].sort((a,b)=>(a.position??0)-(b.position??0))[0]?.image_url || p.image_url || ""; }
export default function MarketingPostsPage() {
 const { loading, isSuperAdmin, store: accessStore } = useAdminAccess();
 const { store: selectedStore } = useStore();
 const store = useMemo(() => isSuperAdmin ? selectedStore || accessStore : accessStore, [isSuperAdmin, selectedStore, accessStore]);
 const storeId = store?.id, enabled = store?.module_marketing_posts_enabled === true;
 const [products,setProducts] = useState<Product[]>([]), [assets,setAssets] = useState<Asset[]>([]);
 const [ids,setIds] = useState<string[]>([]), [template,setTemplate] = useState<Template>("offer"), [format,setFormat] = useState<Format>("square");
 const [headline,setHeadline] = useState("¡Oferta especial!"), [footer,setFooter] = useState("Haz tu pedido hoy"), [accent,setAccent] = useState(colors[0]);
 const [showQr,setShowQr] = useState(true), [showPrice,setShowPrice] = useState(true), [search,setSearch] = useState(""), [error,setError] = useState(""), [busy,setBusy] = useState(false), [ready,setReady] = useState(false);
 const canvas = useRef<HTMLCanvasElement>(null);
 const selected = ids.map(id => products.find(p=>p.id===id)).filter((p):p is Product => Boolean(p));
 const max = template==="multi" ? 6 : template==="store" ? 4 : 1;
 const storeUrl = typeof window !== "undefined" ? window.location.origin + "/" : "";
 const productBase = typeof window !== "undefined" ? window.location.origin + "/producto/" : "";
 const shareUrl = selected.length === 1 ? productBase + encodeURIComponent(selected[0].id) : storeUrl;
 const shareMessage = `${store?.name || "Tienda"}\n${headline}\n${selected.map(p => p.name).join(", ")}\n${shareUrl}`;
 const postProducts: PostProduct[] = selected.map(p=>({id:p.id,name:p.name,price:p.price,image:imageFor(p),url: typeof window !== "undefined" ? productBase + encodeURIComponent(p.id) : ""}));
 useEffect(()=>{ let cancelled=false; setProducts([]);setAssets([]);setIds([]);setError(""); if(loading||!storeId||!enabled)return;
 Promise.all([getAdminProductsByStoreId(storeId),supabase.from("marketing_commercial_assets").select("id,title,configuration,created_at").eq("store_id",storeId).eq("kind","post").order("created_at",{ascending:false}).limit(30)]).then(([catalog,saved])=>{
 if(cancelled)return; if(catalog.error||saved.error)setError("No se pudieron cargar todos los datos.");
 const items=((catalog.data||[]) as Product[]).filter(p=>Boolean(imageFor(p)));setProducts(items);setIds(items.length?[items[0].id]:[]);setAssets((saved.data||[]) as Asset[]);
 }).catch(()=>{if(!cancelled)setError("No se pudo cargar el editor.");});return()=>{cancelled=true};
 },[loading,storeId,enabled]);
 useEffect(()=>{let cancelled=false;setReady(false); if(!canvas.current||!store||!selected.length)return;
 const timer=window.setTimeout(()=>{if(!canvas.current)return;
 void renderPost(canvas.current,{template,format,products:postProducts,storeName:store.name||"Tienda",storeUrl,headline,footer,accent,showQr,showPrice}).then(()=>{if(!cancelled){setReady(true);setError("");}}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"No se pudo generar la publicación.");});
 },180);return()=>{cancelled=true;window.clearTimeout(timer)};
 },[store,ids,products,template,format,headline,footer,accent,showQr,showPrice,storeUrl,productBase]);
 function toggle(id:string){setIds(current=>current.includes(id)?current.filter(x=>x!==id):current.length>=max?[...current.slice(1),id]:[...current,id]);}
 function changeTemplate(next:Template){setTemplate(next);setIds(current=>current.slice(0,next==="multi"?6:next==="store"?4:1));}
 async function save(){if(!storeId||!enabled||!selected.length||!ready)return;setBusy(true);try{
 const configuration:Config={product_ids:ids,template,format,headline,footer,accent,showQr,showPrice};
 const {data,error:e}=await supabase.from("marketing_commercial_assets").insert({store_id:storeId,kind:"post",title:headline||selected[0].name,configuration,is_published:false}).select("id,title,configuration,created_at").single();
 if(e)throw e;setAssets(current=>[data as Asset,...current].slice(0,30));setError("");
 }catch{setError("No se pudo guardar el borrador.");}finally{setBusy(false);}}
 async function exportImage(share=false){if(!canvas.current||!ready)return;try{
 const blob=await new Promise<Blob|null>(resolve=>canvas.current!.toBlob(resolve,"image/png"));if(!blob)throw new Error("No se pudo generar el archivo.");
 const file=new File([blob],"publicacion-"+(store?.slug||"tienda")+".png",{type:"image/png"});
 if(share&&navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:headline,text:shareMessage,url:shareUrl});return;}
 const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),10000);
 }catch(e){if(e instanceof Error&&e.name==="AbortError")return;setError("No se pudo exportar o compartir la imagen. Comprueba que las fotografías permitan exportación.");}}
 function restore(asset:Asset){const c=asset.configuration||{};const restored=(c.product_ids||[c.product_id||""]).filter(id=>products.some(p=>p.id===id));if(!restored.length){setError("Los productos de este borrador ya no están disponibles.");return;}
 setTemplate(c.template||"offer");setFormat(c.format||"square");setIds(restored);setHeadline(c.headline||"¡Oferta especial!");setFooter(c.footer||"Haz tu pedido hoy");setAccent(c.accent||colors[0]);setShowQr(c.showQr??true);setShowPrice(c.showPrice??true);}
 if(loading)return <main className="p-8">Verificando acceso...</main>;
 if(!storeId)return <main className="p-8">Selecciona una tienda.</main>;
 if(!enabled)return <main className="p-8"><h1>Módulo no habilitado</h1><Link href="/admin">Volver al panel</Link></main>;
 return <main className="mx-auto max-w-7xl space-y-6 p-5 md:p-10">
 <header><h1 className="text-3xl font-black">Crear publicaciones</h1><p className="text-slate-600">Tienda: {store?.name}. Diseña y comparte imágenes con productos de tu inventario.</p></header>
 {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
 <div className="grid gap-6 lg:grid-cols-2"><section className="space-y-5 rounded-2xl border bg-white p-5">
 <h2 className="text-xl font-bold">1. Elige una plantilla</h2><div className="grid grid-cols-2 gap-2">{templates.map(t=><button key={t.id} type="button" onClick={()=>changeTemplate(t.id)} aria-pressed={template===t.id} className={"rounded-xl border p-3 text-left "+(template===t.id?"border-blue-600 bg-blue-50":"")}><strong>{t.label}</strong><p className="text-xs text-slate-500">{t.description}</p></button>)}</div>
 <h2 className="text-xl font-bold">2. Selecciona productos ({ids.length}/{max})</h2><input className="w-full rounded-lg border p-3" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar productos de esta tienda"/>
 <div className="max-h-64 space-y-2 overflow-y-auto">{products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=><button key={p.id} type="button" onClick={()=>toggle(p.id)} aria-pressed={ids.includes(p.id)} className={"flex w-full items-center gap-3 rounded-lg border p-2 text-left "+(ids.includes(p.id)?"border-blue-600 bg-blue-50":"")}><img src={imageFor(p)} alt="" className="h-12 w-12 object-contain"/><span className="flex-1">{p.name}</span><strong>${Number(p.price).toFixed(2)}</strong></button>)}</div>
 <h2 className="text-xl font-bold">3. Personaliza</h2>
 <label className="block text-sm">Título promocional<input maxLength={65} className="mt-1 w-full rounded-lg border p-3" value={headline} onChange={e=>setHeadline(e.target.value)}/></label>
 <label className="block text-sm">Llamada a la acción<input maxLength={65} className="mt-1 w-full rounded-lg border p-3" value={footer} onChange={e=>setFooter(e.target.value)}/></label>
 <div className="flex flex-wrap gap-3">{colors.map(c=><button key={c} type="button" aria-label={"Color "+c} aria-pressed={accent===c} onClick={()=>setAccent(c)} className={"h-10 w-10 rounded-full "+(accent===c?"ring-4 ring-blue-300":"")} style={{backgroundColor:c}}/>)}</div>
 <label className="flex items-center gap-2"><input type="checkbox" checked={showPrice} onChange={e=>setShowPrice(e.target.checked)}/> Mostrar precios actuales</label>
 <label className="flex items-center gap-2"><input type="checkbox" checked={showQr} onChange={e=>setShowQr(e.target.checked)}/> Incluir QR de compra</label>
 <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2"><p className="font-semibold text-slate-900">{selected.length === 1 ? "Enlace directo del producto" : "Enlace de la tienda"}</p><input aria-label="Enlace de compra" readOnly value={selected.length ? shareUrl : ""} className="w-full rounded-lg border bg-white p-2 text-sm" /><div className="flex flex-wrap gap-2"><button type="button" disabled={!selected.length} onClick={()=>void navigator.clipboard.writeText(shareUrl).then(()=>setError("Enlace copiado.")).catch(()=>setError("No se pudo copiar el enlace."))} className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-50">Copiar enlace</button><button type="button" disabled={!selected.length} onClick={()=>window.open("https://wa.me/?text="+encodeURIComponent(shareMessage),"_blank","noopener,noreferrer")} className="rounded-lg bg-green-700 px-3 py-2 text-white disabled:opacity-50">Compartir enlace por WhatsApp</button></div>{selected.length > 1 && <p className="text-xs text-slate-600">La colección promocional todavía no está publicada: este enlace abre la tienda, no una selección exclusiva de productos.</p>}</div>
 <label className="block text-sm">Formato<select className="mt-1 w-full rounded-lg border p-3" value={format} onChange={e=>setFormat(e.target.value as Format)}><option value="square">Publicación cuadrada · 1080 × 1080</option><option value="story">Historia / estado · 1080 × 1920</option></select></label>
 <div className="flex flex-wrap gap-2"><button disabled={!ready||busy} onClick={save} className="rounded-lg bg-slate-900 px-4 py-3 text-white disabled:opacity-50">{busy?"Guardando...":"Guardar borrador"}</button><button disabled={!ready} onClick={()=>void exportImage()} className="rounded-lg bg-blue-600 px-4 py-3 text-white disabled:opacity-50">Descargar PNG</button><button disabled={!ready} onClick={()=>void exportImage(true)} className="rounded-lg bg-green-700 px-4 py-3 text-white disabled:opacity-50">Compartir imagen</button></div>
 </section><section className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Vista previa</h2><canvas ref={canvas} width={1080} height={1080} className="w-full rounded-xl border" aria-label="Vista previa de la publicación"/><p className="text-sm text-slate-500">Los precios provienen del inventario actual. Comprueba el QR y el diseño antes de compartir.</p></section></div>
 <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Borradores guardados</h2><div className="mt-3 space-y-2">{assets.map(a=><button key={a.id} type="button" onClick={()=>restore(a)} className="block w-full rounded-lg border p-3 text-left">{a.title} · {new Date(a.created_at).toLocaleDateString("es")}</button>)}{!assets.length&&<p className="text-sm text-slate-500">Aún no hay publicaciones guardadas.</p>}</div></section>
 </main>;
}
