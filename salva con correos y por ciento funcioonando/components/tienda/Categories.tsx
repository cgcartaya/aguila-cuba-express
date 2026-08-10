import Link from "next/link";
import { LucideIcon } from "lucide-react";

type Category = {
  nombre: string;
  icono: LucideIcon;
  color: string;
};

type CategoriesProps = {
  categorias: Category[];
};

export default function Categories({ categorias }: CategoriesProps) {
  return (
    <section className="mt-6">
      {/* =========================================================
          TÍTULO DE LA SECCIÓN
      ========================================================= */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black text-[#061b3a]">
          Explora por categorías
        </h2>

        {/* Ver todas las categorías */}
        <Link
          href="/tienda/categorias"
          className="text-sm font-bold text-[#061b3a]"
        >
          Ver todas ❯
        </Link>
      </div>

      {/* =========================================================
          CARRUSEL HORIZONTAL DE CATEGORÍAS
      ========================================================= */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {categorias.map((cat) => {
          const Icono = cat.icono;

          // Si es la tarjeta "Más" irá a la página completa
          const esMas = cat.nombre === "Más";

          // Diseño interno reutilizable de la tarjeta
          const contenido = (
            <>
              <Icono
                size={38}
                strokeWidth={1.8}
                className={`mx-auto ${cat.color}`}
              />

              <p className="mt-3 text-xs font-black text-[#061b3a]">
                {cat.nombre}
              </p>
            </>
          );

          // Tarjeta especial "Más"
          if (esMas) {
            return (
              <Link
                key={cat.nombre}
                href="/tienda/categorias"
                className="min-w-[110px] shrink-0 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                {contenido}
              </Link>
            );
          }

          // Resto de categorías
          return (
            <button
              key={cat.nombre}
              className="min-w-[110px] shrink-0 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              {contenido}
            </button>
          );
        })}
      </div>
    </section>
  );
}