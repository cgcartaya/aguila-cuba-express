import AnimatedDashboard from "./AnimatedDashboard";
export default function PerlaHero() {
  return (
    <section className="relative overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,.25),transparent_55%)]" />
      <div className="mx-auto max-w-7xl px-6 py-24 lg:grid lg:grid-cols-2 lg:gap-12 items-center">
        <div className="relative z-10">
          <div className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
            ✦ Plataforma SaaS Multiempresa
          </div>

          <h1 className="mt-8 text-6xl font-black leading-none">
            Convierte tu negocio en
            <span className="block bg-gradient-to-r from-fuchsia-400 to-violet-500 bg-clip-text text-transparent">
              una tienda que vende.
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-lg text-slate-300">
            Crea tu tienda online, administra productos, inventario,
            pedidos y clientes desde un solo lugar.
          </p>

          <div className="mt-10 flex gap-4">
            <a className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-8 py-4 font-semibold">
              Solicitar demo
            </a>
            <a className="rounded-2xl border border-white/20 px-8 py-4 font-semibold">
              Ver cómo funciona
            </a>
          </div>
        </div>

        <div className="relative mt-16 lg:mt-0">
         <div className="
rounded-[40px]
border border-violet-500/20
bg-white/5
p-5
backdrop-blur-xl
shadow-[0_0_120px_rgba(168,85,247,0.25)]
animate-[float_6s_ease-in-out_infinite]
">
           <div className="scale-[0.82] origin-center">
  <AnimatedDashboard />
</div>
          </div>
        </div>
      </div>
    </section>
  );
}
