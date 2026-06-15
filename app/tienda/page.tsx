const productos = [
  {
    nombre: "Combo de aseo familiar",
    categoria: "Hogar",
    precio: "$45",
    descripcion: "Productos básicos para enviar a familiares en Cuba.",
    emoji: "🧴",
  },
  {
    nombre: "Perfume importado",
    categoria: "Regalos",
    precio: "$65",
    descripcion: "Ideal para regalos y encargos especiales.",
    emoji: "🌸",
  },
  {
    nombre: "Zapatos deportivos",
    categoria: "Ropa y calzado",
    precio: "$80",
    descripcion: "Modelos cómodos para hombres y mujeres.",
    emoji: "👟",
  },
  {
    nombre: "Teléfono Android",
    categoria: "Tecnología",
    precio: "$150",
    descripcion: "Equipos seleccionados para enviar a Cuba.",
    emoji: "📱",
  },
  {
    nombre: "Reloj inteligente",
    categoria: "Tecnología",
    precio: "$35",
    descripcion: "Accesorio práctico para uso diario.",
    emoji: "⌚",
  },
  {
    nombre: "Combo de ropa",
    categoria: "Ropa",
    precio: "$90",
    descripcion: "Paquete variado de ropa para familiares.",
    emoji: "👕",
  },
];

export default function TiendaPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-[#062446] px-6 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="font-bold uppercase tracking-[0.3em] text-red-400">
            Tienda Online
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-black md:text-6xl">
            Compra productos y nosotros los enviamos a Cuba
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-white/80">
            Selecciona productos disponibles, solicita información por WhatsApp y
            Águila Cuba Express se encarga de coordinar la entrega.
          </p>

          <a
            href="https://wa.me/13054974891"
            target="_blank"
            className="mt-8 inline-block rounded-xl bg-green-500 px-8 py-4 font-bold text-white"
          >
            Consultar por WhatsApp
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-black text-[#062446]">
              Productos destacados
            </h2>
            <p className="mt-2 text-slate-600">
              Catálogo inicial de productos para enviar a Cuba.
            </p>
          </div>

          <div className="rounded-full bg-white px-5 py-3 text-sm font-bold shadow-sm">
            📦 Envío coordinado por Águila Cuba Express
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((producto) => (
            <div
              key={producto.nombre}
              className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-48 items-center justify-center bg-gradient-to-br from-blue-50 to-red-50 text-7xl">
                {producto.emoji}
              </div>

              <div className="p-6">
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                  {producto.categoria}
                </span>

                <h3 className="mt-4 text-xl font-black text-[#062446]">
                  {producto.nombre}
                </h3>

                <p className="mt-2 text-slate-600">{producto.descripcion}</p>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-2xl font-black text-red-600">
                    {producto.precio}
                  </span>

                  <a
                    href={`https://wa.me/13054974891?text=${encodeURIComponent(
                      `Hola, estoy interesado en el producto: ${producto.nombre}`
                    )}`}
                    target="_blank"
                    className="rounded-xl bg-[#062446] px-4 py-3 text-sm font-bold text-white"
                  >
                    Solicitar
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-3xl bg-[#062446] p-8 text-white md:p-12">
          <h2 className="text-3xl font-black">
            ¿No encuentras el producto que buscas?
          </h2>

          <p className="mt-3 max-w-2xl text-white/80">
            Escríbenos por WhatsApp. Podemos ayudarte a coordinar compras
            especiales y envíos personalizados hacia Cuba.
          </p>

          <a
            href="https://wa.me/13054974891"
            target="_blank"
            className="mt-6 inline-block rounded-xl bg-red-600 px-8 py-4 font-bold text-white"
          >
            Solicitar producto especial
          </a>
        </div>
      </section>
    </main>
  );
}