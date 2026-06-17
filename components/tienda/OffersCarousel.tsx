import Image from "next/image";

type Oferta = {
  nombre: string;
  precioAntes: string;
  precio: string;
  descuento: string;
  imagen: string;
};

type OffersCarouselProps = {
  ofertas: Oferta[];
};

export default function OffersCarousel({
  ofertas,
}: OffersCarouselProps) {
  return (
    <section id="ofertas" className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black">
          Ofertas de la semana
        </h2>

        <button className="text-sm font-bold">
          Ver todas ❯
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3">
        {ofertas.map((producto) => (
          <article
            key={producto.nombre}
            className="relative min-w-[190px] shrink-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:min-w-[260px]"
          >
            <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">
              {producto.descuento}
            </span>

            <div className="relative h-32 md:h-36">
              <Image
                src={producto.imagen}
                alt={producto.nombre}
                fill
                className="object-contain"
              />
            </div>

            <h3 className="mt-3 line-clamp-2 min-h-[40px] text-sm font-black">
              {producto.nombre}
            </h3>

            <p className="mt-2">
              <span className="mr-2 text-sm text-slate-400 line-through">
                ${producto.precioAntes}
              </span>

              <span className="text-lg font-black">
                ${producto.precio}
              </span>
            </p>

            <button
              className="mt-3 rounded-lg border border-red-200 px-4 py-2 text-xs font-black text-red-600"
            >
              Agregar al carrito
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}