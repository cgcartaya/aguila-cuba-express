# Portal web de repartidores

Acceso: `https://DOMINIO-DE-LA-AGENCIA/repartidores?tienda=SLUG`.
Ejemplo: `https://alvarez-travel.com/repartidores?tienda=alvarez-travel`.
En **Envíos → Personal** se puede abrir el portal y copiar el enlace de la tienda seleccionada.

## iPhone

1. Abrir el enlace en Safari, entrar con el usuario y contraseña del repartidor.
2. Compartir → Añadir a pantalla de inicio. Activar «Abrir como app web» si Safari muestra esa opción y pulsar Añadir.
3. Abrir desde el icono. Si Safari separa la sesión de la app instalada, volver a iniciar sesión allí.
4. Actualizar, abrir un envío, consultar dirección/teléfono, tomar foto o elegirla desde Fotos.
5. Confirmar la entrega completa, registrar incidencia o marcar en reparto. Una remesa y paquete en el mismo envío se confirman juntos. «Guardar solo la foto» no cambia el estado.

Cámara, selector de Fotos, llamada, mapas y modo instalado deben comprobarse finalmente en un iPhone físico. Las pruebas de navegador no sustituyen esa comprobación.

## Cuentas y separación entre tiendas

- Tienda activa y módulo de envíos habilitado; no hace falta habilitar una opción distinta por tienda.
- Personal web: rol `DELIVERY`, estado `ACTIVE`, tienda exacta. Cuenta suspendida o en vacaciones no accede. Cambio de contraseña invalida su sesión en la siguiente petición.
- APK original: cuenta `app_users`, rol `DRIVER`, activa. Debe pertenecer a la tienda o, si no tiene tienda explícita, tener un envío no borrado asignado en esa tienda. No se adivina la agencia por el nombre del repartidor.
- Los vínculos `legacy_app_user_id` permiten consultar asignaciones antiguas únicamente cuando `assigned_staff_id` está vacío. Una asignación explícita a otro empleado prevalece. Si la cuenta antigua está vinculada a Personal suspendido, no accede por la contraseña antigua.
- Credenciales heredadas SHA-256 se validan solo en servidor para compatibilidad. No se crea ni cambia ninguna cuenta existente; no se cambia la APK ni el gateway Android.
- Sesión opaca aleatoria de 16 horas en cookie HttpOnly, Secure en producción, SameSite Strict. Base de datos guarda solo hash del token y huella HMAC de la credencial. Logout elimina la sesión. Cada petición vuelve a verificar rol, estado, tienda y contraseña.
- Tablas de sesión y límite de intentos con RLS y sin permisos para anon/authenticated. Límite persistente de 10 intentos por agencia/usuario en 15 minutos, contador atómico y limpieza de registros expirados al entrar.

## Entregas y fotos

El API comprueba tienda, asignación, papelera y `updated_at` tanto al leer como en el UPDATE. Una reasignación o modificación concurrente devuelve 409. No permite reabrir entregados ni operar cancelados. Solo escribe estado, marca/fecha de entrega, `updated_at` y foto; nunca crea operaciones ni altera importes, cobros, comisiones o facturas.

Las fotos se reducen en el navegador y se vuelven a validar y convertir en JPEG en el servidor, quitando metadatos EXIF. Se guardan en el bucket privado existente `delivery-photos`, bajo tienda/envío/UUID. Si el UPDATE falla, se elimina la nueva foto. Las vistas firman enlaces de 10 minutos después de verificar el envío. También admite el formato de la APK original `TRACKING/entrega.jpg` cuando coincide exactamente con el tracking del envío autorizado (índice único global, sin distinción de mayúsculas). Rechaza rutas de otros envíos, URLs externas y segmentos de recorrido de directorios.

Se muestran hasta 50 envíos por página, con «Cargar más». Búsqueda, filtros y totales se aplican a los envíos cargados. Incluye envíos sin viaje. El dinero mostrado es `money_amount` para entregar al destinatario, no una deuda por cobrar.

## Conexión y privacidad

Operación en línea: no hay cola offline ni sincronización en segundo plano. Una entrega solo se anuncia guardada después de la respuesta del servidor. Un fallo de red conserva la foto mientras la pantalla siga abierta. Tras un timeout, actualizar y revisar antes de reintentar: la petición pudo llegar al servidor. Cerrar la pestaña o iOS suspender/eliminar la app puede perder una foto aún sin guardar.

El service worker solo conserva una página pública de «sin conexión». No cachea HTML privado, APIs, envíos ni fotos. No se guardan credenciales/envíos en localStorage o IndexedDB. Analytics, referidos y Meta Pixel excluyen `/repartidores`.

## Verificación

- `node --test tests/driver-portal.test.mjs`: acceso suspendido, cambios de contraseña, CSRF, aislamiento de asignación, conflictos y reasignación, entregados/cancelados, imágenes inválidas, Storage caído, limpieza de foto huérfana y cambios sin tocar finanzas.
- `tests/driver-portal.sql`: ejecutar dentro de su transacción/rollback, comprueba permisos, RLS y contador durable/expiración sin dejar datos.
- `/design-preview/delivery`: solo en deployments preview; datos ficticios y mutaciones simuladas. Devuelve 404 en producción. No sirve para validar autenticación real.
