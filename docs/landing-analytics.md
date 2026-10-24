# Visitas de la landing de Yoyo

Disponible en **Inicio del administrador** de la tienda `yoyo-envios`, después del encabezado. También aparece como bloque independiente en `/admin/analytics`. La analítica comercial existente y sus períodos permanecen separados.

## Qué cuenta

Reutiliza exclusivamente `analytics_events` con `store_id` de la tienda activa, `event_name = page_view` y `path = /`. No añade rastreadores ni modifica la captura, las tablas o el módulo de marketing.

- **Sesiones de visita**: identificadores de sesión distintos del período.
- **Visualizaciones registradas**: filas de vista de la página principal; el rastreador actual deduplica ciertas recargas y aperturas dentro de una sesión. No es un contador de todas las peticiones HTTP.
- **Navegadores únicos**: identificadores de visitante distintos. No equivale necesariamente a personas; el mismo usuario puede usar varios navegadores o borrar su almacenamiento.
- El gráfico y la tabla muestran estas métricas por día. Las sesiones y navegadores del período se deduplican globalmente y no son la suma de los totales diarios.

Los datos incluyen los accesos internos/pruebas que registre el rastreador y no permiten distinguir dominios de producción/preview, porque no se registra hostname. Bloqueadores o fallos de captura pueden impedir registrar una visita.

## Fechas y acceso

El período por defecto es el **mes calendario actual**, desde las 00:00 locales del día 1 hasta el instante de consulta. Otras opciones: mes pasado completo, 7 días y 30 días (incluido hoy). La zona se obtiene de la configuración de recogidas de la tienda, con respaldo `America/New_York`. Las fechas, agrupaciones y límites respetan horario de verano/invierno.

`GET /api/analytics/landing?storeId=UUID&period=this_month|last_month|7d|30d` requiere JWT válido, perfil activo y membresía activa de la tienda o rol super_admin. Verifica tienda activa y devuelve únicamente agregados, sin identificadores de visitantes o sesiones. Respuestas privadas sin caché. Se carga al abrir/cambiar período/tienda o pulsar Actualizar; sin sondeo recurrente ni lecturas de otros tipos de página.

Consulta paginada y estable por fecha/id con corte fijo de tiempo, sin el límite silencioso de 1,000 registros. Ante más de 50,000 eventos de landing, devuelve un error explícito para acortar el período en vez de mostrar un total parcial. Los errores de consulta se muestran como errores, no como cero.

## Validación

`node --test tests/landing-analytics.test.cjs` cubre límites mensuales/DST, agrupación diaria, deduplicación, ceros/errores, paginación y aislamiento de tiendas. La consulta de referencia en producción para octubre de 2026 (hasta 24/10 12:47 ET) devolvió 84 vistas, 69 sesiones y 44 navegadores. Es una referencia de comprobación, nunca valores fijos en el producto.
