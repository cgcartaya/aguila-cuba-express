# Catálogo, solicitudes y ventas de LYM

Este flujo se selecciona exclusivamente por `stores.slug = 'lym'`. La revisión de producción del 17 de noviembre de 2026 encontró 77 productos activos, 19 categorías activas, una propietaria activa y cero órdenes. No se modificaron datos de producción durante el desarrollo.

## Operación

- El checkout conserva el carrito y solicita comprador, teléfono, destinatario, teléfono, dirección, lugar/referencia y notas. Email y pago en línea no son obligatorios. El recordatorio automático de órdenes sin pagar excluye LYM. Envía una solicitud, no una venta ni una reserva. Los precios se leen en PostgreSQL, incluidas escalas por cantidad; los precios enviados por el navegador se ignoran.
- La solicitud muestra el total de productos. El importe de entrega se revisa con la tienda y puede ajustarse desde la orden antes de confirmar. La pantalla y el mensaje de WhatsApp explican que está pendiente de confirmación.
- En **Órdenes y ventas de LYM**, la propietaria y el rol `LYM_SALES` pueden crear órdenes manuales, buscar productos, ver existencias, modificar cantidades y precios por línea, registrar entrega y elegir **Venta de**. Guardar deja la orden pendiente.
- **Confirmar venta y descontar inventario** valida las existencias actuales, congela el contenido de los combos y descuenta los productos una vez. Devuelve la lista de productos insuficientes sin efectuar un descuento parcial.
- Las órdenes confirmadas quedan bloqueadas para edición. Para corregirlas, se realiza una cancelación/devolución completa con motivo, se reabre como solicitud y se edita antes de una nueva confirmación. No se implementan devoluciones parciales.
- Cancelar o enviar a papelera devuelve exclusivamente las cantidades del descuento registrado. Una solicitud pendiente no devuelve nada. Reabrir desde cancelación/papelera no descuenta: requiere una confirmación explícita posterior. No hay borrado definitivo desde este panel.
- El comprobante muestra estado, comprador, destinatario, dirección, líneas, precios, entrega, total y trazabilidad. Se imprime de forma aislada, en papel carta, con paginación natural y encabezados repetidos si ocupa varias hojas.

## Inventario y consistencia

Las RPC `lym_save_order`, `lym_web_request`, `lym_order_action` y `lym_adjust_stock` solo permiten ejecución con `service_role`. El servidor verifica la sesión con `auth.getUser`; la base de datos vuelve a comprobar el actor, su perfil activo, pertenencia/rol y el slug de la tienda. No se acepta el actor enviado por el navegador.

La confirmación bloquea la orden (`FOR UPDATE`) y los productos en orden estable. La validación, el descuento, el registro de cantidades en `lym_order_stock`, los movimientos, el estado, la fecha y el actor se escriben en una transacción. Una confirmación repetida devuelve éxito sin repetir el descuento. La edición usa `lym_version` para rechazar datos obsoletos. Las creaciones tienen una clave de idempotencia por intento; la creación web y su atribución de ShareAPP forman una sola transacción.

La devolución usa `lym_order_stock`, no el contenido actual de los combos. Un trigger registra cada cambio de existencias de LYM, incluidas existencias iniciales y cambios desde formularios, con usuario, fecha, motivo, valores anterior/nuevo y orden cuando corresponde. El historial no permite actualización ni eliminación. Los ajustes del panel verifican el stock esperado para impedir sobrescrituras de una venta concurrente. La edición de productos existente ya omite el stock; se corrigió para LYM la carga de productos con cero existencias.

La tarifa fija existente de la plataforma ($0.30, asumida por la tienda) se registra al confirmar, no al recibir una solicitud; se revierte al cancelar. No se suma al importe del comprador. LYM tiene actualmente deshabilitado el porcentaje adicional sobre productos.

## Personas, ShareAPP y reportes

