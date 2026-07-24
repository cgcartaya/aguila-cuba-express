import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BatteryCharging, CheckCircle2, Clock3, HeartHandshake, MessageCircle, PackageCheck, Plane, Search, Ship, ShoppingBag, Smartphone, Sparkles, Store, Truck, WalletCards, Zap } from "lucide-react";
import PublicQuoteCalculator from "@/components/portal/PublicQuoteCalculator";
import SectionTitle from "./SectionTitle";
import { STORE_URL, TRACKING_URL, WHATSAPP_URL } from "./constants";

const services = [
  { icon: Zap, name: "Envío express", color: "from-red-600 to-red-700", time: "La Habana: 48 horas", detail: "Provincias: 72 horas a 5 días", note: "Rápido, seguro y confiable" },
  { icon: Plane, name: "Envío aéreo", color: "from-blue-700 to-[#071d43]", time: "Entrega en toda Cuba", detail: "7 a 15 días", note: "Seguro y eficiente" },
  { icon: Ship, name: "Envío marítimo", color: "from-emerald-600 to-green-700", time: "Entrega en toda Cuba", detail: "25 a 30 días", note: "Económico y confiable" },
];

export function ServicesSection() {
  return <section id="servicios" className="mx-auto max-w-7xl px-5 py-20 sm:px-6"><SectionTitle eyebrow="Servicios" title="Elige cómo quieres enviar" description="Tres opciones claras para combinar rapidez, seguridad y economía."/><div className="mt-10 grid gap-6 lg:grid-cols-3">{services.map(({icon:Icon,...s}) => <article key={s.name} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className={`bg-gradient-to-br ${s.color} p-6 text-white`}><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Icon size={24}/></div><p className="mt-6 text-lg font-black">{s.name}</p><p className="mt-2 text-2xl font-black">Consulta el precio actual</p></div><div className="space-y-3 p-6"><Info icon={<Clock3 size={18}/>} text={s.time}/><Info icon={<Truck size={18}/>} text={s.detail}/><div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">{s.note}</div></div></article>)}</div></section>;
}

export function QuoteSection() { return <section id="cotizar" className="relative overflow-hidden bg-[#071d43] px-5 py-20 sm:px-6"><div className="absolute inset-0 opacity-15"><Image src="/yoyo/v13/container.webp" alt="" fill className="object-cover"/></div><div className="absolute inset-0 bg-[#071d43]/90"/><div className="relative mx-auto max-w-7xl"><div className="mb-9 text-center text-white"><SectionTitle dark eyebrow="Cotización conectada" title="Calcula tu envío con nuestras tarifas actuales" description="Los precios, mínimos, destinos y tiempos se actualizan directamente desde la administración de YOYO Envíos."/></div><PublicQuoteCalculator embedded/></div></section> }

export function TrackingSection({trackingCode,setTrackingCode}:{trackingCode:string;setTrackingCode:(v:string)=>void}) { return <section id="rastreo" className="mx-auto max-w-7xl px-5 py-20 sm:px-6"><div className="grid overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 to-[#0a3474] text-white shadow-2xl lg:grid-cols-[1fr_.8fr]"><div className="p-8 sm:p-12"><Search size={27}/><h2 className="mt-6 text-4xl font-black">Rastrea tu envío</h2><p className="mt-3 font-semibold text-blue-100/80">Consulta el estado de tu paquete y sigue cada etapa hasta la entrega.</p><form action={trackingCode ? `${TRACKING_URL}/${trackingCode}` : TRACKING_URL} className="mt-7 flex flex-col gap-3 sm:flex-row"><input value={trackingCode} onChange={e=>setTrackingCode(e.target.value.toUpperCase())} placeholder="Ej. ACE-12345678" className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-white px-5 py-4 font-black text-slate-950"/><button className="rounded-2xl bg-[#d71920] px-6 py-4 font-black">Consultar</button></form></div><div className="relative min-h-[330px]"><Image src="/yoyo/v13/warehouse.webp" alt="Operación logística YOYO Envíos" fill className="object-cover opacity-65"/><div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0a3474]"/></div></div></section> }

export function PickupSection() {
  const steps = [
    ["01", "Agendamos tu recogida", "Elige el día y la hora que más te convenga."],
    ["02", "Vamos a tu domicilio", "Nuestro equipo llega puntual y seguro."],
    ["03", "Revisamos tu paquete", "Pesamos y verificamos el contenido."],
    ["04", "Sellamos y etiquetamos", "Protegemos tu envío y lo dejamos listo."],
    ["05", "Lo enviamos a Cuba", "Tu paquete inicia su viaje con total seguridad."],
  ] as const;

  return (
    <section id="recogida" className="relative overflow-hidden bg-white px-5 py-20 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-blue-50/70 to-transparent" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.04fr_.96fr]">
        <div className="group relative min-h-[520px] overflow-hidden rounded-[2.5rem] border border-slate-200 bg-slate-100 shadow-[0_30px_80px_rgba(7,29,67,.16)] sm:min-h-[620px]">
          <Image
            src="/yoyo/v14/pickup-home.webp"
            alt="Empleado de YOYO Envíos recogiendo un paquete a domicilio"
            fill
            sizes="(max-width: 1024px) 100vw, 52vw"
            className="object-cover object-center transition duration-700 group-hover:scale-[1.025]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071d43]/45 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-[#071d43]/82 p-4 text-white shadow-xl backdrop-blur-md sm:bottom-7 sm:left-7 sm:right-7 sm:p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-blue-200">Servicio local</p>
              <p className="mt-1 text-lg font-black">Recogidas en Carolina del Sur</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 text-right">
              <p className="text-xs font-bold text-blue-100/70">Recogida desde</p>
              <p className="text-2xl font-black text-white">$20 USD</p>
            </div>
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-blue-800">
            <Truck size={16} /> Servicio de recogida
          </div>
          <div className="mt-5">
            <SectionTitle eyebrow="Recogida a domicilio" title="Nosotros vamos por tu paquete" description="Servicio disponible en Carolina del Sur y zonas aledañas." />
          </div>

          <div className="relative mt-8 space-y-3 before:absolute before:bottom-6 before:left-[22px] before:top-6 before:w-px before:bg-gradient-to-b before:from-red-300 before:via-blue-300 before:to-slate-200">
            {steps.map(([number, title, text]) => (
              <div key={number} className="relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#d71920] text-xs font-black text-white shadow-md">{number}</div>
                <div>
                  <p className="font-black text-[#071d43]">{title}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{text}</p>
                </div>
              </div>
            ))}
          </div>

  <a
  href="#solicitar-recogida"
  className="group mt-6 inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#d71920] to-red-500 px-7 py-4 font-black text-white shadow-[0_18px_40px_rgba(215,25,32,.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(215,25,32,.38)]"
>
  <Truck className="h-5 w-5" />
  Solicitar recogida a domicilio
  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
</a>
  
        </div>
      </div>
    </section>
  );
}

export function FinalSections() {
 const sendables=[[ShoppingBag,"Ropa y calzado"],[PackageCheck,"Alimentos"],[HeartHandshake,"Medicamentos"],[Sparkles,"Aseo personal"],[Smartphone,"Electrónica"],[BatteryCharging,"Estaciones de energía"]] as const;
 return <><section className="mx-auto max-w-7xl px-5 py-20 sm:px-6"><SectionTitle eyebrow="Productos permitidos" title="¿Qué puedes enviar?" description="Consulta con nuestro equipo cualquier artículo especial antes de empacarlo."/><div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{sendables.map(([Icon,label])=><div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Icon size={23}/></div><p className="mt-4 text-sm font-black text-slate-700">{label}</p></div>)}</div></section><section className="relative overflow-hidden bg-[#071d43] px-5 py-20 text-white sm:px-6"><Image src="/yoyo/v13/office.webp" alt="Oficina YOYO Envíos" fill className="object-cover opacity-20"/><div className="absolute inset-0 bg-[#071d43]/85"/><div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2"><div><SectionTitle dark eyebrow="Tienda y misceláneas" title="Compra y envía desde un solo lugar" description="Productos para el hogar, alimentos, equipos eléctricos, accesorios y mucho más."/><Link href={STORE_URL} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#d71920] px-6 py-4 font-black"><Store size={20}/> Entrar a la tienda <ArrowRight size={18}/></Link></div><div className="grid gap-3 sm:grid-cols-2">{["Alimentos","Aseo","Electrodomésticos","Equipos electrónicos","Estaciones de energía","Combos y misceláneas"].map(i=><div key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold backdrop-blur"><CheckCircle2 size={18} className="text-emerald-400"/>{i}</div>)}</div></div></section><section className="bg-[#d71920] px-5 py-16 text-white sm:px-6"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left"><div><p className="text-sm font-black uppercase tracking-[.16em] text-red-100">Cotización gratis</p><h2 className="mt-2 text-4xl font-black">Escríbenos hoy mismo</h2><p className="mt-2 font-semibold text-red-100">Estamos listos para ayudarte con tu próximo envío.</p></div><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 rounded-2xl bg-white px-7 py-4 text-lg font-black text-emerald-700 shadow-xl"><MessageCircle size={23}/> (803) 262-3676</a></div></section></>;
}

function Info({icon,text}:{icon:React.ReactNode;text:string}) { return <div className="flex items-center gap-3 font-bold text-slate-600"><span className="text-blue-700">{icon}</span>{text}</div> }
