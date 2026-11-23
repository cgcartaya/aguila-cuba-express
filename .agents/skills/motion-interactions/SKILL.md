---
name: motion-interactions
description: Añadir animaciones, scroll reveals, hover y fondos interactivos accesibles y eficientes usando herramientas ya presentes.
---
# Motion & Microinteractions — Perla

## Principios
Motion comunica jerarquía y resultado; no debe distraer de precio, lectura o checkout. Por defecto usar CSS y Framer Motion ya instalado; no añadir GSAP, Three.js ni paquetes visuales sin necesidad y aprobación.

## Patrones permitidos
- Entrada hero discreta: opacity + translateY pequeño (8–20px), duración aprox. 0.35–0.6s.
- Reveal de secciones al entrar al viewport, una sola vez; contenido visible si JS falla.
- Hover de tarjeta: elevación sutil y borde/fondo; nunca cambios grandes de layout.
- CTA: estados pressed, focus-visible y loading claros.
- Proceso visual en tarjetas: secuencia útil, con pausa cuando pierde visibilidad.
- Fondo animado: preferir capas CSS ligeras; evitar grandes áreas blur y parallax intenso en móvil.

## Requisitos técnicos
- Respetar `prefers-reduced-motion: reduce`: desactivar desplazamientos, loops y parallax sin ocultar contenido.
- Animar transform y opacity, no layout ni blur costoso repetido.
- Evitar hydration mismatch en Next.js; no depender de window durante render servidor.
- No animar por defecto todas las tarjetas ni hacer autoplay agresivo.
- No esconder CTA, formulario o textos hasta que se active animación.
- Si hay carrusel: controles accesibles, pausa posible, navegación táctil y teclado, evitar autoplay de contenido crítico.
- Medir o inspeccionar INP, CLS, LCP y coste de bundle cuando se implementen cambios grandes.

## Ejemplo de aceptación
En 360px y con reduced motion la landing sigue legible y utilizable, sin saltos; las animaciones no bloquean acciones ni se repiten al navegar atrás.
