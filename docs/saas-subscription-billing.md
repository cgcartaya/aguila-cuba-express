# Gestión de tiendas y facturación de suscripciones SaaS

## Alcance

La vista `/admin/stores` sustituye exclusivamente el contenido central: cuatro indicadores reales, búsqueda por tienda/dominio/subdominio/propietario, filtros, ordenación, tabla en escritorio y tarjetas en móvil/tablet. Conserva los formularios de edición, módulos y usuarios administrativos existentes y los controles de Economía y visibilidad en Perla. No modifica layouts, sidebar, permisos de tenants, órdenes, envíos, remesas, inventario ni comisiones.

La ruta `/admin/stores/billing` permite emitir facturas pendientes o guardar borradores, emitir el borrador, consultar historial, descargar/ver PDF carta, registrar abonos o pagos completos, anular facturas sin pagos y preparar mensajes de WhatsApp editables. El precio inicial se toma de `stores.monthly_price`; los importes y datos de emisor/cliente se congelan al emitir. Los borradores guardados pueden emitirse; para corregir una factura emitida sin pagos se anula y se crea otra. Una factura con pagos requiere conciliación y no se puede anular.

Los indicadores globales distinguen mensualidad configurada, facturado por fecha de emisión del mes de Miami, cobrado por fecha real de pago del mes y saldos pendientes/vencidos de todos los períodos. Excluyen borradores y anuladas. La vista de tiendas prioriza el saldo real de las nuevas facturas sobre el estado de pago legado; sin facturas utiliza la configuración existente.

## Archivos

- `app/admin/(saas)/stores/page.tsx`: entrada de gestión de tiendas.
- `components/admin/saas/StoreManagement.tsx`: indicadores, búsqueda, filtros, tabla/tarjetas y acciones de ciclo de vida.
- `app/admin/(saas)/stores/billing/page.tsx` y `components/admin/saas/SubscriptionBilling.tsx`: facturación, historial, pagos, emisor y WhatsApp.
- `components/admin/saas/BillingDialog.tsx`: diálogo modal nativo, con foco y Escape.
- `lib/saas-billing/{model,client,server,pdf}.ts`: validación, cliente autenticado, autorización y PDF.
- `app/api/saas/subscriptions/route.ts`: lecturas y comandos exclusivos de administradores SaaS activos.
- `app/api/saas/subscriptions/share/[token]/route.ts`: PDF individual por enlace de posesión seguro.
- `supabase/migrations/20261117190000_saas_subscription_billing.sql`: persistencia, restricciones, transacciones y auditoría.
- `tests/saas-subscriptions.test.mjs`: validaciones, API, PDF y ejecución real de SQL en PGlite aislado.

## Estructura y seguridad

Se inspeccionó el esquema real de Supabase mediante consultas de solo lectura: `profiles.id/role/active`, `stores.id/is_active/monthly_price/payment_status` y sus fechas de pago son compatibles. Se revisaron las relaciones de tiendas: hay numerosas referencias de productos, órdenes, envíos, usuarios y otros módulos, incluidas relaciones con borrado en cascada. Esta implementación no ejecuta `DELETE` sobre tiendas ni modifica las políticas de esas tablas.

La migración añade siete tablas privadas: `saas_billing_settings`, `saas_store_lifecycle`, `saas_invoice_counters`, `saas_subscription_invoices`, `saas_subscription_payments`, `saas_billing_events` y `saas_invoice_links`. RLS está habilitado y no se otorga acceso a `anon` ni `authenticated`. La API verifica el token contra Auth y exige perfil `super_admin` activo; la función transaccional vuelve a comprobar el actor. Solo `service_role` puede ejecutar esa función.

La numeración anual usa un contador atómico con `INSERT ... ON CONFLICT DO UPDATE`, dentro de la misma transacción de emisión. Cada factura y pago tiene clave de idempotencia; los pagos bloquean la factura antes de calcular el saldo, rechazan sobrepagos y referencias repetidas no vacías para una misma factura/método. El registro conserva el actor y los eventos. Los importes emitidos no pueden editarse ni eliminarse. No hay cascadas contables.

