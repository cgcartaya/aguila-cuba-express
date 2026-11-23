---
name: design-system
description: Definir tokens, componentes y variantes de marca para varios tenants sin imponer un tema único.
---
# Design System — Perla

## Arquitectura
Separar tokens globales de estructura (espaciado, radios, escala, foco y motion) de tokens de marca por tenant (surface, text, primary, accent, muted, border, gradients opcionales). Preferir variables CSS / Tailwind v4, sin valores repetidos dispersos.

## Componentes
Reusar y ampliar componentes existentes antes de crear otros. Documentar Button, Section, Container, Card, Badge, Heading, ServiceCard, CTA, Testimonial (solo verificado), FAQs, Nav y Footer. Incluir variantes y estados responsive/focus/disabled/loading.

## Reglas
- No cambiar colores en componentes de un tenant de forma que afecte globalmente a otros.
- No codificar logos, precios, enlaces ni promesas de servicio en componentes compartidos.
- Contraste AA, área táctil suficiente (~44px), soporte ES/EN y textos largos.
- Preferir paleta 1 primaria + 1 acento + neutrales, con modo claro u oscuro elegido por marca.
- Reservar efectos decorativos para identidad del tenant, no forzar el mismo hero a todos.
- Establecer convenciones y ejemplos en el PR; no crear abstracciones antes de tener al menos dos casos reales de uso.

## Revisión de cambio
Documentar qué tokens se añadieron/modificaron, su fallback, y capturas de al menos 2 tenants si el cambio es global.
