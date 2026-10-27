# Campañas de póster en ShareAPP

## Para el dueño

En **Marketing → Gestores · ShareAPP → Campañas → Nueva campaña**:

1. Selecciona una foto o póster de hasta 25 MB. El navegador la reduce antes de enviarla y el servidor la valida, limita a 1920 px y guarda como JPEG de hasta 3 MB. Debe ser contenido promocional público.
2. Añade título y texto sugerido. Cada gestor podrá adaptar el texto de su publicación.
3. Elige destino: toda la tienda, un producto o un combo activo de esa misma tienda. La búsqueda muestra hasta 50 coincidencias.
4. Guarda. Los gestores activos de esa tienda verán la campaña en su portal.
5. Abre **Ver resultados** para comparar gestores y publicaciones; **Resultados de campañas** permite comparar campañas y filtrar una de ellas. Cada detalle permite copiar el enlace personal.

Las visitas, pedidos y ventas cubren los últimos 30 días. Publicaciones cuenta todos los enlaces creados, no una confirmación de publicación en redes. Visitas cuenta visitas distintas por enlace; una misma persona puede originar varias visitas y los totales suman enlaces. Pedidos pagados y ventas incluyen solo pagos confirmados, excluyen cancelados y no representan comisiones. Los pedidos eliminados dejan de contribuir por las relaciones existentes de atribución.

Las visualizaciones, impresiones y personas alcanzadas dentro de WhatsApp, Facebook o Instagram no se conocen: estos informes miden visitas y compras atribuibles al enlace. Guardar una publicación o abrir el selector no confirma su envío.

**Pausar** impide crear nuevos enlaces y abrir los de esa campaña, y detiene nueva atribución incluso si el visitante tenía una cookie anterior. Conserva publicaciones y estadísticas históricas. Habilitar vuelve a permitir el uso; las cookies que todavía sean válidas pueden volver a atribuir. Una campaña pausada no elimina el archivo público del póster ni publicaciones ya enviadas. En esta versión título, póster y destino son fijos: crea otra campaña para cambiarlos.

## Para el gestor

1. Entra en `/gestores`, selecciona tienda y abre **Campañas**.
2. Pulsa **Crear mi publicación** en un póster. Revisa el texto, añade tu teléfono si quieres hacerlo público y elige la red de referencia antes de guardar.
3. Guarda para generar tu enlace individual. Cada nueva publicación obtiene un código distinto; editar una guardada conserva su enlace e identidad.
4. **Compartir publicación** envía texto y URL; el destino puede generar una tarjeta con el póster. El tamaño, la vista previa y la posibilidad de abrirla los decide la red.
5. Para enviar una imagen abre **Compartir foto en Instagram, estados o historias**. **Enviar foto adjunta** envía JPEG y texto con el enlace. Algunas redes reciben solo la imagen: copia y pega el texto/enlace en el lugar admitido por la red.
6. **Mis resultados de campañas** muestra únicamente las publicaciones del gestor que inició sesión.

Un archivo de imagen adjunto no convierte sus píxeles en un enlace. Para registrar visitas y pedidos el comprador debe abrir el enlace personal; conservarlo es imprescindible. Las redes pueden mantener tarjetas antiguas en caché.

## Instalación y seguridad

La migración `20261018213344_shareapp_poster_campaigns.sql` es aditiva y debe instalarse **antes** de desplegar el código. Fue aplicada al proyecto existente el 18 de octubre de 2026 y se verificaron tabla, bucket, RPC y permisos. No repetirla manualmente. Los enlaces de producto anteriores conservan códigos y recibos.

El servidor verifica dueño/gestor, tienda, módulo y estado activo. No se aceptan identidades o destinos de campaña del cliente. La relación campaña/enlace está protegida además por una clave foránea compuesta de tienda. El bucket `shareapp-campaigns` contiene solo JPEG optimizado por el servidor; no se conceden cargas a clientes. El archivo original se valida con límite de 25 millones de píxeles, se limita a 1920 px y se convierte a JPEG. Solo se pueden asociar archivos existentes del prefijo de esa tienda.

La tabla y el informe se usan exclusivamente desde las APIs del servidor. RLS está habilitado, sin políticas de cliente, con permisos revocados para `anon`/`authenticated`; solo `service_role` puede acceder. El aviso informativo de Supabase «RLS enabled, no policies» corresponde al bloqueo deliberado de acceso directo, igual que las tablas de atribución existentes. No añadir una política pública para quitarlo. [Referencia del aviso de Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

La agregación devuelve un objeto JSON único para que el límite de filas de PostgREST no recorte totales. El detalle de publicaciones tiene páginas de 20 filas. Los informes y recursos de seguimiento no se cachean.

## Validación

- Pruebas Node/API: permisos, aislamiento, poster/archivo real, destino de campaña, metadatos y campañas pausadas; junto con la suite existente.
- PGlite: migraciones, restricciones de tienda y póster, permisos, totales, pagos/cancelaciones/eliminaciones, paginación superior a 20 enlaces y pausa con historial.
- Chromium con APIs simuladas: subida y creación del dueño, pausa/habilitación, informes, copia de enlace, gestor a publicación personalizada, compartir enlace e imagen, dimensiones 320/390/768/1440 y regresiones del panel existente.
- Compilación de producción, TypeScript y lint de los archivos modificados.

Para repetir: `node --import /ruta/tsx/dist/loader.mjs --test tests/shareapp/*.test.ts`; `SHAREAPP_PGLITE_MODULE=/ruta/@electric-sql/pglite/dist/index.js node tests/shareapp/campaign-schema.mjs`; con el servidor local en 3200, `SHAREAPP_PLAYWRIGHT_MODULE=/ruta/playwright node tests/shareapp/campaign-browser.cjs`.

Tras desplegar probar en un iPhone real con una campaña nueva: tarjeta en conversación/estado, foto adjunta, apertura del enlace en otro navegador y pedido hasta confirmar pago. Chromium no reproduce la interfaz ni decisiones de WhatsApp/iOS.

El kit Kotlin incluye selección de campañas y estadísticas propias. Debe integrarse y compilarse en un proyecto Android con Gradle/SDK; este repositorio no contiene una APK nueva. Su selector nativo comparte texto y URL; el envío de archivo adjunto está disponible en el portal web.