Al liquidar una factura se actualiza la última fecha de pago sin retroceder y, si no hay otras facturas pendientes, el estado de pago legado. No se activa la tienda ni se modifica el próximo vencimiento automáticamente: esas decisiones continúan en el editor actual.

## Archivado y restauración

«Eliminar / archivar tienda» exige escribir el nombre exacto y ofrece exportar configuración y facturas SaaS en JSON. El JSON es un respaldo parcial claramente identificado; no pretende exportar el inventario ni todos los datos operativos. El archivado conserva íntegramente los registros operativos y contables en la base de datos, desactiva el acceso existente mediante `is_active=false` y permite restauración.

Un guard de base de datos impide activar accidentalmente una tienda archivada/suspendida desde el editor. Restaurar recupera el estado activo previo al archivado; una tienda que ya estaba desactivada continúa desactivada. Reactivar es una decisión explícita separada. Las acciones no modifican otras tiendas.

## PDF y WhatsApp

Reutiliza `jspdf`, ya instalado, y el logo público original `/perla/perla-shell.png`. El PDF usa carta (612 × 792 pt), importes USD y campos de emisor configurables sin datos fiscales inventados. La información larga puede continuar en otra página carta sin salir de los márgenes.

Los enlaces usan 32 bytes aleatorios: solo se almacena el hash SHA-256, caducan en 30 días y pueden revocarse por factura. Anular revoca sus enlaces. Una persona que posee el enlace puede ver únicamente ese PDF; no puede consultar el historial ni referencias de pagos. Las respuestas son `private, no-store`, `no-referrer`, `noindex` y `nosniff`. No se inserta el token en la URL administrativa ni en analítica propia.

Se valida el prefijo internacional antes de preparar el mensaje; se puede corregir el destinatario y editar el texto antes de abrir WhatsApp. Se registran `whatsapp_prepared` y `whatsapp_open_requested`, nunca «enviada». No se usa API de pago ni se programan recordatorios o mensajes desatendidos. Los recordatorios vencidos incluyen saldo y vencimiento original.

`SAAS_BILLING_PUBLIC_ORIGIN` es opcional y por defecto utiliza `https://perlamarketplace.com`. En un entorno de prueba debe apuntar al origen de prueba para que sus enlaces lleguen a ese entorno. Conserva las variables existentes de Supabase; no añade credenciales al cliente.

## Validación

- `node --test tests/saas-subscriptions.test.mjs tests/shipping-platform-billing.test.mjs`: 12 pruebas; emisión, reintentos, numeración, abonos, sobrepago, importes históricos, anulación, aislamiento, archivado/restauración, roles, validación monetaria/fechas/teléfono, búsquedas, totales, enlaces y PDF; incluye regresiones del módulo de comisiones de envíos.
- `npx tsc --noEmit`: comprobación de tipos.
- `npm run build`: compilación de producción usando credenciales ficticias de Supabase; no prueba conectividad autenticada ni modifica datos reales.
- `git diff --check`: espacios y errores de parche.
- Renderizado local del PDF con un total de $40 y abono de $10: logo, campos y saldo de $30 visibles en una hoja carta.

La revisión visual interactiva en PC, tablet y móvil no pudo ejecutarse: `sites-preview start` añade `--host` y `--strictPort`, opciones que `next dev` no admite. Se retiró el harness temporal; no hay puertas de acceso de prueba en el PR. Los flujos que requieren una sesión SaaS real y las aperturas de WhatsApp quedan pendientes de prueba en un entorno de staging con la migración aplicada. La estructura responsive y filtros se verifican en código y con pruebas de lógica; no se declara validación visual completa.

## Revisión antes de producción

No se aplicó esta migración a producción, no se fusionó ni se desplegó a producción. Antes de habilitar estas pantallas es necesario aplicar la migración aprobada al entorno correspondiente; sin ella la vista muestra un error explícito y permite reintentar. Verificar en staging el logo del PDF, los datos reales del emisor, las fechas de renovación y la apertura de WhatsApp con una cuenta de prueba. No generar facturas o pagos de prueba sobre clientes reales.
