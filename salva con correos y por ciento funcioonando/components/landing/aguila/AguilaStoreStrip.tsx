"use client";

import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

import { STORE_CATEGORIES, STORE_URL } from "./constants";

export default function AguilaStoreStrip() {
  return (
    <section className="border-b border-[#0d1b30]/10 bg-[#0d1b30] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-7 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="hidden text-xs font-black uppercase tracking-[.2em] text-white/40 sm:inline">Comprar ahora</span>
          <div className="hidden h-5 w-px bg-white/15 sm:block" />
          <div className="flex flex-wrap gap-2.5">
            {STORE_CATEGORIES.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={STORE_URL}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3.5 py-2 text-xs font-black text-white/75 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                >
                  <Icon size={14} className="text-[#d7a13f]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <Link
          href={STORE_URL}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#c31f2e] px-6 py-3.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(195,31,46,.35)] transition hover:-translate-y-0.5 hover:bg-[#a91826]"
        >
          <Store size={18} />
          Entrar a la tienda
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}
