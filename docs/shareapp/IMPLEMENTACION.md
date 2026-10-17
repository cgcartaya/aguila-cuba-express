> Actualización: consulta CUENTAS.md para creación de cuentas, temporales, activación y sesiones independientes. Las notas de cuentas existentes y recuperación pendiente de este documento describen la entrega inicial.

# ShareAPP · Fases 1 y 2

## Entregado

- Gestores independientes de store_users: invitación privada de un solo uso, válida durante 7 días, aceptación con cuenta autenticada y activación/desactivación por tienda.
- Dueño/ADMIN o super_admin administra; un VIEWER no puede invitar gestores.
- Panel `/admin/marketing/gestores` y portal `/gestores`, con catálogo paginado de productos y combos, fotos, búsqueda, disponibilidad, texto editable y selector nativo para compartir.
- API de la misma funcionalidad para el cliente Android incluido en `android/shareapp`.
- Enlaces aleatorios `/r/<code>` por gestor, producto/tienda y red declarada; no se acepta una URL arbitraria de destino del cliente.
- Cookie HttpOnly, Secure, SameSite=Lax con firma HMAC y separación por tienda. Último enlace abierto, 7 días por defecto y plazo configurable entre 1–30 días.
- Redirección previa al dominio canónico de la tienda, de modo que la cookie quede en el host del checkout. Detección básica de agentes de vistas previas, sin acreditar visitas en la redirección.
- Seguimiento de páginas y productos después de cargar la tienda. Deduplicación por entrada y página/producto.
- Atribución del pedido validada por servidor después de las comprobaciones de stock y cupón, antes de responder al checkout.
- Resultados de últimos 30 días, agregados en SQL. Pedidos creados separados de pedidos pagados; ventas pagadas excluyen cancelados, y borrar un pedido elimina su atribución por FK.

## Despliegue

La migración `20261017195043_shareapp_gestores.sql` se validó en una base aislada y se aplicó al proyecto Supabase `aguila-cuba-express` el 17 de octubre de 2026. El módulo queda apagado hasta habilitarlo por tienda. Las APIs y paneles requieren desplegar este PR. Se comprobaron RLS, revocación de permisos directos y función de resultados sin filas de prueba en producción.

No hay nuevas variables obligatorias. Puede configurarse `SHAREAPP_ATTRIBUTION_SECRET` en el servidor. Si se omite, se usa la clave de servicio ya existente como clave HMAC; nunca se envía al cliente. Rotar la clave invalida referencias anteriores. `/api/shareapp/config` devuelve únicamente URL y clave pública que el frontend ya publica.

## API v1

Excepto `config`, `events` y `/r`, todas las rutas requieren `Authorization: Bearer <Supabase access_token>`. Los datos de perfil y permisos se comprueban en cada solicitud.

| Método / ruta | Uso |
| --- | --- |
| GET `/api/shareapp/config` | Configuración pública para autenticación Android |
| GET `/api/shareapp/stores` | Tiendas activas y habilitadas del gestor |
| POST `/api/shareapp/join` | `{code}`: aceptar invitación |
| GET `/api/shareapp/catalog?storeId=…&kind=product&page=0&q=…` | Catálogo de 50 artículos por página; kind admite combo |
| POST `/api/shareapp/links` | `{storeId,kind,itemId,network,title}`; kind admite store/product/combo |
| GET `/api/shareapp/results?storeId=…` | Resultados propios del gestor |
| GET `/api/shareapp/results?storeId=…&scope=store` | Resultados por gestor; solo dueño/ADMIN/super_admin |
| GET/POST/PATCH `/api/shareapp/members` | Listado, invitaciones, estados y configuración; solo dueño/ADMIN/super_admin |
| POST `/api/shareapp/events` | Tráfico de la tienda: mismo origen, cookie firmada y validación de gestor/tienda |

Las tablas tienen RLS y ningún privilegio para anon/authenticated. Solo las APIs del servidor con service_role acceden; no se exponen datos de compradores en resultados. El asesor SQL indica INFO por tablas RLS sin policies, que aquí es deliberado: acceso directo cerrado con grants revocados. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.

## Límites deliberados de estas fases

- Autenticación sobre cuentas existentes. No se envían invitaciones por email ni se crean cuentas automáticamente.
- Android es un kit de integración con Compose, no un proyecto independiente ni una APK verificada. Ver `android/shareapp/LEEME.md`.
- Compartir abre el selector del dispositivo; no confirma que una publicación se envió, ni su audiencia. La red es la declarada al generar el enlace, no una verificación de la plataforma receptora.
- No se miden impresiones dentro de redes sociales. No hay publicaciones automáticas, postales, comisiones ni liquidaciones.
- Las visitas son métricas orientativas, no evidencia antifraude: recargas de páginas deduplicadas, pero abrir repetidamente el enlace puede crear entradas nuevas. El bloqueo de bots es básico.
- La atribución opera en el mismo navegador y host. Cambiar de dispositivo o de dominio, rechazar/borrar cookies o comprar fuera del checkout no enlaza automáticamente la venta. Código manual para ventas por WhatsApp: pendiente.
- Los eventos no incluyen nombres, teléfono, IP o email del comprador. El historial de atribución no se elimina junto con la analítica general a 90 días; definir una política de retención antes de ampliar el uso.
- El último clic se congela al crear el pedido. Desactivar un gestor detiene referencias futuras; las ventas históricas siguen visibles al administrador.
- La fecha de los resultados de ventas es la de atribución/creación del pedido, no la del cobro. Total pagado usa orders.total y no calcula comisiones.
- Si el guardado de atribución falla, se registra el error y el checkout sigue funcionando. La recuperación automática de esas atribuciones es una mejora pendiente.

## Validación reproducible

```bash
npm ci
npx tsc --noEmit
npx eslint lib/shareapp components/shareapp app/api/shareapp app/r app/gestores 'app/admin/(store)/marketing/gestores'
npm install --prefix /tmp/shareapp-qa --no-package-lock @electric-sql/pglite@0.5.10 tsx@4.23.15
node --import /tmp/shareapp-qa/node_modules/tsx/dist/loader.mjs --test tests/shareapp/core.test.ts tests/shareapp/api.test.ts
SHAREAPP_PGLITE_MODULE=/tmp/shareapp-qa/node_modules/@electric-sql/pglite/dist/index.js node tests/shareapp/schema.mjs
```

La suite SQL comprueba migración, separación entre tiendas, denegación CRUD de anon/authenticated, deduplicación, pedidos pendientes/pagados/cancelados y borrados. Las pruebas API comprueban que VIEWER no pueda invitar, que un gestor no lea otra tienda y que no pueda consultar estadísticas de otro gestor alterando el parámetro.

Build web de producción completado con variables de prueba (sin credenciales de producción), incluidas las 167 páginas estáticas. La revisión visual con navegador automatizado quedó bloqueada porque no se pudo descargar Chromium en este entorno. El cliente Android tampoco se compiló aquí por ausencia de SDK/Gradle del proyecto.
