import {
  Smartphone,
  Sofa,
  ShoppingBasket,
  Dumbbell,
  Pill,
  Ellipsis,
} from "lucide-react";

const categorias = [
  {
    nombre: "Electrónicos",
    descripcion: "Celulares, accesorios, equipos y tecnología.",
    icono: Smartphone,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    nombre: "Hogar",
    descripcion: "Artículos para la casa, cocina y comodidad.",
    icono: Sofa,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    nombre: "Alimentos",
    descripcion: "Comida, combos familiares y productos básicos.",
    icono: ShoppingBasket,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    nombre: "Deportes",
    descripcion: "Equipos, accesorios deportivos y entretenimiento.",
    icono: Dumbbell,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    nombre: "Medicinas",
    descripcion: "Medicamentos y productos de cuidado personal.",
    icono: Pill,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    nombre: "Más",
    descripcion: "Otros productos disponibles para enviar.",
    icono: Ellipsis,
    color: "text-slate-600",
    bg: "bg-slate-50",
  },
];

export default function CategoriasPage() {
  return (
    <section className="pt-5">
      <h1 className="text-3xl font-black text-[#061b3a]">
        Categorías
      </h1>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        Explora los productos por tipo para encontrar más rápido lo que necesitas.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {categorias.map((cat) => {
          const Icono = cat.icono;

          return (
            <button
              key={cat.nombre}
              className="rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${cat.bg}`}
              >
                <Icono
                  size={32}
                  strokeWidth={1.9}
                  className={cat.color}
                />
              </div>

              <h2 className="text-lg font-black text-[#061b3a]">
                {cat.nombre}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-snug text-slate-500">
                {cat.descripcion}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}