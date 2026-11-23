---
name: frontend-design
description: Diseño visual premium para hero, secciones y componentes Next.js/React de landings multitenant; usar cuando se solicite mejorar UI.
---
# Frontend Design — Perla

## Objetivo
Diseñar interfaces de alta calidad, distintivas y útiles, evitando pantallas genéricas de IA.

## Entrada
Identifica tenant/slug, ruta, audiencia, conversión principal, logo aprobado, colores, contenido real, idioma y limitaciones. Inspecciona lo existente antes de proponer un reemplazo.

## Proceso obligatorio
1. Definir concepto visual en 3–5 frases: personalidad, tono, jerarquía, contraste y motivo gráfico.
2. Seleccionar 1 tipografía titular y 1 de lectura que admitan caracteres ES/EN; usar fuentes existentes cuando sea posible.
3. Construir jerarquía: promesa clara, soporte concreto, CTA primario visible, CTA secundario no competitivo, prueba real si existe.
4. Usar una composición memorable: fotografía auténtica o ilustración relevante, distribución asimétrica controlada, profundidad y espacios respirables.
5. Elegir entre claro/oscuro según marca, nunca imponer dark mode a todos los tenants.
6. Implementar estados hover/focus/active/loading/empty donde correspondan y navegación por teclado.
7. Revisar 360, 390, 768, 1024 y 1440 px; prevenir cortes y texto superpuesto.

## Calidad visual
- Escala tipográfica clara, line-height legible, ancho de párrafo restringido, grid coherente y espaciado sistemático.
- CTA con verbos específicos: «Cotizar envío», «Solicitar recogida», «Explorar destinos», no botones vagos.
- Evitar carruseles innecesarios, gradientes excesivos, glassmorphism por defecto, sombras indiscriminadas y secciones clonadas.
- Comprobar contraste WCAG AA para texto y foco visible.
- No añadir afirmaciones inventadas ni mockups que parezcan datos en vivo.
- Priorizar Server Components y assets optimizados; aislar Client Components solo para interacción.

## Entregable
Antes/después conceptual, razón de cada sección, componentes/rutas afectadas y checklist de calidad.
