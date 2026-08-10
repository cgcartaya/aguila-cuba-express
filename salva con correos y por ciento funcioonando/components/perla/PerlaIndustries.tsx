import { Cpu, HardHat, HeartPulse, Package, Pizza, Shirt, ShoppingBasket, Truck } from "lucide-react";

const industries = [
  [ShoppingBasket, "Supermercados"], [Pizza, "Restaurantes"], [Shirt, "Moda"], [Cpu, "Tecnología"],
  [HeartPulse, "Farmacias"], [HardHat, "Ferreterías"], [Truck, "Envíos"], [Package, "Comercio local"],
];

export default function PerlaIndustries() {
  return (
    <section className="px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-br from-violet-50 via-white to-blue-50 p-8 sm:p-12">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[.25em] text-violet-600">Para cualquier negocio</p>
            <h2 className="mt-4 text-4xl font-black text-[#071044]">Una plataforma, muchas formas de vender.</h2>
            <p className="mt-4 leading-7 text-slate-600">La estructura modular de Perla Marketplace se adapta a distintos catálogos, operaciones y modelos de entrega.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {industries.map(([Icon, label]) => { const IndustryIcon = Icon as typeof ShoppingBasket; return <div key={label as string} className="rounded-2xl bg-white p-4 text-center shadow-sm"><IndustryIcon className="mx-auto text-violet-600" /><p className="mt-3 text-sm font-black text-slate-800">{label as string}</p></div>; })}
          </div>
        </div>
      </div>
    </section>
  );
}
