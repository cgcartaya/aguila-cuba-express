'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { whatsapp } from './content';
import s from './luxury.module.css';
import { useLuxuryLanguage, translateTree } from './i18n';

const slides = [
  { title: 'El mundo te espera.', subtitle: 'El viaje empieza contigo.', label: 'Grecia · Islas del Egeo', tiles: [{image:'hero',label:'Grecia'}] },
  { title: 'Estados Unidos, a tu manera.', subtitle: 'Ciudades, parques y naturaleza.', label: 'Orlando · Miami · Las Vegas · Nueva York · Springs de Florida', tiles: [{image:'orlando',label:'Orlando'},{image:'miami',label:'Miami'},{image:'nyc',label:'Nueva York'},{image:'vegas',label:'Las Vegas'}] },
  { title: 'Europa para recordar.', subtitle: 'Un continente. Mil historias.', label: 'Italia · España · Grecia · Francia · Inglaterra', tiles: [{image:'groups/11',label:'Italia'},{image:'groups/6',label:'España'},{image:'paris',label:'Francia'},{image:'london',label:'Inglaterra'}] },
  { title: 'Más allá de lo esperado.', subtitle: 'Cultura, aventura y asombro.', label: 'Turquía · Egipto · Japón', tiles: [{image:'groups/13',label:'Turquía'},{image:'egypt',label:'Egipto'},{image:'groups/2',label:'Japón'}] },
  { title: 'El lujo de descubrir.', subtitle: 'Naturaleza que deja huella.', label: 'Sudáfrica · Marruecos · Perú', tiles: [{image:'groups/20',label:'Sudáfrica'},{image:'morocco',label:'Marruecos'},{image:'peru',label:'Perú'}] },
];
export default function HeroGallery() {
  const {language}=useLuxuryLanguage();
  const track = useRef<HTMLDivElement>(null); const [active, setActive] = useState(0);
  function go(index:number) { const next = (index + slides.length) % slides.length; track.current?.scrollTo({ left: next * track.current.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
  return translateTree(<section className={s.galleryHero} aria-label="Galería de destinos" aria-roledescription="carrusel">
    <div className={s.heroTrack} ref={track} onScroll={e => { const el=e.currentTarget;setActive(Math.round(el.scrollLeft/el.clientWidth)); }}>
      {slides.map((slide,i) => <article key={slide.title} className={s.heroSlide} aria-roledescription="diapositiva" aria-label={`${i+1} de ${slides.length}: ${slide.label}`}>
        <div className={s.heroCollage} data-count={slide.tiles.length}>{slide.tiles.map((tile,j) => <div key={tile.image}><Image src={`/luxury/${tile.image}.webp`} alt={tile.label} fill sizes={slide.tiles.length===1?'100vw':'(max-width:600px) 50vw, 50vw'} preload={i===0&&j===0}/><span>{tile.label}</span></div>)}</div><div className={s.heroShade}/>
        <div className={s.galleryCopy}><p className={s.heroEyebrow}>DMC EN ESTADOS UNIDOS Y CUBA</p>{i===0?<h1>{slide.title}<br/><em>{slide.subtitle}</em></h1>:<h2>{slide.title}<br/><em>{slide.subtitle}</em></h2>}<p>{slide.label}</p><div className={s.heroActions}><a className={s.goldButton} href="#destinos" tabIndex={active===i?0:-1}>Explora nuestros grupos <ArrowUpRight size={20}/></a><a className={s.heroLink} href={whatsapp(`Hola, Luxury. Quisiera organizar un viaje a ${slide.label}.`)} target="_blank" rel="noopener noreferrer" tabIndex={active===i?0:-1}>Diseña tu viaje con nosotros</a></div></div>
      </article>)}
    </div>
    <div className={s.galleryControls}><span aria-live="polite">{String(active+1).padStart(2,'0')} / 05</span><div className={s.galleryDots}>{slides.map((slide,i)=><button key={slide.title} type="button" aria-label={`Ver ${slide.label}`} aria-pressed={active===i} onClick={()=>go(i)}/>)}</div><span className={s.swipeHint}>Desliza para descubrir</span><button type="button" onClick={()=>go(active-1)} aria-label="Destino anterior"><ArrowLeft size={20}/></button><button type="button" onClick={()=>go(active+1)} aria-label="Siguiente destino"><ArrowRight size={20}/></button></div>
  </section>,language);
}
