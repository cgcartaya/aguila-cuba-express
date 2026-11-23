# Perla UI Skills

Seis skills reutilizables para diseñar, implementar y auditar landings multitenant de Perla Marketplace.

## Activación para ChatGPT y agentes de código
Estas carpetas son **instrucciones versionadas**, no plugins auto-instalados. Para usarlas en ChatGPT, pedir explícitamente leer los `SKILL.md` relevantes desde GitHub al comenzar el trabajo. Un agente con acceso al repositorio puede seguirlas si se le indica. No asumir descubrimiento automático.

## Selector
| Petición | Skill |
|---|---|
| Nueva apariencia, hero o componente | frontend-design |
| Nueva landing o reestructuración de secciones | landing-page-architect |
| Scroll, hover, fondos o microinteracciones | motion-interactions |
| Tokens, consistencia o componentes compartidos | design-system |
| Ajustes móvil/tablet/desktop | responsive-ui-audit |
| Claridad, accesibilidad y conversión | conversion-ux-audit |

## Orden recomendado
1. Leer `AGENTS.md` y los docs locales de Next.js 16 relevantes (`node_modules/next/dist/docs/`) antes de tocar código.
2. Identificar tenant, ruta, fuente del logo, colores de marca y componentes actuales. Nunca inventar servicios, tarifas, testimonios ni reseñas.
3. Ejecutar `landing-page-architect` + `frontend-design`.
4. Aplicar `design-system` y `motion-interactions` cuando aporten valor.
5. Cerrar con `responsive-ui-audit` + `conversion-ux-audit`.
6. Verificar diffs, tipos, lint y build cuando haya entorno disponible; indicar pruebas no ejecutadas.
7. Preparar PR; **no fusionar ni desplegar sin autorización expresa**.

## Restricciones multitenant
- Cambiar lo mínimo necesario y controlar aislamiento entre tenants.
- No alterar checkout, precios, comisiones, RLS ni permisos para mejorar una landing.
- Mantener fuentes de contenido, traducciones, enlaces y configuración por tenant.
- No instalar librerías adicionales si ya existe equivalente (Framer Motion, Tailwind, Lucide).
- Optimizar LCP/CLS/INP; usar imágenes reales o placeholders explícitamente señalados; respetar `prefers-reduced-motion`.
- No copiar código propietario de galerías visuales; usar componentes compatibles con sus licencias.
- Preferir diseños específicos para cada negocio: envíos, turismo, restaurantes y comercio, no plantilla clonada.

## Formato de entrega estándar
**Contexto**: tenant/rutas afectadas; **Concepto**: dirección visual; **Cambios**: archivos y componentes; **Revisión**: breakpoints, accesibilidad, interacción y rendimiento; **Pruebas**: realizadas/pendientes; **Riesgos**: efectos en otros tenants; **Despliegue**: pendiente de autorización.
