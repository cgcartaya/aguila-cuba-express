"use client";
import { Layers3, Monitor, ShoppingCart } from "lucide-react";
import { buildWhatsAppUrl } from "@/components/perla/links";
import type { PerlaClient } from "@/lib/services/perla-showcase";
import ClientOrbit from "./ClientOrbit";
import s from "./reference-sections.module.css";

function Waves() {
  return <svg className={s.waves} viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true"><path fill="#1960e8" d="M0 130C80 150 100 280 380 300H0Z" /><path fill="#1044ad" d="M0 210C90 200 160 290 380 300H0Z" /><path fill="#02c8c7" d="M1440 60C1310 100 1360 230 1190 255S1040 270 930 300H1440Z" /><path fill="#009fb7" d="M1440 120C1320 190 1390 230 1180 300H1440Z" /><path fill="#087a9d" d="M1440 225C1350 220 1320 280 1260 300H1440Z" /></svg>;
}

export function ClientsAndPlans({ clients }: { clients: PerlaClient[] }) {
  const plans = [
    { name: "Presencia digital", description: "Landing page", icon: Monitor },
    { name: "Venta y gestión", description: "Tienda online o menú digital", icon: ShoppingCart },
    { name: "Operación integral", description: "Módulos conectados para tu negocio", icon: Layers3 },
  ];
  return <>
    <ClientOrbit clients={clients} />
    <section id="planes" className={s.plansSection}><Waves /><div className={s.planContainer}><div className={s.plansHeading}><p>PLANES MODULARES</p><h2>Una solución a tu medida.</h2><span>Combina los módulos que necesitas. Precios por definir.</span></div><div className={s.planGrid}>{plans.map(plan => <article className={s.planCard} key={plan.name}><div className={s.planTop}><span><plan.icon size={31} /></span><div><h3>{plan.name}</h3><p>{plan.description}</p></div></div><strong className={s.planPrice}>Por definir</strong><a href={buildWhatsAppUrl(`Hola, me interesa el plan ${plan.name} de Perla Marketplace.`)} target="_blank" rel="noopener noreferrer">Consultar plan</a></article>)}</div><p className={s.planNote}>Propuesta de estructura · importes pendientes</p></div></section>
  </>;
}
