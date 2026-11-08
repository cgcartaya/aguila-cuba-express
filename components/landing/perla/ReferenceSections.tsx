"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, BarChart3, ChevronDown, Layers3, Monitor, Search, ShoppingCart, Truck, Users, UtensilsCrossed } from "lucide-react";
import { buildWhatsAppUrl } from "@/components/perla/links";
import type { PerlaClient } from "@/lib/services/perla-showcase";
import { layoutClients } from "./client-layout";
import s from "./reference-sections.module.css";

const modules = [
  { id: "tienda", title: "Tienda online", category: "Comercio", icon: ShoppingCart, tone: "blue", description: "Catálogo, combos, pedidos e inventario.", demo: "https://tumercadolajero.com/tienda", menu: ["Catálogo", "Pedidos", "Inventario", "Combos", "Configuración"], details: "Organiza tus productos y combos, controla existencias y recibe pedidos desde móviles y computadoras. Configura zonas de entrega, límites de compra y medios de pago según tu operación." },
  { id: "envios", title: "Envíos y remesas", category: "Agencias", icon: Truck, tone: "mint", description: "Cotizaciones, recogidas, facturas y rastreo.", demo: "https://alvarez-travel.com", menu: ["Cotizaciones", "Recogidas", "Remesas", "Facturas", "Rastreo"], details: "Gestiona paquetería y operaciones de dinero, organiza recogidas y viajes y emite facturas y etiquetas con QR. Tus clientes pueden consultar el estado de su envío." },
  { id: "restaurante", title: "Restaurantes y bares", category: "Gastronomía", icon: UtensilsCrossed, tone: "peach", description: "Menú digital, modificadores y reservas.", demo: "https://depariscienfuegos.com", menu: ["Menú", "Modificadores", "Reservas", "Salas", "Configuración"], details: "Presenta platos y bebidas por categorías, configura extras y modificadores y administra disponibilidad, pedidos y reservas con los módulos que actives." },
  { id: "landing", title: "Landing page", category: "Todos", icon: Monitor, tone: "violet", description: "Tu marca con dominio y diseño propio.", demo: "https://luxury-travel-point.perlamarketplace.com", menu: ["Páginas", "Diseño", "Dominio", "Formularios", "Publicar"], details: "Reúne tu propuesta, servicios y contacto en una página adaptada a tu negocio, con tu identidad visual y dominio. Conecta la landing con tu tienda, menú o cotizadores." },
  { id: "shareapp", title: "ShareApp", category: "Comercio", icon: Users, tone: "blue", description: "Gestores, publicaciones y medición de alcance.", demo: "/demo", menu: ["Gestores", "Publicaciones", "Enlaces", "Alcance", "Configuración"], details: "Tus gestores comparten productos y campañas con enlaces identificados. Consulta visitas y compras atribuidas. Solicita una demo guiada para conocer el panel de administración." },
  { id: "economia", title: "Economía", category: "Todos", icon: BarChart3, tone: "mint", description: "Costos, márgenes y control del negocio.", demo: "/demo", menu: ["Costos", "Márgenes", "Productos", "Reportes", "Configuración"], details: "Registra costos y gastos, consulta márgenes y analiza la rentabilidad de tu catálogo. Solicita una demostración guiada para explorar estas herramientas." },
] as const;

function ProductPreview({ restaurant = false }: { restaurant?: boolean }) {
  const products = restaurant
    ? [{ name: "Especial de la casa", image: "especial" }, { name: "Desayuno", image: "desayuno" }, { name: "Pan artesanal", image: "pan" }]
    : [{ name: "Galletas", image: "galletas" }, { name: "Olla eléctrica", image: "olla" }, { name: "Energía portátil", image: "energia" }];
  return <div className={`${s.previewProducts} ${restaurant ? s.foodProducts : ""}`}>{products.map(item => <div key={item.image}><Image src={`/perla/demo/${item.image}.webp`} alt="" width={110} height={90} /><strong>{item.name}</strong>{restaurant ? <i>+</i> : <span>Agregar</span>}</div>)}</div>;
}

