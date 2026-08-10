"use client";

import Link from "next/link";
import AnimatedShowcase from "./AnimatedShowcase";

export default function PerlaHero() {
  return (
    <section className="relative overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_42%,rgba(124,58,237,0.30),transparent_34%),radial-gradient(circle_at_34%_30%,rgba(217,70,239,0.12),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative mx-auto grid min-h-[650px] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-24">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-400" />
            Plataforma SaaS Multiempresa
          </div>

          <h1 className="mt-8 max-w-[650px] text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Convierte tu negocio en
            <span className="mt-2 block bg-gradient-to-r from-fuchsia-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              una tienda que vende.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base font-medium leading-8 text-slate-300 sm:text-lg">
            Crea tu tienda online, administra productos, inventario, pedidos y
            clientes desde un solo lugar. Todo conectado, rápido y listo para
            crecer.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-7 py-4 text-sm font-black shadow-[0_16px_45px_rgba(168,85,247,0.30)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(168,85,247,0.42)]"
            >
              Solicitar demo
              <span className="ml-2 text-lg">→</span>
            </Link>

            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] px-7 py-4 text-sm font-black text-white backdrop-blur transition hover:border-white/30 hover:bg-white/[0.08]"
            >
              Ver cómo funciona
            </a>
          </div>

          <div className="mt-9 grid max-w-xl grid-cols-2 gap-x-6 gap-y-4 text-sm font-bold text-slate-300 sm:grid-cols-4">
            {[
              "Desde $20/mes",
              "Sin comisión",
              "WhatsApp",
              "Multiempresa",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-[11px] text-emerald-300">
                  ✓
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="pointer-events-none absolute -inset-10 rounded-full bg-violet-500/15 blur-3xl" />
          <AnimatedShowcase />
        </div>
      </div>
    </section>
  );
}
