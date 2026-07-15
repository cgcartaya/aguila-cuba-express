import Image from "next/image";
import { ArrowRight, CheckCircle2, MessageCircleMore, PlayCircle, Sparkles } from "lucide-react";
import { DEMO_PATH } from "./links";

export default function PerlaHero() {
  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-36 lg:px-8 lg:pb-28 lg:pt-44">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,.18),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,.15),transparent_34%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#eef2ff55_1px,transparent_1px),linear-gradient(to_bottom,#eef2ff55_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-violet-700 shadow-sm">
            <Sparkles size={15} /> Plataforma SaaS multiempresa
          </div>

          <h1 className="mt-7 text-5xl font-black leading-[.98] tracking-[-.045em] text-[#071044] sm:text-6xl lg:text-7xl">
            Tu negocio online listo para vender <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 bg-clip-text text-transparent">en minutos.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
            Crea una tienda profesional, administra productos, inventario, pedidos, promociones, entregas y analítica desde un solo lugar.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={DEMO_PATH} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-7 py-4 font-black text-white shadow-xl shadow-violet-200 transition hover:-translate-y-1">
              Solicitar demo <ArrowRight size={19} />
            </a>
            <a href="#plataforma" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white px-7 py-4 font-black text-violet-700 transition hover:bg-violet-50">
              <PlayCircle size={20} /> Ver plataforma
            </a>
          </div>

          <div className="mt-8 grid gap-3 text-sm font-bold text-slate-600 sm:grid-cols-2">
            {["Desde $20/mes", "Sin comisión por venta", "WhatsApp integrado", "Configuración acompañada"].map((item) => (
              <div key={item} className="flex items-center gap-2"><CheckCircle2 className="text-emerald-500" size={19} />{item}</div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 -z-10 rounded-full bg-gradient-to-r from-violet-300/30 to-blue-300/30 blur-3xl" />
          <div className="overflow-hidden rounded-[2rem] border border-white bg-white p-2 shadow-2xl shadow-violet-950/20">
            <Image src="/perla/hero.png" alt="Perla Marketplace en computadora y móvil" width={1222} height={650} priority className="h-auto w-full rounded-[1.55rem]" />
          </div>
          <div className="absolute -bottom-6 -left-5 hidden items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-xl md:flex">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600"><MessageCircleMore /></div>
            <div><p className="text-xs font-black uppercase tracking-wider text-violet-600">WhatsApp conectado</p><p className="font-bold text-slate-800">Pedidos directos</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
