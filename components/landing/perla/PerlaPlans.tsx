import { Check, Crown, Rocket } from "lucide-react";
import { whatsappUrl } from "./links";

const plans = [
  {
    name: "Plan Básico",
    price: "$20",
    period: "/mes",
    description:
      "Ideal para negocios pequeños que quieren comenzar a vender online rápido.",
    badge: "Para empezar",
    icon: Rocket,
    buttonText: "Elegir Plan Básico",
    whatsappText:
      "Hola, quiero contratar el Plan Básico de Perla Marketplace.",
    features: [
      "Tienda online profesional",
      "Subdominio incluido",
      "Productos, categorías y banners",
      "Órdenes por WhatsApp",
      "Panel administrativo",
    ],
  },
  {
    name: "Plan Pro",
    price: "$35",
    period: "/mes",
    description:
      "Para negocios que quieren una tienda más completa, personalizada y preparada para crecer.",
    badge: "Recomendado",
    icon: Crown,
    buttonText: "Elegir Plan Pro",
    whatsappText:
      "Hola, quiero contratar el Plan Pro de Perla Marketplace.",
    featured: true,
    features: [
      "Todo lo del Plan Básico",
      "Dominio personalizado",
      "Combos y productos destacados",
      "Configuración avanzada de tienda",
      "Soporte prioritario",
    ],
  },
];

export default function PerlaPlans() {
  return (
    <section id="planes" className="px-5 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-violet-600">
            Planes
          </p>

          <h2 className="mt-4 text-3xl font-black text-[#071044] sm:text-5xl">
            Escoge el plan ideal para tu negocio
          </h2>

          <p className="mt-4 text-base leading-8 text-[#5c6794] sm:text-lg">
            En la landing mostramos lo esencial. Al contratar verás todos los
            detalles del plan, configuración y próximos pasos.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => {
            const Icon = plan.icon;

            const href = `${whatsappUrl}&text=${encodeURIComponent(
              plan.whatsappText
            )}`;

            return (
              <article
                key={plan.name}
                className={`relative overflow-hidden rounded-[2rem] border p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                  plan.featured
                    ? "border-violet-300 bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-violet-200"
                    : "border-violet-100 bg-white text-[#071044]"
                }`}
              >
                {plan.featured && (
                  <div className="absolute right-5 top-5 rounded-full bg-white/20 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white backdrop-blur">
                    Recomendado
                  </div>
                )}

                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                    plan.featured
                      ? "bg-white text-violet-700"
                      : "bg-violet-100 text-violet-700"
                  }`}
                >
                  <Icon size={28} strokeWidth={2.5} />
                </div>

                <div className="mt-6">
                  <p
                    className={`text-sm font-black uppercase tracking-[0.25em] ${
                      plan.featured ? "text-white/70" : "text-violet-600"
                    }`}
                  >
                    {plan.badge}
                  </p>

                  <h3 className="mt-3 text-3xl font-black">{plan.name}</h3>

                  <p
                    className={`mt-3 max-w-xl leading-7 ${
                      plan.featured ? "text-white/75" : "text-[#5c6794]"
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                <div className="mt-7 flex items-end gap-2">
                  <span className="text-5xl font-black">{plan.price}</span>
                  <span
                    className={`mb-2 font-bold ${
                      plan.featured ? "text-white/70" : "text-[#5c6794]"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>

                <div className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          plan.featured
                            ? "bg-white/20 text-white"
                            : "bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        <Check size={15} strokeWidth={3} />
                      </span>

                      <p
                        className={`font-semibold ${
                          plan.featured ? "text-white/85" : "text-[#34406f]"
                        }`}
                      >
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>

                <a
                  href={href}
                  target="_blank"
                  className={`mt-8 block rounded-2xl px-6 py-4 text-center font-black transition ${
                    plan.featured
                      ? "bg-white text-violet-700 hover:bg-violet-50"
                      : "bg-violet-600 text-white hover:bg-violet-700"
                  }`}
                >
                  {plan.buttonText}
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}