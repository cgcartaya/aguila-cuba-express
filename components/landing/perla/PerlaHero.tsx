import { demoUrl, whatsappUrl } from "./links";

const stats = [
  ["2+", "Tiendas activas"],
  ["100+", "Productos"],
  ["24/7", "Online"],
];

export default function PerlaHero() {
  return (
    <section className="relative overflow-hidden px-5 py-16 sm:py-20 lg:py-28">
      <div className="absolute left-1/2 top-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute right-0 top-40 h-[300px] w-[300px] rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.95fr]">
        <div className="text-center lg:text-left">
          <p className="mx-auto mb-5 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-cyan-200 lg:mx-0">
            Plataforma SaaS multiempresa
          </p>

          <h1 className="text-4xl font-black leading-[1.03] sm:text-5xl lg:text-7xl">
            Crea tu tienda online y empieza a vender más rápido.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg lg:mx-0">
            Perla Marketplace permite administrar productos, categorías, banners,
            combos, órdenes, WhatsApp, subdominios y dominios propios desde un
            solo sistema.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <a
              href={whatsappUrl}
              target="_blank"
              className="rounded-2xl bg-cyan-400 px-8 py-4 text-center font-black text-slate-950 shadow-xl shadow-cyan-400/20 transition hover:-translate-y-1"
            >
              Crear mi tienda
            </a>

            <a
              href={demoUrl}
              target="_blank"
              className="rounded-2xl border border-white/15 px-8 py-4 text-center font-black text-white transition hover:-translate-y-1 hover:border-cyan-300/70"
            >
              Ver demo real
            </a>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-3 text-center sm:max-w-xl lg:text-left">
            {stats.map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <p className="text-2xl font-black text-cyan-300">{value}</p>
                <p className="mt-1 text-xs font-bold text-white/50">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-cyan-950/50 backdrop-blur">
            <div className="rounded-[1.5rem] bg-[#081426] p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/45">Dashboard</p>
                  <h2 className="text-xl font-black sm:text-2xl">
                    DL Racing Cyber
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">
                  Activa
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Productos", "128"],
                  ["Órdenes", "34"],
                  ["Categorías", "12"],
                  ["Combos", "8"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/[0.05] p-5">
                    <p className="text-sm text-white/45">{label}</p>
                    <p className="mt-2 text-3xl font-black">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl bg-cyan-400 p-5 text-slate-950">
                <p className="text-xs font-black uppercase opacity-70">
                  Subdominio
                </p>
                <p className="mt-1 break-all text-lg font-black">
                  dlracing.perlamarketplace.com
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto -mt-8 w-[210px] rounded-[2rem] border border-white/15 bg-slate-950 p-3 shadow-2xl lg:absolute lg:-bottom-10 lg:-right-8 lg:mt-0">
            <div className="rounded-[1.5rem] bg-white p-3 text-slate-950">
              <div className="h-24 rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500" />
              <p className="mt-3 text-xs font-black uppercase text-slate-500">
                Tienda móvil
              </p>
              <h3 className="text-lg font-black">Productos destacados</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="h-20 rounded-xl bg-slate-100" />
                <div className="h-20 rounded-xl bg-slate-100" />
              </div>
              <button className="mt-3 w-full rounded-xl bg-slate-950 py-3 text-xs font-black text-white">
                Comprar
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
