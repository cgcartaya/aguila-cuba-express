import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

import { STORE_CATEGORIES, STORE_URL } from "./constants";

export default function AguilaStoreShowcase() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
        <div className="relative min-h-[440px] overflow-hidden rounded-[1rem_3.5rem_3.5rem_3.5rem] bg-[#0d1b30]">
          <Image src="/slide-store.webp" alt="Tienda online Aguila Express USA" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b30]/90 via-transparent to-transparent" />
          <div className="absolute bottom-0 p-8 text-white">
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#d7a13f]">Tienda online</p>
            <p className="mt-3 max-w-lg text-3xl font-black">Compra desde Estados Unidos. Nosotros llevamos el resto.</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#c31f2e]">Compra para los tuyos</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-[#0d1b30] sm:text-5xl">Una tienda pensada para enviar cariño.</h2>
          <p className="mt-5 max-w-xl font-semibold leading-7 text-[#0d1b30]/55">
            Explora categorías, prepara tu compra y coordina el envío desde la misma plataforma.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {STORE_CATEGORIES.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={STORE_URL}
                  className="flex items-center gap-3 rounded-full border border-[#0d1b30]/10 bg-[#f6f1e4] px-4 py-3 transition hover:border-[#c31f2e]/30"
                >
                  <Icon size={17} className="text-[#c31f2e]" />
                  <span className="text-sm font-black text-[#0d1b30]">{item.label}</span>
                </Link>
              );
            })}
          </div>
          <Link
            href={STORE_URL}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#c31f2e] px-7 py-4 font-black text-white shadow-[0_16px_34px_rgba(195,31,46,.25)] transition hover:-translate-y-0.5 hover:bg-[#a91826]"
          >
            <Store size={19} /> Entrar a la tienda <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
