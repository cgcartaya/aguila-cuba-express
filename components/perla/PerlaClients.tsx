import { ArrowRight, Cpu, Plane } from "lucide-react";
import { aguilaStoreUrl, demoUrl } from "./links";

export default function PerlaClients() {
  return (
    <section id="clientes" className="px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-2xl font-black text-[#071044] sm:text-3xl">Tiendas que ya venden con Perla Marketplace</h2>
          <p className="mt-3 text-[#5c6794]">Ejemplos reales del ecosistema multiempresa.</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <a href={demoUrl} target="_blank" className="group overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-6 shadow-xl shadow-violet-100/70 transition hover:-translate-y-1">
            <div className="grid gap-5 sm:grid-cols-[1fr_220px] sm:items-center">
              <div>
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">Informática</span>
                <h3 className="mt-4 text-2xl font-black text-[#071044]">DL Racing Cyber</h3>
                <p className="mt-3 text-sm leading-6 text-[#5c6794]">Componentes, computadoras y accesorios tecnológicos.</p>
                <p className="mt-5 inline-flex items-center gap-2 font-black text-violet-700">
                  Ver tienda <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </p>
              </div>
              <div className="flex h-40 items-center justify-center rounded-[1.5rem] bg-[#07165f] text-violet-100">
                <Cpu className="h-20 w-20" strokeWidth={1.6} />
              </div>
            </div>
          </a>

          <a href={aguilaStoreUrl} target="_blank" className="group overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-6 shadow-xl shadow-sky-100/70 transition hover:-translate-y-1">
            <div className="grid gap-5 sm:grid-cols-[1fr_220px] sm:items-center">
              <div>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">Envíos a Cuba</span>
                <h3 className="mt-4 text-2xl font-black text-[#071044]">Águila Cuba Express</h3>
                <p className="mt-3 text-sm leading-6 text-[#5c6794]">Envíos, compras y entregas desde Miami hacia Cuba.</p>
                <p className="mt-5 inline-flex items-center gap-2 font-black text-sky-700">
                  Ver tienda <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </p>
              </div>
              <div className="flex h-40 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-sky-200 to-white text-sky-700">
                <Plane className="h-20 w-20" strokeWidth={1.6} />
              </div>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
