export default function PerlaMarketplaceLanding() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 font-black text-slate-950">
              P
            </div>
            <div>
              <p className="text-lg font-black leading-tight">Perla Marketplace</p>
              <p className="text-xs font-semibold text-cyan-300">SaaS para tiendas online</p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-bold text-white/80 md:flex">
            <a href="#caracteristicas" className="hover:text-cyan-300">Características</a>
            <a href="#precios" className="hover:text-cyan-300">Precios</a>
            <a href="#demo" className="hover:text-cyan-300">Demo</a>
            <a href="/admin" className="hover:text-cyan-300">Login</a>
          </nav>

          <a
            href="https://wa.me/13054974891?text=Hola,%20quiero%20informaci%C3%B3n%20sobre%20Perla%20Marketplace."
            target="_blank"
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-400/20"
          >
            Crear tienda
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 py-20 md:py-28">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-200">
              Plataforma multiempresa para vender online
            </p>

            <h1 className="text-4xl font-black leading-tight md:text-6xl">
              Crea tiendas online profesionales para tus clientes en minutos.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
              Perla Marketplace permite administrar productos, categorías, banners, combos, órdenes, WhatsApp y tiendas por subdominio o dominio propio desde un solo sistema.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                href="https://wa.me/13054974891?text=Hola,%20quiero%20crear%20una%20tienda%20online%20con%20Perla%20Marketplace."
                target="_blank"
                className="rounded-2xl bg-cyan-400 px-8 py-4 text-center font-black text-slate-950"
              >
                Solicitar mi tienda
              </a>
              <a
                href="https://dlracing.perlamarketplace.com"
                target="_blank"
                className="rounded-2xl border border-white/15 px-8 py-4 text-center font-black text-white hover:border-cyan-300/60"
              >
                Ver demo real
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-cyan-950/40">
            <div className="rounded-[1.5rem] bg-slate-900 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/50">Dashboard</p>
                  <h2 className="text-2xl font-black">DL Racing Cyber</h2>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-bold text-emerald-300">
                  Activa
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Productos", "128"],
                  ["Órdenes", "34"],
                  ["Categorías", "12"],
                  ["Combos", "8"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/5 p-5">
                    <p className="text-sm text-white/50">{label}</p>
                    <p className="mt-2 text-3xl font-black">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-cyan-400 p-5 text-slate-950">
                <p className="text-sm font-bold opacity-70">Subdominio</p>
                <p className="mt-1 break-all text-xl font-black">dlracing.perlamarketplace.com</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="caracteristicas" className="border-y border-white/10 bg-white/[0.03] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-black md:text-5xl">
            Todo lo necesario para vender online
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              ["🏪", "Multiempresa", "Cada tienda trabaja separada por store_id, subdominio o dominio propio."],
              ["📦", "Órdenes y stock", "Control de pedidos, estados, inventario y papelera de órdenes."],
              ["📲", "WhatsApp integrado", "Comunicación directa con clientes por tienda y por orden."],
              ["🖼️", "Banners y categorías", "Personaliza portada, categorías, productos destacados y combos."],
              ["⚙️", "Panel administrativo", "Dashboard por tienda para operar cada negocio de forma independiente."],
              ["🚀", "Listo para crecer", "Base preparada para onboarding, membresías y futuros clientes."],
            ].map(([icon, title, text]) => (
              <div key={title} className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-6">
                <div className="text-4xl">{icon}</div>
                <h3 className="mt-4 text-xl font-black">{title}</h3>
                <p className="mt-3 leading-7 text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="px-6 py-16">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-8 text-center">
          <p className="font-black uppercase tracking-[0.3em] text-cyan-300">Planes</p>
          <h2 className="mt-4 text-3xl font-black md:text-5xl">Precios para pequeños negocios</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Próximamente aquí estarán los planes mensuales, setup inicial, dominios personalizados y servicios extra.
          </p>
          <a
            href="https://wa.me/13054974891?text=Hola,%20quiero%20saber%20los%20precios%20de%20Perla%20Marketplace."
            target="_blank"
            className="mt-8 inline-block rounded-2xl bg-cyan-400 px-8 py-4 font-black text-slate-950"
          >
            Pedir información
          </a>
        </div>
      </section>

      <section id="demo" className="bg-slate-900 px-6 py-16">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-black md:text-5xl">Demo en producción</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            DL Racing Cyber ya funciona como tienda real dentro del ecosistema Perla Marketplace.
          </p>
          <a
            href="https://dlracing.perlamarketplace.com"
            target="_blank"
            className="mt-8 inline-block rounded-2xl border border-white/15 px-8 py-4 font-black hover:border-cyan-300/70"
          >
            Abrir DL Racing Cyber
          </a>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10 text-center text-white/50">
        © 2026 Perla Marketplace. SaaS de tiendas online.
      </footer>
    </main>
  );
}
