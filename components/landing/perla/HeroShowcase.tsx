"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Check, CheckCheck, ChevronRight, CircleCheck, PackageCheck, Pause, Play, ShoppingBag, Truck, UtensilsCrossed } from "lucide-react";
import { DEMO_TICK_MS, DEMO_TOTAL_TICKS, TICKS_PER_SCENE, demoScenes, getDemoFrame } from "./hero-demo";
import s from "./hero-showcase.module.css";

const icons = [ShoppingBag, Truck, UtensilsCrossed];

function RollingNumber({ value, money = false }: { value: number; money?: boolean }) {
  const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: money ? 2 : 0, maximumFractionDigits: money ? 2 : 0 }).format(value);
  return <span className={s.number} aria-label={`${money ? "$" : ""}${formatted}`}>
    <span aria-hidden="true" className={s.numberInner}>{money && <span>$</span>}{Array.from(formatted).map((character, index) =>
      /\d/.test(character)
        ? <span className={s.digit} key={index}><span className={s.digitStrip} style={{ transform: `translateY(-${Number(character)}em)` }}>{Array.from({ length: 10 }, (_, digit) => <span key={digit}>{digit}</span>)}</span></span>
        : <span key={index}>{character}</span>
    )}</span>
  </span>;
}

export default function HeroShowcase() {
  const stage = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [canAnimate, setCanAnimate] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const frame = getDemoFrame(tick);
  const { scene, sceneIndex, phase, confirmed } = frame;
  const shipping = scene.id === "shipping";
  const Icon = icons[sceneIndex];
  const playing = canAnimate && !paused;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = typeof IntersectionObserver === "undefined";
    const sync = () => {
      setReducedMotion(preference.matches);
      setCanAnimate(inView && !document.hidden && !preference.matches);
    };
    const observer = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting; sync();
    }, { threshold: 0.1 }) : null;
    if (stage.current) observer?.observe(stage.current);
    sync();
    preference.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setTick(current => (current + 1) % DEMO_TOTAL_TICKS), DEMO_TICK_MS);
    return () => window.clearInterval(timer);
  }, [playing]);

  return <div ref={stage} className={s.stage} data-playing={playing} data-scene={scene.id} aria-label="Demostración animada de Perla Marketplace">
    <div className={s.glow} aria-hidden="true" />
    <div className={s.tablet}>
      <div className={s.window}><span aria-hidden="true"><i /><i /><i /></span><span>Tu centro de operaciones</span><span className={s.demo}>Datos de demostración</span></div>
      <div className={s.tabletBody}>
        <aside className={s.sidebar} aria-hidden="true"><Image src="/perla/perla-shell.png" alt="" width={28} height={28} /><strong>Perla</strong>{icons.map((ItemIcon, index) => <span key={index} className={sceneIndex === index ? s.sideActive : ""}><ItemIcon size={16} /></span>)}</aside>
        <div className={s.workspace}>
          <div className={s.heading}><p>BIENVENIDO A PERLA</p><h2>Tu operación, en un vistazo.</h2><span>Todo conectado. Todo bajo control.</span></div>
          <div className={s.metrics}>
            <div><small>{shipping ? "Facturado" : "Ventas"}</small><strong><RollingNumber value={frame.amount} money /></strong><span>Ejemplo ilustrativo</span></div>
            <div><small>{shipping ? "Envíos" : "Pedidos"}</small><strong><RollingNumber value={frame.count} /></strong><span className={confirmed ? s.positive : ""}>{confirmed ? "+1 registrado" : "Actividad del negocio"}</span></div>
            <div><small>{shipping ? "Por entregar" : "Productos"}</small><strong><RollingNumber value={shipping ? 8 - (phase === 3 ? 1 : 0) : frame.inventory} /></strong><span>{shipping ? "Ruta organizada" : "Stock sincronizado"}</span></div>
          </div>
          <div className={s.sceneTabs} aria-label="Escena de la demostración">{demoScenes.map((item, index) => {
            const TabIcon = icons[index];
            return <button key={item.id} type="button" aria-pressed={sceneIndex === index} onClick={() => setTick(index * TICKS_PER_SCENE)} className={sceneIndex === index ? s.activeTab : ""}><TabIcon size={13} /><span>{item.label}</span></button>;
          })}</div>
          <div key={scene.id} className={s.scene}>
            <div className={s.sceneHeading}><h3>{scene.title}</h3><span><i /> {shipping ? "Seguimiento" : "Catálogo"}</span></div>
            {shipping ? <div className={s.shipments}>
              <div className={s.tableHead}><span>Envío</span><span>Destino</span><span>Estado</span></div>
              {["PE–1048", "PE–1047", "PE–1046"].map((code, index) => <div className={`${s.shipmentRow} ${index === 0 ? s.highlightRow : ""}`} key={code}><span><PackageCheck size={12} />{code}</span><span>{["La Habana", "Matanzas", "Cienfuegos"][index]}</span><em data-status={index === 0 ? phase : 3}>{index === 0 ? frame.tracking : index === 1 ? "Entregado" : "En tránsito"}</em></div>)}
            </div> : <div className={s.products}>{scene.products.map((product, index) => <div key={product.image} className={index === 0 && phase > 0 ? s.productSelected : ""}>
              <div className={s.productPhoto}><Image src={product.image} alt={product.name} width={120} height={90} loading="eager" />{index === 0 && phase > 0 && <span className={s.selectedMark}><Check size={9} /></span>}</div><strong>{product.short}</strong><span className={s.productPrice}>${product.price.toFixed(2)}<i>{index === 0 && phase > 0 ? <Check size={9} /> : "+"}</i></span>
            </div>)}</div>}
            <div className={s.activity}><span className={s.activityIcon}>{confirmed ? <CheckCheck size={12} /> : <Icon size={12} />}</span><span key={tick} className={s.activityText}>{frame.event}</span><small>Demo</small></div>
          </div>
        </div>
      </div>
    </div>

    <div className={s.phone} aria-hidden="true">
      <div className={s.notch} /><div className={s.phoneTop}><Image src="/perla/perla-shell.png" alt="" width={20} height={20} /><strong>{scene.phoneTitle}</strong><Icon size={12} /></div>
      <div key={scene.id} className={s.phoneScene}>
        <div className={s.phoneBanner} data-kind={scene.id}><small>{shipping ? "SEGUIMIENTO" : scene.id === "restaurant" ? "HECHO PARA DISFRUTAR" : "DESCUBRE LO NUEVO"}</small><strong>{shipping ? "Tu paquete,\nen camino." : scene.id === "restaurant" ? "Hoy se come\nmuy bien." : "Tu tienda,\nsiempre abierta."}</strong><span>{shipping ? "Guía PE–1048" : "Explorar catálogo"}<ChevronRight size={9} /></span></div>
        {shipping ? <div className={s.phoneTracking}><Truck size={22} /><strong>{frame.tracking}</strong><span>Miami → La Habana</span><div>{[0, 1, 2, 3].map(i => <i key={i} className={i <= phase ? s.trackingComplete : ""} />)}</div></div>
        : <><div className={s.phoneProducts}>{scene.products.slice(0, 2).map((product, index) => <div key={product.image}><Image src={product.image} alt="" width={65} height={55} loading="eager" /><strong>{product.short}</strong><span>${product.price.toFixed(2)}<i>{index === 0 && phase > 0 ? "✓" : "+"}</i></span></div>)}</div><div className={s.cart} data-confirmed={confirmed}><span>{confirmed ? <CheckCheck size={10} /> : <ShoppingBag size={10} />}{confirmed ? "Pedido recibido" : phase === 1 ? "1 producto" : "Tu carrito"}</span><b>${frame.cartTotal.toFixed(2)}</b></div></>}
      </div><div className={s.phoneHome} />
    </div>

    <div className={s.notification}>
      <span className={s.notificationIcon} data-confirmed={confirmed}>{shipping ? <Truck /> : confirmed ? <CircleCheck /> : <ShoppingBag />}</span>
      <div key={tick} className={s.notificationText}><strong>{shipping ? frame.tracking : confirmed ? "Nuevo pedido recibido" : phase === 1 ? "Tu carrito se actualiza" : "Tu negocio, conectado"}</strong><span>{shipping ? "PE–1048 · Miami → La Habana" : confirmed ? `Pedido de ejemplo · $${frame.cartTotal.toFixed(2)}` : "La tienda y el panel, sincronizados"}</span><div className={s.flow}><i className={phase > 0 ? s.complete : ""} /><b /><i className={phase > 1 ? s.complete : ""} /><b /><i className={phase > 2 ? s.complete : ""} /><ArrowRight size={11} /></div></div>
    </div>
    <div className={s.controls}><span><i className={playing ? s.playingDot : ""} />Demo ilustrativa</span>{reducedMotion ? <span className={s.reduced}>Movimiento reducido</span> : <button type="button" onClick={() => setPaused(current => !current)} aria-label={paused ? "Reanudar animación del banner" : "Pausar animación del banner"}>{paused ? <Play size={11} /> : <Pause size={11} />}{paused ? "Reanudar" : "Pausar"}</button>}</div>
  </div>;
}
