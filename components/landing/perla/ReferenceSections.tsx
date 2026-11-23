"use client";
import Image from "next/image";
import { ArrowUpRight, Layers3, Monitor, ShoppingCart } from "lucide-react";
import { buildWhatsAppUrl } from "@/components/perla/links";
import type { PerlaClient } from "@/lib/services/perla-showcase";
import { layoutClients } from "./client-layout";
import s from "./reference-sections.module.css";

function Waves() {
  return <svg className={s.waves} viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true"><path fill="#1960e8" d="M0 130C80 150 100 280 380 300H0Z" /><path fill="#1044ad" d="M0 210C90 200 160 290 380 300H0Z" /><path fill="#02c8c7" d="M1440 60C1310 100 1360 230 1190 255S1040 270 930 300H1440Z" /><path fill="#009fb7" d="M1440 120C1320 190 1390 230 1180 300H1440Z" /><path fill="#087a9d" d="M1440 225C1350 220 1320 280 1260 300H1440Z" /></svg>;
}

export function ClientsAndPlans({ clients }: { clients: PerlaClient[] }) {
  const { featured, remaining } = layoutClients(clients);
  const plans = [
    { name: "Presencia digital", description: "Landing page", icon: Monitor },
    { name: "Venta y gestión", description: "Tienda online o menú digital", icon: ShoppingCart },
    { name: "Operación integral", description: "Módulos conectados para tu negocio", icon: Layers3 },
  ];
  return <>
    <section id="clientes" className={s.clientsSection}><div className={s.container}><div className={s.clientsHeading}><h2>Negocios que crecen con <span>Perla</span></h2><p>Conoce las marcas que forman parte de nuestra plataforma.</p></div>
      {featured.length > 0 && <div className={s.featuredGrid}>{featured.map((client, index) => <a href={client.url} target="_blank" rel="noopener noreferrer" key={client.id} className={s.featuredClient}><div className={s.clientTitle}><span className={`${s.monogram} ${index % 2 ? s.mintMonogram : ""}`} aria-hidden="true">{client.displayName[0]}</span><h3>{client.displayName}</h3><ArrowUpRight size={18} /></div><div className={s.laptop}><div className={s.laptopScreen}><Image src={client.screenshot!} alt={`Vista del sitio de ${client.displayName}`} width={720} height={450} /></div><div className={s.laptopBase}><i /></div></div><span className={s.visit}>Visitar sitio <ArrowUpRight size={15} /></span></a>)}</div>}
      {remaining.length > 0 && <div className={s.remainingClients}>{remaining.map((client, index) => <a key={client.id} href={client.url} target="_blank" rel="noopener noreferrer" className={s.clientStrip}><span className={`${s.monogram} ${index % 2 === 0 ? s.mintMonogram : ""}`} aria-hidden="true">{client.displayName[0]}</span><h3>{client.displayName}</h3><ArrowUpRight size={18} /></a>)}</div>}
      {clients.length === 0 && <p className={s.emptyClients}>Conoce cómo Perla puede acompañar a tu negocio en una demo personalizada.</p>}
    </div></section>
    <section id="planes" className={s.plansSection}><Waves /><div className={s.planContainer}><div className={s.plansHeading}><p>PLANES MODULARES</p><h2>Una solución a tu medida.</h2><span>Combina los módulos que necesitas. Precios por definir.</span></div><div className={s.planGrid}>{plans.map(plan => <article className={s.planCard} key={plan.name}><div className={s.planTop}><span><plan.icon size={31} /></span><div><h3>{plan.name}</h3><p>{plan.description}</p></div></div><strong className={s.planPrice}>Por definir</strong><a href={buildWhatsAppUrl(`Hola, me interesa el plan ${plan.name} de Perla Marketplace.`)} target="_blank" rel="noopener noreferrer">Consultar plan</a></article>)}</div><p className={s.planNote}>Propuesta de estructura · importes pendientes</p></div></section>
  </>;
}