`lym_seller_key` distingue `member:<id de gestor>` de `user:<id de propietaria/trabajadora>`. Se conserva un nombre para el historial. `lym_created_by` y `lym_confirmed_by` son independientes. Los enlaces/campañas existentes conservan su atribución mediante el recibo firmado de ShareAPP; los gestores siguen usando su módulo y no obtienen permisos administrativos por ser responsables comerciales. Las órdenes manuales también pueden atribuirse a ellos.

El panel mensual, reservado a propietaria/administradora y superadministrador, agrega en PostgreSQL, sin depender de las 30 órdenes paginadas en pantalla. Usa `America/Havana`, fecha real de confirmación, unidades reales de productos (expandiendo combos), total general y por responsable. Las pendientes se muestran por su fecha de creación. Cancelar una venta la excluye del mes original; la devolución queda en el historial. Reconfirmar la ubica en el nuevo mes de confirmación. Se pueden seleccionar meses anteriores y filtrar responsable y estado. El detalle identifica origen web/manual. Las órdenes activas y la papelera tienen paginación separada del reporte mensual.

ShareAPP mantiene sus campañas, cuentas, enlaces y respuesta compatible, pero sus resultados de LYM cuentan confirmaciones, incluidas órdenes manuales atribuidas a gestores. El reporte de campañas conserva el enlace/campaña original y deja de contar la venta si se reasigna a otra persona. Las demás tiendas conservan la definición de pedidos pagados.

## Acceso de la trabajadora

Se añade `LYM_SALES`, asignable únicamente a LYM desde la administración SaaS existente. No puede combinarse con pertenencias activas a otras tiendas. Su navegación se limita a órdenes, productos, inventario y su cuenta. No tiene reportes de propietaria, configuración, usuarios, envíos, campañas ni permisos administrativos por su atribución comercial.

Las políticas restrictivas de todas las tablas públicas con RLS, las políticas específicas del catálogo, las políticas de imágenes y los triggers de órdenes bloquean accesos directos fuera del alcance. Los helpers heredados `has_store_access` y `user_has_store_access` excluyen el nuevo rol para impedir que invoque funciones privilegiadas de envíos. La autorización de roles anteriores se conserva. Middleware consulta `lym_api_limited` con el JWT validado en PostgreSQL para impedir que la trabajadora use APIs heredadas que solo comprueban pertenencia a una tienda. El endpoint de LYM realiza sus propias comprobaciones completas.

Para crear la cuenta real faltan **nombre y correo de la trabajadora**. La contraseña inicial puede generarse en la pantalla de usuarios existente; no se creó ninguna cuenta ficticia.

## Órdenes anteriores y despliegue

La migración no mueve stock. Las órdenes previas de LYM se marcan `legacy`, sin inventar una fecha o un usuario de confirmación. Si existieran, la propietaria debe revisar el registro real y conciliar **Ya se descontó el inventario** o **No hay inventario descontado**, con motivo obligatorio. La conciliación no mueve existencias y conserva un evento de auditoría. Las históricas con descuento reconocido pueden cancelarse usando la cantidad conciliada; se excluyen de ventas mensuales mientras no tengan una fecha fiable. Las inserciones del código antiguo entre migración y despliegue también se marcan históricas automáticamente.

1. Revisar y aprobar el PR. No se ha fusionado ni publicado.
2. Aplicar `supabase/migrations/20261117162645_lym_catalog_sales.sql` en el proyecto indicado **antes** de desplegar el código. Contiene tanto el esquema como la función consultada por middleware.
3. Desplegar el commit aprobado. El checkout, panel y demás tiendas deben usar la misma versión de código y esquema.
4. Crear la cuenta real con rol `LYM_SALES`, verificar acceso y efectuar una prueba controlada de solicitud, confirmación, comprobante y devolución.

No se aplicó la migración en producción ni se ejecutaron ventas reales.

## Verificación reproducible

```sh
node --test tests/lym-sales.test.mjs tests/lym-api-ui.test.mjs tests/shipping-assignment-only.test.mjs tests/checkout-customer.test.mjs
npx tsc --noEmit
npm run build
```

