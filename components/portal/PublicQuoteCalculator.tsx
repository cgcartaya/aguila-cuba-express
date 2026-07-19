"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, Loader2, MessageCircle, Package, Plane, Ship, Truck } from "lucide-react";

type Option = { id: string; name: string };
type Service = Option & { code?: string; billing_mode?: string };
type PortalConfig = {
  store: { id: string; name: string; logo_url?: string | null; primary_color?: string | null; secondary_color?: string | null };
  settings: { quote_title: string; quote_subtitle: string; disclaimer: string; default_origin_label: string; pickup_mode: string; pickup_fee: number; insurance_mode: string; insurance_value: number; currency: string; whatsapp_phone?: string | null };
  services: Service[];
  countries: Option[];
  provinces: Array<Option & { country_id: string }>;
  municipalities: Array<Option & { province_id: string }>;
  locations: Array<Option & { municipality_id: string }>;
  categories: string[];
  transportModes: string[];
};

type QuoteResult = { public_code: string; total_amount: number; base_amount: number; pickup_amount: number; insurance_amount: number; currency: string; estimated_days_min?: number | null; estimated_days_max?: number | null; whatsapp_url?: string };

const modeLabels: Record<string,string> = { air:"Aéreo", sea:"Marítimo", express:"Express", ground:"Terrestre", other:"Otro" };
const categoryLabels: Record<string,string> = { package:"Paquete", appliance:"Electrodoméstico", medicine:"Medicinas", documents:"Documentos", food:"Alimentos", electronics:"Electrónica", other:"Otro" };

