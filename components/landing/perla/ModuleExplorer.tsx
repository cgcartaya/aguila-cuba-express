"use client";

import { useState, type KeyboardEvent } from "react";
import ModuleDemo from "./ModuleDemo";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, BarChart3, Check, ChevronDown, Layers3, Monitor, Play, Search, ShoppingCart, Truck, Users, UtensilsCrossed } from "lucide-react";
import { buildWhatsAppUrl } from "@/components/perla/links";
import s from "./reference-sections.module.css";

const modules = [
  { id: "tienda", title: "Tienda online", category: "Comercio", icon: ShoppingCart, tone: "blue", description: "Catálogo, combos, pedidos e inventario.", menu: ["Catálogo", "Pedidos", "Inventario", "Combos", "Configuración"], details: "Organiza tus productos y combos, controla existencias y recibe pedidos desde móviles y computadoras. Configura zonas de entrega, límites de compra y medios de pago según tu operación." },
  { id: "envios", title: "Envíos y remesas", category: "Agencias", icon: Truck, tone: "mint", description: "Cotizaciones, recogidas, facturas y rastreo.", menu: ["Cotizaciones", "Recogidas", "Remesas", "Facturas", "Rastreo"], details: "Gestiona paquetería y operaciones de dinero, organiza recogidas y viajes y emite facturas y etiquetas con QR. Tus clientes pueden consultar el estado de su envío." },
  { id: "restaurante", title: "Restaurantes y bares", category: "Gastronomía", icon: UtensilsCrossed, tone: "peach", description: "Menú digital, modificadores y reservas.", menu: ["Menú", "Modificadores", "Reservas", "Salas", "Configuración"], details: "Presenta platos y bebidas por categorías, configura extras y modificadores y administra disponibilidad, pedidos y reservas con los módulos que actives." },
  { id: "landing", title: "Landing page", category: "Todos", icon: Monitor, tone: "violet", description: "Tu marca con dominio y diseño propio.", menu: ["Páginas", "Diseño", "Dominio", "Formularios", "Publicar"], details: "Reúne tu propuesta, servicios y contacto en una página adaptada a tu negocio, con tu identidad visual y dominio. Conecta la landing con tu tienda, menú o cotizadores." },
  { id: "shareapp", title: "ShareApp", category: "Comercio", icon: Users, tone: "blue", description: "Gestores, publicaciones y medición de alcance.", menu: ["Gestores", "Publicaciones", "Enlaces", "Alcance", "Configuración"], details: "Tus gestores comparten productos y campañas con enlaces identificados. Consulta visitas y compras atribuidas. Solicita una demo guiada para conocer el panel de administración." },
  { id: "economia", title: "Economía", category: "Todos", icon: BarChart3, tone: "mint", description: "Costos, márgenes y control del negocio.", menu: ["Costos", "Márgenes", "Productos", "Reportes", "Configuración"], details: "Registra costos y gastos, consulta márgenes y analiza la rentabilidad de tu catálogo. Solicita una demostración guiada para explorar estas herramientas." },
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


const featureSummaries: Record<(typeof modules)[number]['id'], string> = {
  "tienda": "Tu catálogo se conecta con el carrito, las órdenes y el inventario.",
  "envios": "Organiza cada paquete desde la cotización hasta el rastreo.",
  "restaurante": "Presenta tu menú y gestiona pedidos, extras y reservas.",
  "landing": "Una web con tu identidad, servicios y canales de contacto.",
  "shareapp": "Comparte productos y campañas mediante enlaces de tus gestores.",
  "economia": "Consulta costos, márgenes y reportes para tomar decisiones."
};


export default function ModuleExplorer() {
  const [activeId, setActiveId] = useState<(typeof modules)[number]["id"]>("tienda");
  const [demoId, setDemoId] = useState<(typeof modules)[number]["id"] | null>(null);
  const active = modules.find(item => item.id === activeId) ?? modules[0];
  const Icon = active.icon;

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % modules.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + modules.length) % modules.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = modules.length - 1;
    else return;
    event.preventDefault();
    setActiveId(modules[nextIndex].id);
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[nextIndex]?.focus();
  }

  return (
    <section id="modulos" className={s.explorerSection} aria-labelledby="explorer-heading">
      <div className={s.container}>
        <div className={s.explorerHeading}>
          <div className={s.explorerEyebrow}><span /> MÓDULOS CONECTADOS · PERLA MARKETPLACE</div>
          <h2 id="explorer-heading">Una plataforma. <span>Todo conectado.</span></h2>
          <p>Elige lo que tu negocio necesita y descubre cómo funciona cada solución, sin salir de esta página.</p>
        </div>

        <div className={s.explorerLayout}>
          <div className={s.explorerTabs} role="tablist" aria-label="Explorar módulos de Perla" aria-orientation="vertical">
            {modules.map((module, index) => {
              const TabIcon = module.icon;
              return (
                <button
                  key={module.id}
                  type="button"
                  role="tab"
                  id={`perla-tab-${module.id}`}
                  aria-controls="perla-module-panel"
                  aria-selected={activeId === module.id}
                  tabIndex={activeId === module.id ? 0 : -1}
                  className={s.explorerTab}
                  onClick={() => setActiveId(module.id)}
                  onKeyDown={event => onTabKeyDown(event, index)}
                >
                  <span className={s.explorerTabIcon}><TabIcon size={20} aria-hidden="true" /></span>
                  <span>{module.title}<small>{module.description}</small></span>
                  <ArrowRight className={s.explorerTabArrow} size={17} aria-hidden="true" />
                </button>
              );
            })}
            <div className={s.explorerTabsFoot}>
              <Layers3 size={21} aria-hidden="true" />
              <span>Combina los módulos a tu ritmo.</span>
            </div>
          </div>

          <article
            id="perla-module-panel"
            role="tabpanel"
            aria-labelledby={`perla-tab-${active.id}`}
            className={s.explorerPanel}
            key={active.id}
            tabIndex={0}
          >
            <div className={s.explorerPanelHead}>
              <span className={s.explorerBadge}><Icon size={16} aria-hidden="true" /> {active.category === "Todos" ? "Para tu negocio" : active.category}</span>
              <span className={s.explorerExample}>Vista ilustrativa · Datos de ejemplo</span>
            </div>
            <div className={s.explorerPreview}>
              <ModulePreview module={active} />
            </div>
            <div className={s.explorerPanelBody}>
              <div className={s.explorerCopy}>
                <h3>{active.title}</h3>
                <p className={s.explorerLead}>{featureSummaries[active.id]}</p>
                <p className={s.explorerDetails}>{active.details}</p>
              </div>
              <div className={s.explorerBenefits} aria-label={`Funciones de ${active.title}`}>
                {active.menu.slice(0, 4).map(feature => (
                  <span key={feature}><Check size={15} aria-hidden="true" />{feature}</span>
                ))}
              </div>
              <div className={s.explorerActions}>
                <button type="button" onClick={() => setDemoId(active.id)} className={s.explorerDemo}>
                  <Play size={16} aria-hidden="true" /> Probar demo <ArrowRight size={17} aria-hidden="true" />
                </button>
                <a
                  href={buildWhatsAppUrl(`Hola, quiero conocer y contratar el módulo ${active.title} de Perla Marketplace.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.explorerContact}
                >
                  Solicitar este módulo <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
          </article>
        </div>

        <div className={s.explorerCombine}>
          <span className={s.explorerCombineIcon}><Layers3 size={25} aria-hidden="true" /></span>
          <div>
            <h3>Empieza con uno. <span>Conecta todo cuando lo necesites.</span></h3>
            <p>Tu landing, tienda, envíos y administración pueden crecer juntos dentro de Perla.</p>
          </div>
          <a href="/demo">Armar mi solución <ArrowRight size={17} aria-hidden="true" /></a>
        </div>
      </div>
      {demoId && (
        <ModuleDemo
          key={demoId}
          id={demoId}
          title={modules.find(module => module.id === demoId)?.title ?? ""}
          onClose={() => setDemoId(null)}
        />
      )}
    </section>
  );
}
