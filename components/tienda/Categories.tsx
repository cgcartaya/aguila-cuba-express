import { LucideIcon } from "lucide-react";

type Category = {
  nombre: string;
  icono: LucideIcon;
};

type CategoriesProps = {
  categorias: Category[];
};

export default function Categories({ categorias }: CategoriesProps) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black text-[#061b3a]">
          Explora por categorías
        </h2>

        <button className="text-sm font-bold text-[#061b3a]">
          Ver todas ❯
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {categorias.map((cat) => {
          const Icono = cat.icono;

          return (
            <button
              key={cat.nombre}
              className="min-w-[110px] shrink-0 rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm transition hover:shadow-md"
            >
              <Icono
                size={38}
                strokeWidth={1.8}
                className="mx-auto text-[#061b3a]"
              />

              <p className="mt-3 text-xs font-black text-[#061b3a]">
                {cat.nombre}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}