Los tests SQL ejecutan la migración sobre un esquema de prueba con PGlite: precios confiables, solicitudes web/manuales sin descuento, reintentos, competencia por últimas unidades, faltantes múltiples, rollback al fallar la auditoría, devoluciones exactas con cambios de combos, papelera/restauración, conciliación histórica, atribución, reportes por confirmación, RLS, permisos de RPC y compatibilidad de otras tiendas. Los tests API/renderizado verifican sesiones, actor no falsificable, límite de APIs, formulario, estado del comprobante, aislamiento de impresión carta y visibilidad del reporte.

También se ejecutaron las 16 pruebas SQL sobre PostgreSQL 18.6 local desechable, con conexiones independientes para las acciones: pasaron la confirmación simultánea de una misma orden y la competencia real entre órdenes por la última unidad. El modo predeterminado usa PGlite y serializa las llamadas. Para repetir la prueba nativa, preparar una base local vacía cuyo nombre empiece por `lym_test` y ejecutar:

```sh
LYM_TEST_PG_URL=postgresql://postgres:password@127.0.0.1:5432/lym_test_sales LYM_TEST_PG_MODULE=/ruta/absoluta/a/pg/lib/index.js node --test tests/lym-sales.test.mjs
```

No usar una base con datos: la prueba crea roles y tablas de prueba. El adaptador rechaza servidores distintos de localhost y nombres ajenos a `lym_test`.

La suite adicional de ShareAPP tuvo dos fallos de expectativas de precio (13.32 frente a 13.33 USD), reproducidos idénticamente en `main` (`681f6dd`): `catalog prices match the storefront with fee enabled and disabled` y `social preview uses the original photo, storefront price and matching card metadata`. No se modificó ese cálculo ajeno a LYM. La compilación usa variables de entorno ficticias de build; no constituye una prueba autenticada contra producción. La comprobación física de impresión y la prueba con la cuenta real quedan para la activación.

## Menú habitual y ventas dentro de Gestores

Los roles `LYM_SALES`, `ASSIGNER` y `SHIPPING_CATALOG` usan la misma estructura administrativa que la propietaria: menú lateral, cabecera, menú móvil y barra inferior. La navegación se filtra según sus rutas ya autorizadas; no se sustituyen las políticas RLS ni se amplían permisos. El botón de agregar producto, los accesos rápidos y las consultas de contadores también respetan el filtro. Los permisos existentes de envíos y sus excepciones se reutilizan para sus enlaces.

La administradora de LYM puede entrar en **Marketing → Gestores · ShareAPP → Ventas por persona**. Esta pestaña muestra gestores, jefa y personal de tienda física, incluidas personas con cero ventas y responsables históricos o inactivos. Permite elegir mes/año, buscar o seleccionar persona y consultar ventas confirmadas, unidades, importe y pendientes. El detalle distingue origen web/manual y permite abrir la orden administrativa correspondiente. No se atribuye una venta a quien la procesó si «Venta de» identifica a otra persona.

La consulta `GET /api/admin/lym?view=sales` reutiliza `lym_monthly_report`, comprueba en el servidor que el actor sea propietario/administrador de LYM o superadministrador y devuelve solo el reporte y las personas. No descarga el catálogo ni las órdenes operativas con datos de compradores. La trabajadora y los gestores no reciben por esta vista permisos para consultar el reporte general. Las otras tiendas conservan las pestañas existentes de ShareAPP. No se requieren nuevas migraciones para esta actualización.

Pruebas adicionales:

```sh
node --test tests/lym-navigation-sales.test.mjs tests/admin-nav-accordion.test.mjs tests/lym-api-ui.test.mjs tests/lym-sales.test.mjs tests/shipping-assignment-only.test.mjs
```

El reporte también tiene un acceso directo en la sección **Tienda** del menú: **Ventas del mes** aparece inmediatamente debajo de **Órdenes** en el menú lateral de PC y en el menú lateral móvil de LYM. Abre `/admin/sales`, una página propia que reutiliza el mismo reporte protegido. Solo se muestra a propietaria/administradora de LYM y superadministradores con LYM seleccionada; no añade permisos ni consultas para otras tiendas.
