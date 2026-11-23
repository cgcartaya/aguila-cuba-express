---
name: responsive-ui-audit
description: Auditar y corregir UI de landings en móvil, tablet y desktop, incluyendo accesibilidad y calidad visual.
---
# Responsive UI Audit — Perla

## Matriz mínima
Viewport 320, 360, 390, 768, 1024, 1280 y 1440 px. Probar además zoom 200%, texto largo ES/EN, modo oscuro si existe y orientación horizontal.

## Checklist
- Sin scroll horizontal accidental, cortes, overlays tapando navegación o imágenes desbordadas.
- Menú móvil operable con teclado, Escape, foco y lectores de pantalla.
- H1/CTA inicial visibles; hero no ocupa alturas imposibles.
- Tarjetas, formularios, tabulaciones y carruseles funcionan en táctil.
- Tipografía legible, saltos de línea razonables, botones y inputs con target táctil adecuado.
- Imágenes `next/image` con tamaños correctos, alt pertinente y sin CLS.
- Contraste, orden de foco, landmarks, headings y etiquetas de formularios.
- Reduced motion, carga lenta y estados de error; no ocultar contenido esencial.
- Revisar cada tenant afectado, especialmente cuando se cambian estilos compartidos.

## Formato de hallazgos
Registrar **severidad**, **ruta/tenant**, **viewport**, **pasos**, **resultado esperado**, **resultado observado**, **propuesta** y **prueba tras corrección**.
No declarar una revisión visual completa si no se ha ejecutado navegador/captura.
