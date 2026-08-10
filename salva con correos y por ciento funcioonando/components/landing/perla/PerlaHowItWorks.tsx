import { PlusCircle, ShoppingCart, Store } from "lucide-react";

const steps = [
  {
    number: "1",
    Icon: Store,
    title: "Creamos tu tienda",
    text: "Configuramos tu tienda con tu marca y dominio.",
    color: "bg-violet-600",
  },
  {
    number: "2",
    Icon: PlusCircle,
    title: "Agregas tus productos",
    text: "Subes productos, categorías, banners y combos.",
    color: "bg-emerald-500",
  },
  {
    number: "3",
    Icon: ShoppingCart,
    title: "Empiezas a vender",
    text: "Recibe órdenes y haz crecer tu negocio.",
    color: "bg-amber-400",
  },
];

export default function PerlaHowItWorks() {
  return (
    <section id="como-funciona" className="px-5 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-black text-[#071044] sm:text-4xl">Así de simple</h2>
          <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-violet-600" />
        </div>

        <div className="relative mt-10 grid gap-6 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[20%] top-1/2 hidden h-px w-[60%] border-t border-dashed border-violet-300 md:block" />

          {steps.map(({ number, Icon, title, text, color }) => (
            <div key={number} className="relative rounded-[1.5rem] border border-violet-100 bg-white p-7 text-center shadow-xl shadow-violet-100/70 transition hover:-translate-y-1">
              <div className={`absolute -left-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full ${color} text-sm font-black text-white shadow-lg`}>
                {number}
              </div>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Icon className="h-9 w-9" />
              </div>
              <h3 className="mt-5 font-black text-[#071044]">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#5c6794]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