function ModulePreview({ module }: { module: typeof modules[number] }) {
  const Icon = module.icon;
  const titles: Record<string, string> = { tienda: "Catálogo de productos", envios: "Envíos y remesas", restaurante: "Menú digital", landing: "Viajes", shareapp: "Publicaciones", economia: "Costos de productos" };
  return <div className={s.previewWrap} aria-label={`Vista ilustrativa de ${module.title}`}>
    <div className={s.previewWindow}>
      <aside className={s.previewSidebar}><strong><Icon size={13} />{module.id === "restaurante" ? "Restaurante" : module.id === "envios" ? "Envíos" : module.id === "tienda" ? "Tienda" : module.id === "landing" ? "Landing" : module.title}</strong>{module.menu.map((label, index) => <span key={label} className={index === 0 ? s.sidebarSelected : ""}><Icon size={9} />{label}</span>)}</aside>
      <div className={s.previewContent}><div className={s.previewToolbar}><strong>{titles[module.id]}</strong>{module.id === "envios" ? <span className={s.newQuote}>Nueva cotización</span> : module.id === "landing" ? <span>Inicio · Destinos · Contacto</span> : module.id === "restaurante" ? <span>Salón <ChevronDown size={7} /></span> : <Search size={10} />}</div>
        {(module.id === "tienda" || module.id === "restaurante") && <ProductPreview restaurant={module.id === "restaurante"} />}
        {module.id === "envios" && <div className={s.shippingPreview}><div><div className={s.tableRow}><b>Envío</b><b>Destino</b><b>Estado</b></div>{["En tránsito", "Por recoger", "Entregado"].map((label, index) => <div className={s.tableRow} key={label}><span>EV–1048{index}</span><span>{["Habana", "Matanzas", "Cienfuegos"][index]}</span><em data-tone={index}>{label}</em></div>)}</div><div className={s.invoice}><strong>Factura</strong><Image src="/perla/modules/invoice-demo.svg" width={72} height={72} alt="" /><small>Demo</small><i /><i /></div></div>}
        {module.id === "landing" && <div className={s.travelPreview}><Image src="/perla/modules/travel.webp" alt="" width={300} height={170} /><div><strong>Descubre<br />nuevos destinos.</strong><span>Explorar viajes →</span></div></div>}
        {module.id === "shareapp" && <div className={s.campaignPreview}><div className={s.campaignList}>{["Promo de temporada", "Escapada de fin de semana"].map(title => <div key={title}><Image src="/perla/modules/travel.webp" alt="" width={64} height={45} /><div><strong>{title}</strong><span>Lista</span></div></div>)}</div><div className={s.miniPhone}><span className={s.miniNotch} /><div className={s.miniPhoneBar}>ShareApp <Users size={7} /></div><Image src="/perla/modules/travel.webp" alt="" width={80} height={65} /><strong>Comparte y llega<br />a más clientes</strong><span>Compartir →</span></div></div>}
        {module.id === "economia" && <div className={s.costPreview}><div className={s.costRow}><b>Producto</b><b>Costo</b><b>Margen</b></div>{[["Especial de la casa", "8.50", "42%"], ["Desayuno", "5.00", "38%"], ["Pan artesanal", "2.20", "47%"]].map(([name, cost, margin]) => <div className={s.costRow} key={name}><span>{name}</span><span>${cost}</span><em>{margin}</em></div>)}<small>Datos ilustrativos</small></div>}
      </div>
    </div>
  </div>;
}

export function ModulesSection() {
  const [filter, setFilter] = useState("Todos");
  const [detail, setDetail] = useState<string | null>(null);
  return <section id="modulos" className={s.modulesSection}><div className={s.container}>
    <div className={s.moduleHeading}><div><p>MÓDULOS CONECTADOS</p><h2>Elige lo que tu negocio necesita.</h2><span>Empieza con un módulo y amplía tu operación cuando lo necesites.</span></div><div className={s.filters} aria-label="Filtrar módulos">{["Todos", "Comercio", "Gastronomía", "Agencias"].map(label => <button key={label} type="button" aria-pressed={filter === label} onClick={() => { setFilter(label); setDetail(null); }} className={filter === label ? s.selectedFilter : ""}>{label}</button>)}</div></div>
    <div className={s.moduleGrid}>{modules.filter(item => filter === "Todos" || item.category === "Todos" || item.category === filter).map(module => {
      const Icon = module.icon;
      return <article className={`${s.moduleCard} ${s[module.tone]}`} key={module.id}><ModulePreview module={module} /><div className={s.moduleBody}><span className={s.moduleIcon}><Icon size={27} /></span><div className={s.moduleCopy}><h3>{module.title}</h3><p>{module.description}</p><div className={s.moduleLinks}><a href={module.demo} target={module.demo.startsWith("https") ? "_blank" : undefined} rel={module.demo.startsWith("https") ? "noopener noreferrer" : undefined} aria-label={`Ver demo${module.demo === "/demo" ? " guiada" : ""} de ${module.title}`}>Ver demo <ArrowRight size={14} /></a><button type="button" onClick={() => setDetail(detail === module.id ? null : module.id)} aria-expanded={detail === module.id} aria-controls={`module-detail-${module.id}`}>Conocer módulo</button></div></div></div>{detail === module.id && <div id={`module-detail-${module.id}`} className={s.moduleDetail}>{module.details}</div>}</article>;
    })}</div>
    <div className={s.combine}><Layers3 size={34} /><h3>¿Necesitas varios módulos?</h3><a href="/demo">Armar mi solución <ArrowRight size={18} /></a><Waves /></div>
  </div></section>;
}

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
