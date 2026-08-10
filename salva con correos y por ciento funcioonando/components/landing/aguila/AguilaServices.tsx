import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SERVICES } from "./constants";

export default function AguilaServices() {
  return (
    <section id="servicios" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#c31f2e]">Lo hacemos sencillo</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-[#0d1b30] sm:text-5xl">Tres maneras de estar más cerca.</h2>
            <p className="mt-5 max-w-md font-semibold leading-7 text-[#0d1b30]/55">
              No vendemos solo un servicio. Te acompañamos en todo el proceso para que enviar se sienta claro y confiable.
            </p>
          </div>
          <div className="divide-y divide-[#0d1b30]/10 border-y border-[#0d1b30]/10">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <article key={service.title} className="group grid gap-5 py-7 sm:grid-cols-[70px_1fr_auto] sm:items-center">
                  <span className="text-sm font-black text-[#c31f2e]">{service.number}</span>
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f6f1e4] text-[#0d1b30]">
                      <Icon size={21} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#0d1b30]">{service.title}</h3>
                      <p className="mt-2 max-w-xl font-medium leading-7 text-[#0d1b30]/55">{service.description}</p>
                    </div>
                  </div>
                  <Link
                    href="/servicios"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#0d1b30]/15 text-[#0d1b30] transition group-hover:bg-[#0d1b30] group-hover:text-white"
                  >
                    <ArrowRight size={18} />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