export default function PublicQuoteCalculator({ embedded = false }: { embedded?: boolean }) {
  const [config,setConfig]=useState<PortalConfig|null>(null);
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");
  const [result,setResult]=useState<QuoteResult|null>(null);
  const [form,setForm]=useState({ service_type_id:"", country_id:"", province_id:"", municipality_id:"", location_id:"", transport_mode:"air", item_category:"package", weight_lb:"10", quantity:"1", pickup_requested:false, pickup_address:"", insurance_requested:false, customer_name:"", customer_phone:"", customer_email:"", notes:"" });

  useEffect(()=>{(async()=>{ try { const r=await fetch("/api/public/quote/config",{cache:"no-store"}); const j=await r.json(); if(!r.ok) throw new Error(j.error||"No se pudo cargar el cotizador."); setConfig(j); setForm(v=>({...v,service_type_id:j.services?.[0]?.id||"",country_id:j.countries?.[0]?.id||"",transport_mode:j.transportModes?.[0]||"air",item_category:j.categories?.[0]||"package"})); } catch(e){setError(e instanceof Error?e.message:"No se pudo cargar el cotizador.");} finally{setLoading(false);} })()},[]);

  const provinces=useMemo(()=>config?.provinces.filter(x=>x.country_id===form.country_id)||[],[config,form.country_id]);
  const municipalities=useMemo(()=>config?.municipalities.filter(x=>x.province_id===form.province_id)||[],[config,form.province_id]);
  const locations=useMemo(()=>config?.locations.filter(x=>x.municipality_id===form.municipality_id)||[],[config,form.municipality_id]);

  function set<K extends keyof typeof form>(key:K,value:(typeof form)[K]){ setResult(null); setForm(v=>({...v,[key]:value})); }
  async function submit(e:FormEvent){ e.preventDefault(); setSending(true); setError(""); try { const r=await fetch("/api/public/quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,weight_lb:Number(form.weight_lb),quantity:Number(form.quantity)})}); const j=await r.json(); if(!r.ok) throw new Error(j.error||"No se pudo calcular."); setResult(j); } catch(e){setError(e instanceof Error?e.message:"No se pudo calcular.");} finally{setSending(false);} }

  if(loading) return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="animate-spin" size={34}/></div>;
  if(!config) return <div className="rounded-3xl bg-red-50 p-6 font-bold text-red-700">{error||"Cotizador no disponible."}</div>;
  const primary=config.store.primary_color||"#071d43";

  return <div className={`grid gap-6 lg:grid-cols-[1.15fr_.85fr] ${embedded ? "mx-auto max-w-7xl" : ""}`}>
    <form onSubmit={submit} className="rounded-[2rem] bg-white p-5 shadow-xl sm:p-8">
      <div className="mb-7"><div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-wider"><Calculator size={15}/> Cotizador inteligente</div><h2 className="mt-4 text-3xl font-black">{config.settings.quote_title}</h2><p className="mt-2 text-slate-500">{config.settings.quote_subtitle}</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de servicio"><select value={form.service_type_id} onChange={e=>set("service_type_id",e.target.value)} required>{config.services.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Método"><select value={form.transport_mode} onChange={e=>set("transport_mode",e.target.value)}>{config.transportModes.map(x=><option key={x} value={x}>{modeLabels[x]||x}</option>)}</select></Field>
        <Field label="Contenido"><select value={form.item_category} onChange={e=>set("item_category",e.target.value)}>{config.categories.map(x=><option key={x} value={x}>{categoryLabels[x]||x}</option>)}</select></Field>
        <Field label="Peso estimado (lb)"><input type="number" min="0.1" step="0.1" value={form.weight_lb} onChange={e=>set("weight_lb",e.target.value)} required/></Field>
        <Field label="País"><select value={form.country_id} onChange={e=>{set("country_id",e.target.value);set("province_id","");set("municipality_id","");set("location_id","")}}>{config.countries.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Provincia"><select value={form.province_id} onChange={e=>{set("province_id",e.target.value);set("municipality_id","");set("location_id","")}}><option value="">Cualquier provincia</option>{provinces.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Municipio"><select value={form.municipality_id} onChange={e=>{set("municipality_id",e.target.value);set("location_id","")}}><option value="">Cualquier municipio</option>{municipalities.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Lugar"><select value={form.location_id} onChange={e=>set("location_id",e.target.value)}><option value="">Cualquier lugar</option>{locations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      </div>
      {config.settings.pickup_mode!=="disabled"&&<label className="mt-5 flex items-start gap-3 rounded-2xl border p-4"><input type="checkbox" checked={form.pickup_requested} onChange={e=>set("pickup_requested",e.target.checked)} className="mt-1"/><span><b>Solicitar recogida a domicilio</b><small className="block text-slate-500">{config.settings.pickup_mode==="free"?"Gratis":config.settings.pickup_fee?`Cargo configurado: $${config.settings.pickup_fee}`:"El cargo se confirmará por la agencia"}</small></span></label>}
      {form.pickup_requested&&<Field label="Dirección de recogida"><input value={form.pickup_address} onChange={e=>set("pickup_address",e.target.value)} required/></Field>}
      <div className="mt-7 border-t pt-7"><h2 className="text-xl font-black">Tus datos</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Nombre"><input value={form.customer_name} onChange={e=>set("customer_name",e.target.value)} required/></Field><Field label="Teléfono"><input value={form.customer_phone} onChange={e=>set("customer_phone",e.target.value)} required inputMode="tel"/></Field><Field label="Correo (opcional)"><input type="email" value={form.customer_email} onChange={e=>set("customer_email",e.target.value)}/></Field></div></div>
      {error&&<p className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}
      <button disabled={sending} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-black text-white disabled:opacity-60" style={{backgroundColor:primary}}>{sending?<Loader2 className="animate-spin"/>:<Calculator/>} Calcular y guardar cotización</button>
    </form>
    <aside className="rounded-[2rem] p-6 text-white shadow-2xl lg:sticky lg:top-24 lg:h-fit" style={{backgroundColor:primary}}>
      {!result?<><Package size={42}/><h2 className="mt-5 text-2xl font-black">Un estimado claro y profesional</h2><div className="mt-6 grid gap-3">{[[Plane,"Aéreo"],[Ship,"Marítimo"],[Truck,"Recogida configurable"]].map(([I,t])=>{const Icon=I as typeof Plane;return <div key={t as string} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4"><Icon/>{t as string}</div>})}</div></>:<><CheckCircle2 size={46} className="text-emerald-300"/><p className="mt-4 text-sm font-black uppercase tracking-wider text-white/60">{result.public_code}</p><h2 className="mt-2 text-3xl font-black">Cotización lista</h2><div className="mt-6 space-y-3 rounded-2xl bg-white/10 p-5"><Row label="Envío" value={result.base_amount}/><Row label="Recogida" value={result.pickup_amount}/><Row label="Seguro" value={result.insurance_amount}/><div className="border-t border-white/15 pt-4"><div className="flex justify-between"><b>Total estimado</b><strong className="text-3xl">{new Intl.NumberFormat("en-US",{style:"currency",currency:result.currency}).format(result.total_amount)}</strong></div></div></div>{result.whatsapp_url&&<a href={result.whatsapp_url} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 p-4 font-black"><MessageCircle/> Enviar por WhatsApp</a>}<p className="mt-5 text-sm text-white/60">{config.settings.disclaimer}</p></>}
    </aside>
  </div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="mt-4 block text-sm font-black text-slate-700">{label}<div className="mt-2 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:p-3 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:bg-white [&_select]:p-3">{children}</div></label>}
function Row({label,value}:{label:string;value:number}){return <div className="flex justify-between"><span>{label}</span><b>${Number(value||0).toFixed(2)}</b></div>}
