"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  ["¿Necesito conocimientos técnicos?", "No. La tienda y el panel están diseñados para usarse de forma visual. También ofrecemos acompañamiento en la configuración inicial."],
  ["¿Puedo usar mi propio dominio?", "Sí. Puedes comenzar con un subdominio incluido y conectar un dominio personalizado según tu plan."],
  ["¿Perla Marketplace cobra comisión por venta?", "No cobramos comisión por cada pedido. El servicio se ofrece mediante una mensualidad."],
  ["¿Puedo administrar varias tiendas?", "Sí. La arquitectura multiempresa mantiene separados productos, órdenes, inventario, clientes y configuraciones de cada tienda."],
  ["¿Incluye inventario y analítica?", "Sí. Puedes controlar existencias y consultar visitas, conversiones, embudo de compra y rendimiento por producto."],
  ["¿Se puede personalizar para mi operación?", "Sí. El plan Business permite automatizaciones, módulos y flujos personalizados, como rastreo de envíos o aplicaciones Android."],
];

export default function PerlaFAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="preguntas" className="px-5 py-24 lg:px-8"><div className="mx-auto max-w-4xl"><div className="text-center"><p className="text-sm font-black uppercase tracking-[.25em] text-violet-600">Preguntas frecuentes</p><h2 className="mt-4 text-4xl font-black text-[#071044]">Todo lo importante antes de comenzar.</h2></div><div className="mt-10 space-y-3">{faqs.map(([question, answer], index) => <article key={question} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><button type="button" onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center justify-between p-5 text-left font-black text-[#071044]">{question}<ChevronDown className={`transition ${open === index ? "rotate-180" : ""}`} /></button>{open === index && <p className="px-5 pb-5 leading-7 text-slate-600">{answer}</p>}</article>)}</div></div></section>
  );
}
