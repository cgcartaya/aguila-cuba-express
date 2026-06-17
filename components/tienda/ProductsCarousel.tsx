import Image from "next/image";

type Product = {
  id: string | number;
  name: string;
  price: number;
  image_url: string;
};

type ProductsCarouselProps = {
  productos: Product[];
  agregarAlCarrito: (producto: Product) => void;
};

export default function ProductsCarousel({
  productos,
  agregarAlCarrito,
}: ProductsCarouselProps) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black">Productos destacados</h2>
        <button className="text-sm font-bold">Ver todas ❯</button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3">
        {productos.map((producto) => (
          <article
            key={producto.id}
            className="min-w-[165px] shrink-0 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:min-w-[210px]"
          >
            <div className="relative h-32 md:h-36">
              <Image
                src={producto.image_url}
                alt={producto.name}
                fill
                className="object-contain"
              />
              <span className="absolute right-1 top-1 text-xl">♡</span>
            </div>

            <h3 className="mt-3 line-clamp-2 min-h-[40px] text-sm font-black text-[#061b3a]">
              {producto.name}
            </h3>

            <p className="mt-1 text-xs text-yellow-500">
              ★★★★★ <span className="text-slate-500">(64)</span>
            </p>

            <div className="mt-3 flex items-center justify-between">
              <p className="font-black">
                ${Number(producto.price).toFixed(2)}
              </p>

              <button
                onClick={() => agregarAlCarrito(producto)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white"
              >
                🛒
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}