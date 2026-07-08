import { ArrowRight, ShoppingCart, Sparkles } from "lucide-react";
import { whatsappUrl } from "./links";

export default function PerlaCTA() {
  return (
    <section id="precios" className="px-5 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-600 p-8 text-white shadow-2xl shadow-violet-200 sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto_220px]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black">
              <Sparkles className="h-4 w-4" />
              Lleva tu negocio al siguiente nivel
            </div>
            <h2 className="text-3xl font-black sm:text-4xl">¿Listo para crear tu tienda online?</h2>
            <p className="mt-3 max-w-2xl text-white/80">Crea tu tienda hoy y empieza a recibir pedidos sin complicarte con tecnología.</p>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 font-black text-violet-700 shadow-lg transition hover:-translate-y-1"
          >
            Crear mi tienda ahora <ArrowRight className="h-5 w-5" />
          </a>

          <div className="hidden items-center justify-center lg:flex">
            <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white/15">
              <ShoppingCart className="h-16 w-16" strokeWidth={1.7} />
              <div className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-amber-300" />
              <div className="absolute -bottom-2 -left-3 h-6 w-6 rounded-full bg-sky-300" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
