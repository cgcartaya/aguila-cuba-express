const steps = [
  ["1", "Creamos tu tienda", "Configuramos nombre, logo, colores y dominio."],
  ["2", "Subes productos", "Agregas categorías, banners, combos y precios."],
  ["3", "Empiezas a vender", "Recibes órdenes y atiendes clientes por WhatsApp."],
];

export default function PerlaHowItWorks() {
  return (
    <section id="como-funciona" className="px-5 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-black uppercase tracking-[0.3em] text-cyan-300">
            Cómo funciona
          </p>
          <h2 className="mt-4 text-3xl font-black sm:text-5xl">
            De la idea a la tienda online
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map(([number, title, text]) => (
            <div
              key={number}
              className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-7"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-xl font-black text-slate-950">
                {number}
              </div>
              <h3 className="mt-5 text-2xl font-black">{title}</h3>
              <p className="mt-3 leading-7 text-white/60">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
