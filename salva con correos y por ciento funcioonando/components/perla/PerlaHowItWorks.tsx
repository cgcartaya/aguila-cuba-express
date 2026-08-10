import { ArrowRight, Boxes, Rocket, Store, TrendingUp } from "lucide-react";

const steps = [
  [Store, "1", "Diseñamos tu tienda", "Configuramos la identidad, estructura y canales de contacto de tu negocio."],
  [Boxes, "2", "Cargas tu catálogo", "Agrega productos, categorías, combos, banners y reglas de entrega."],
  [Rocket, "3", "Compartes tu enlace", "Publica tu tienda en redes, WhatsApp o con tu propio dominio."],
  [TrendingUp, "4", "Vendes y analizas", "Recibe órdenes, controla el stock y mejora con métricas reales."],
];

export default function PerlaHowItWorks() {
  return (
    <section id="como-funciona" className="px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[.25em] text-violet-600">Cómo funciona</p>
          <h2 className="mt-4 text-4xl font-black text-[#071044] sm:text-5xl">De idea a tienda online en cuatro pasos.</h2>
        </div>
        <div className="mt-14 grid gap-5 lg:grid-cols-4">
          {steps.map(([Icon, number, title, text], index) => {
            const StepIcon = Icon as typeof Store;
            return (
              <article key={title as string} className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600"><StepIcon /></div><span className="text-5xl font-black text-slate-100">{number as string}</span></div>
                <h3 className="mt-6 text-xl font-black text-[#071044]">{title as string}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{text as string}</p>
                {index < steps.length - 1 && <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden text-violet-300 lg:block" />}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
