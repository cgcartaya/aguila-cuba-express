"use client";

import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Menu, Play, ShoppingBag, Truck, UtensilsCrossed, X } from "lucide-react";
import type { PerlaClient } from "@/lib/services/perla-showcase";
import PerlaLogo from "@/components/perla/PerlaLogo";
import { CONTACT_EMAIL, buildWhatsAppUrl } from "@/components/perla/links";
import s from "./modular.module.css";
import HeroShowcase from "./HeroShowcase";
import { ModulesSection, ClientsAndPlans } from "./ReferenceSections";

const faqs = [
  ["¿Puedo contratar solo un módulo?", "Sí. Podemos comenzar con una landing page, tienda online, menú digital o módulo de envíos y conectar más herramientas según las necesidades de tu negocio."],
  ["¿Necesito conocimientos técnicos?", "No. Te acompañamos en la configuración inicial y te mostramos cómo administrar el catálogo, los pedidos y los módulos que contrates."],
  ["¿Puedo usar mi dominio y mi logo?", "Sí. Tu negocio conserva su identidad visual y puede utilizar un dominio propio o un subdominio de Perla Marketplace."],
  ["¿Cómo se define el precio?", "La propuesta depende de los módulos y del uso que necesite tu negocio. Antes de activar el servicio acordamos la mensualidad y cualquier comisión o tarifa por operación que corresponda."],
  ["¿Puedo ver una demo antes de contratar?", "Sí. Explora los sitios públicos de nuestros clientes y solicita una demostración guiada para conocer las herramientas de administración."],
];

