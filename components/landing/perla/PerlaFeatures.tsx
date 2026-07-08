const features = [
  ["🏪", "Multiempresa", "Administra varias tiendas desde una sola plataforma."],
  ["📦", "Productos y stock", "Controla productos, categorías, combos e inventario."],
  ["🧾", "Órdenes", "Gestiona pedidos, estados, papelera y seguimiento."],
  ["📲", "WhatsApp", "Comunicación directa con clientes por cada tienda."],
  ["🌐", "Dominios", "Usa subdominios o dominios personalizados."],
  ["📊", "Dashboard", "Métricas para operar cada negocio con claridad."],
];

export default function PerlaFeatures() {
  return (
    <section
      id="funciones"
      className="border-y border-white/10 bg-white/[0.03] px-5 py-16"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-black uppercase tracking-[0.3em] text-cyan-300">
            Funciones
          </p>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">
            Todo lo que necesita una tienda moderna
          </h2>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([icon, title, text]) => (
            <div
              key={title}
              className="rounded-[1.5rem] border border-white/10 bg-[#081426] p-6 transition hover:-translate-y-1 hover:border-cyan-300/40"
            >
              <div className="text-4xl">{icon}</div>
              <h3 className="mt-4 text-xl font-black">{title}</h3>
              <p className="mt-3 leading-7 text-white/60">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
