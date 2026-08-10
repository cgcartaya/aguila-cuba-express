import { Check, Crown, Rocket } from "lucide-react";
import { DEMO_PATH } from "./links";

const plans = [
  { name: "Starter", price: "$20", suffix: "/mes", description: "La base ideal para comenzar a vender online.", icon: Rocket, features: ["Tienda online profesional", "Productos e inventario", "Gestión de pedidos", "WhatsApp integrado", "Analytics", "Subdominio incluido"] },
  { name: "Business", price: "Personalizado", suffix: "", description: "Para operaciones que necesitan más control y automatización.", icon: Crown, featured: true, features: ["Todo lo incluido en Starter", "Multiempresa", "Automatizaciones", "Módulos personalizados", "Dominio personalizado", "Soporte prioritario"] },
];

export default function PerlaPlans() {
  return (
    <section id="planes" className="px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center"><p className="text-sm font-black uppercase tracking-[.25em] text-violet-600">Precios claros</p><h2 className="mt-4 text-4xl font-black text-[#071044] sm:text-5xl">Empieza pequeño. Crece sin cambiar de plataforma.</h2></div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => { const Icon = plan.icon; return (
            <article key={plan.name} className={`rounded-[2rem] border p-8 ${plan.featured ? "border-violet-500 bg-[#071044] text-white shadow-2xl shadow-violet-200" : "border-slate-200 bg-white text-[#071044] shadow-sm"}`}>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${plan.featured ? "bg-violet-500" : "bg-violet-100 text-violet-600"}`}><Icon /></div>
              <h3 className="mt-6 text-3xl font-black">{plan.name}</h3><p className={`mt-3 ${plan.featured ? "text-white/65" : "text-slate-500"}`}>{plan.description}</p>
              <div className="mt-7"><span className="text-5xl font-black">{plan.price}</span><span className="font-bold opacity-60">{plan.suffix}</span></div>
              <div className="mt-8 space-y-3">{plan.features.map((feature) => <div key={feature} className="flex gap-3 text-sm font-bold"><Check className="shrink-0 text-emerald-500" size={20} />{feature}</div>)}</div>
              <a href={DEMO_PATH} className={`mt-9 block rounded-2xl px-6 py-4 text-center font-black ${plan.featured ? "bg-white text-violet-700" : "bg-violet-600 text-white"}`}>Solicitar demo</a>
            </article>
          ); })}
        </div>
      </div>
    </section>
  );
}
