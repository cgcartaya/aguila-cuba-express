import Image from "next/image";

const categorias = [
  "Todos",
  "Convertidores",
  "Eléctricos",
  "Comida",
  "Medicinas",
  "Bicicletas",
];

const productos = [
  {
    nombre: "Ecoflow Delta 3 Classic",
    categoria: "Convertidores",
    precio: "700.00",
    descripcion: "Estación de energía portátil ideal para apagones.",
    imagen: "/products/electrical/ecoflow.webp",
    etiqueta: "POPULAR",
  },
  {
    nombre: "Convertidor Eléctrico 1000W",
    categoria: "Convertidores",
    precio: "350.00",
    descripcion: "Convertidor de batería con capacidad de 1000 watts.",
    imagen: "/products/electrical/convertidor-1000W.webp",
    etiqueta: "POPULAR",
  },
  {
    nombre: "Controlador Solar 1000W",
    categoria: "Eléctricos",
    precio: "120.00",
    descripcion: "Controlador solar ideal para paneles y sistemas eléctricos.",
    imagen: "/products/electrical/controlador-solar-1000w.webp",
    etiqueta: "NUEVO",
  },
  {
    nombre: "Bicicleta Eléctrica 48V",
    categoria: "Bicicletas",
    precio: "900.00",
    descripcion: "Bicicleta eléctrica para transporte diario.",
    imagen: "/products/electrical/bicicleta-electrica48v.webp",
    etiqueta: "NUEVO",
  },
  {
    nombre: "Olla Eléctrica 1.5L",
    categoria: "Eléctricos",
    precio: "60.00",
    descripcion: "Olla eléctrica multiusos con vaporera.",
    imagen: "/products/electrical/olla-electrica-1.5L.webp",
    etiqueta: "POPULAR",
  },
  {
    nombre: "Olla Eléctrica 2L",
    categoria: "Eléctricos",
    precio: "70.00",
    descripcion: "Olla eléctrica para cocinar en casa.",
    imagen: "/products/electrical/olla-electrica-2L.webp",
    etiqueta: "POPULAR",
  },
  {
    nombre: "Chocolisto Sabor Fresa",
    categoria: "Comida",
    precio: "7.00",
    descripcion: "Producto alimenticio sabor fresa.",
    imagen: "/products/food/chocolisto-sabor-fresa.webp",
    etiqueta: "NUEVO",
  },
  {
    nombre: "Galletas de Mantequilla",
    categoria: "Comida",
    precio: "5.00",
    descripcion: "Lata de galletas de mantequilla.",
    imagen: "/products/food/lata-galletas-mantequilla.webp",
    etiqueta: "NUEVO",
  },
  {
    nombre: "Zuko Limón",
    categoria: "Comida",
    precio: "2.00",
    descripcion: "Refresco instantáneo sabor limón.",
    imagen: "/products/food/refresco-zuco-limon.webp",
    etiqueta: "NUEVO",
  },
  {
    nombre: "Ibuprofeno 200mg",
    categoria: "Medicinas",
    precio: "10.00",
    descripcion: "Frasco de tabletas de ibuprofeno 200mg.",
    imagen: "/products/medicines/ibuprofeno200.webp",
    etiqueta: "DISPONIBLE",
  },
  {
    nombre: "Acetaminophen 500mg",
    categoria: "Medicinas",
    precio: "8.00",
    descripcion: "Extra fuerte, ideal para dolor y fiebre.",
    imagen: "/products/medicines/acetaminophen.webp",
    etiqueta: "DISPONIBLE",
  },
];

export default function TiendaPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-[#062446] px-6 py-14 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="font-black uppercase tracking-[0.3em] text-red-400">
            Tienda Online
          </p>

          <h1 className="mt-4 max-w-4xl text-4xl font-black md:text-6xl">
            Productos para enviar a Cuba con Águila Cuba Express
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-white/80">
            Elige productos, arma tu pedido y coordina la compra directamente por WhatsApp.
            El precio puede incluir gestión, manejo y envío según disponibilidad.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a
              href="#productos"
              className="rounded-xl bg-red-600 px-8 py-4 text-center font-bold text-white"
            >
              Ver productos
            </a>

            <a
              href="https://wa.me/13054974891"
              target="_blank"
              className="rounded-xl bg-green-500 px-8 py-4 text-center font-bold text-white"
            >
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="sticky top-[88px] z-30 border-b bg-white px-6 py-5 shadow-sm">
        <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto pb-2">
          {categorias.map((categoria, index) => (
            <button
              key={categoria}
              className={`shrink-0 rounded-full border px-5 py-3 font-bold ${
                index === 0
                  ? "bg-[#062446] text-white"
                  : "bg-white text-[#062446]"
              }`}
            >
              {categoria}
            </button>
          ))}
        </div>
      </section>

      <section id="productos" className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-black text-[#062446]">
              Productos destacados
            </h2>
            <p className="mt-2 text-slate-600">
              Catálogo inicial para pedidos coordinados hacia Cuba.
            </p>
          </div>

          <div className="rounded-full bg-white px-5 py-3 text-sm font-bold shadow-sm">
            📦 Entrega coordinada por Águila Cuba Express
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {productos.map((producto) => (
            <article
              key={producto.nombre}
              className="overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-56 overflow-hidden bg-white">
                <Image
                  src={producto.imagen}
                  alt={producto.nombre}
                  fill
                  className="object-cover transition duration-300 hover:scale-105"
                />

                <span className="absolute left-4 top-4 rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                  {producto.etiqueta}
                </span>
              </div>

              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-wider text-red-600">
                  {producto.categoria}
                </p>

                <h3 className="mt-2 min-h-[56px] text-xl font-black leading-tight text-[#062446]">
                  {producto.nombre}
                </h3>

                <p className="mt-2 min-h-[48px] text-sm text-slate-600">
                  {producto.descripcion}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Precio final</p>
                    <p className="text-2xl font-black text-[#062446]">
                      {producto.precio} USD
                    </p>
                  </div>

                  <a
                    href={`https://wa.me/13054974891?text=${encodeURIComponent(
                      `Hola, estoy interesado en este producto: ${producto.nombre} - ${producto.precio} USD`
                    )}`}
                    target="_blank"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-[#062446] text-2xl font-bold text-white shadow-lg"
                    aria-label={`Solicitar ${producto.nombre}`}
                  >
                    +
                  </a>
                </div>

                <a
                  href={`https://wa.me/13054974891?text=${encodeURIComponent(
                    `Hola, quiero más información sobre: ${producto.nombre}`
                  )}`}
                  target="_blank"
                  className="mt-5 block rounded-xl border border-[#062446] px-4 py-3 text-center text-sm font-bold text-[#062446]"
                >
                  Ver detalles por WhatsApp
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-8 rounded-[2rem] bg-[#062446] p-8 text-white md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-3xl font-black">
              ¿Quieres un producto que no aparece aquí?
            </h2>

            <p className="mt-4 text-white/80">
              Escríbenos por WhatsApp y coordinamos compras especiales, productos
              por encargo y envíos personalizados hacia Cuba.
            </p>
          </div>

          <div className="flex items-center md:justify-end">
            <a
              href="https://wa.me/13054974891"
              target="_blank"
              className="rounded-xl bg-red-600 px-8 py-4 font-bold text-white"
            >
              Solicitar producto especial
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}