export default function ModularLanding({ clients }: { clients: PerlaClient[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const contact = buildWhatsAppUrl("Hola, quiero conocer los módulos de Perla Marketplace para mi negocio.");
  const nav = [["Soluciones", "#modulos"], ["Demos", "#demos"], ["Clientes", "#clientes"], ["Precios", "#planes"]];
  return <div className={s.page}>
    <a href="#contenido-perla" className={s.skip}>Saltar al contenido</a>
    <header className={s.header}><div className={s.headerInner}><PerlaLogo /><nav aria-label="Navegación de Perla" className={s.desktopNav}>{nav.map(([label, href]) => <a href={href} key={label}>{label}</a>)}</nav><div className={s.headerActions}><a href="/admin" className={s.login}>Iniciar sesión</a><a href="/demo" className={s.primary}>Solicitar demo <ArrowUpRight size={16} /></a></div><button className={s.menuButton} aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={mobileOpen} aria-controls="perla-mobile-nav" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button></div>
      {mobileOpen && <nav id="perla-mobile-nav" aria-label="Navegación móvil" className={s.mobileNav}>{nav.map(([label, href]) => <a key={label} href={href} onClick={() => setMobileOpen(false)}>{label}<ArrowUpRight size={16} /></a>)}<a href="/admin">Iniciar sesión</a><a href="/gestores">Entrar a ShareApp</a><a href="/demo" className={s.primary}>Solicitar demo</a></nav>}
    </header>
    <main id="contenido-perla">
      <section className={s.hero}><div className={s.heroInner}><div className={s.heroCopy}><p className={s.eyebrow}><span /> TIENDAS · RESTAURANTES · ENVÍOS</p><h1>Tu negocio<br />conectado.<br /><span>Todo en Perla.</span></h1><p className={s.heroDescription}>Vende online, organiza tus envíos y administra tu negocio desde una sola plataforma.</p><div className={s.heroButtons}><a href="#modulos" className={s.primary}>Explorar módulos <ArrowRight size={18} /></a><a href="#demos" className={s.outline}><Play size={17} /> Ver demos</a></div><div className={s.heroNotes}><span><Check />Tu marca y dominio</span><span><Check />Soporte cercano</span></div></div>
      <HeroShowcase /></div></section>

      {clients.length > 0 && <section className={s.trust}><div className={s.container}><p>NEGOCIOS QUE YA TRABAJAN CON PERLA</p><div>{clients.slice(0, 5).map(client => <a key={client.id} href={client.url} target="_blank" rel="noopener noreferrer">{client.name}</a>)}</div></div></section>}

      <ModulesSection />

      <section id="demos" className={`${s.section} ${s.demosSection}`}><div className={s.container}><div className={s.demoGrid}><div><p className={s.eyebrow}>EXPLORA PERLA</p><h2>Conoce la experiencia.<br /><span>Imagina tu negocio.</span></h2><p className={s.sectionDescription}>Visita tiendas, menús y agencias que ya utilizan Perla. Para descubrir la administración, te acompañamos en una demostración personalizada.</p><a href="/demo" className={s.primary}><Play size={16} /> Solicitar demo guiada</a><p className={s.smallNote}>Los enlaces públicos corresponden a negocios reales.</p></div><div className={s.demoLinks}>{[{ title: "Comprar online", label: "Explora un catálogo y sus productos", href: "https://tumercadolajero.com/tienda", icon: ShoppingBag }, { title: "Descubrir un menú", label: "Platos, bebidas y reservas", href: "https://depariscienfuegos.com", icon: UtensilsCrossed }, { title: "Conocer una agencia", label: "Servicios, cotización y rastreo", href: "https://alvarez-travel.com", icon: Truck }].map(d => <a key={d.title} href={d.href} target="_blank" rel="noopener noreferrer"><span className={s.demoLinkIcon}><d.icon /></span><div><h3>{d.title}</h3><p>{d.label}</p></div><ArrowUpRight /></a>)}</div></div></div></section>

      <ClientsAndPlans clients={clients} />

      <section id="como-funciona" className={s.section}><div className={s.container}><div className={s.centerHeading}><p className={s.eyebrow}>TE ACOMPAÑAMOS</p><h2>De tu idea<br />a tu negocio conectado.</h2></div><div className={s.steps}>{[["01", "Conocemos tu negocio", "Nos cuentas cómo trabajas y elegimos los módulos adecuados."], ["02", "Lo hacemos tuyo", "Configuramos tu marca, catálogo y reglas de operación."], ["03", "Te mostramos cómo", "Aprendes a gestionar tu negocio con acompañamiento."], ["04", "Empiezas a operar", "Compartes tu enlace y administras todo desde Perla."]].map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

      <section id="preguntas" className={`${s.section} ${s.faqSection}`}><div className={s.faqLayout}><div><p className={s.eyebrow}>HABLEMOS CLARO</p><h2>Antes de<br />dar el paso.</h2><p>Resolvemos tus dudas y te ayudamos a elegir.</p><a href={contact} target="_blank" rel="noopener noreferrer" className={s.textLink}>Hablar con nosotros <ArrowUpRight size={17} /></a></div><div>{faqs.map(([question, answer]) => <details className={s.faq} key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></div></section>

      <section className={s.finalCta}><div className={s.container}><p className={s.eyebrow}>EL SIGUIENTE PASO ES TUYO</p><h2>Tu negocio tiene mucho<br />por delante. <span>Conectémoslo.</span></h2><p>Cuéntanos qué necesitas y descubre lo que podemos construir juntos.</p><div><a className={s.whiteButton} href="/demo">Solicitar una demo <ArrowRight size={18} /></a><a className={s.ctaContact} href={contact} target="_blank" rel="noopener noreferrer">Hablemos por WhatsApp <ArrowUpRight size={17} /></a></div></div></section>
    </main>
    <footer className={s.footer}><div className={s.footerGrid}><div><PerlaLogo /><p>Tu marca. Tus herramientas.<br />Todo conectado en Perla.</p></div><div><h3>Plataforma</h3><a href="#modulos">Módulos</a><a href="#demos">Demos</a><a href="#clientes">Nuestros clientes</a><a href="#planes">Planes y precios</a></div><div><h3>Accesos</h3><a href="/admin">Administración</a><a href="/gestores">ShareApp para gestores</a><a href="/demo">Solicitar demo</a><a href="#preguntas">Preguntas frecuentes</a></div><div><h3>Hablemos</h3><a href={contact} target="_blank" rel="noopener noreferrer">WhatsApp <ArrowUpRight size={14} /></a><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><p>Miami, Florida</p></div></div><div className={s.footerBottom}><span>© {new Date().getFullYear()} Perla Marketplace</span><span>Tiendas · Restaurantes · Envíos</span></div></footer>
  </div>;
}
