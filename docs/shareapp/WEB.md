# ShareAPP web · iPhone, Android y computadora

## Uso tras desplegar

Acceso: https://perlamarketplace.com/gestores. También aparece Entrar a ShareAPP en la web de Perla, en el acceso administrativo y en el menú Marketing.

Se mantiene la cuenta y la sesión independiente del administrador. El gestor solo ve sus tiendas habilitadas. Los accesos, invitaciones y contraseñas funcionan como en la entrega anterior.

- Catálogo: productos y combos, búsqueda, disponibilidad, tienda completa y selección para publicar.
- Publicaciones: texto editable, red declarada, enlace personal, guardado en servidor, historial paginado y edición. Se puede copiar o abrir el selector nativo/WhatsApp. Pausar un enlace impide nuevas entradas por ese enlace y conserva su historial.
- Resultados: métricas propias por tienda durante los últimos 30 días y actualización manual.
- Mi cuenta: identidad conectada, tiendas autorizadas, cambio de contraseña, salida de sesión y guía de instalación.

Los textos guardados se comparten entre dispositivos. Un borrador sin guardar permanece al cambiar de sección dentro de la misma sesión de página; se descarta al cambiar de tienda, cerrar el editor, cerrar sesión o recargar. Compartir se habilita después de guardar. La red de referencia se conserva desde la creación para no reasignar retrospectivamente el origen.

Guardar contenido o abrir un selector no confirma una publicación efectiva ni mide impresiones dentro de las redes. La disponibilidad y el precio se confirman en la tienda. No se automatizan publicaciones.

## Instalar en iPhone o iPad

1. Abre /gestores en Safari.
2. Toca Compartir → Añadir a pantalla de inicio.
3. Si aparece Abrir como app web, déjalo activado.
4. Toca Añadir y abre ShareAPP desde su icono.

En Android/escritorio aparece el botón de instalación cuando el navegador lo admite; en los demás casos se muestran instrucciones. HTTPS ya lo proporciona el alojamiento habitual.

Referencias técnicas: https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios y https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope.

## Privacidad y conexión

La aplicación y su service worker están limitados a /gestores. No se cambia la instalación ni el alcance de otras tiendas. Se guardan en caché solo iconos públicos y una página genérica sin conexión. Las peticiones de autenticación, APIs y datos privados no se interceptan ni se almacenan por el worker. La navegación usa red; si falla ofrece una pantalla de reconexión. Catálogo, guardado y resultados necesitan internet.

Se excluyen las rutas /gestores de los contadores de visitas públicas y del inicio de Meta Pixel. No hay notificaciones push ni sincronización de publicaciones sin conexión en esta entrega.

## Base de datos y compatibilidad

La migración de publicaciones añade body y updated_at a shareapp_links y un índice de historial. Ya se aplicó y el nombre del archivo coincide con el historial remoto. Los enlaces y atribuciones anteriores siguen funcionando; los enlaces antiguos sin texto muestran su título y pueden editarse desde la web. La APK anterior sigue siendo compatible con la API.

GET/PATCH /api/shareapp/links exige una membresía activa y filtra siempre por tienda y gestor autenticado. El cliente no puede reasignar el propietario, el código o el destino al editar.

## Validación

- TypeScript, ESLint de cambios y build de producción.
- Pruebas Node/API y SQL aislado, con aislamiento de publicaciones y cobertura del worker.
- Navegador Chromium: login, catálogo, publicación guardada, borrador entre secciones, resultados, cuenta, instrucciones de instalación, dimensiones móviles/escritorio y ausencia de errores JS, usando datos sintéticos y APIs simuladas.
- Registro real del service worker, alcance y página offline. El fallo de red del worker se simula explícitamente, porque la emulación de desconexión del navegador de pruebas no afecta de igual manera a sus peticiones.
- La instalación física en Safari/iPhone debe verificarse tras el despliegue; la prueba automatizada utiliza Chromium.

Para repetir la prueba de navegador, con el servidor local de desarrollo en el puerto 3200 y Playwright disponible:

    SHAREAPP_PLAYWRIGHT_MODULE=/tmp/shareapp-ui/node_modules/playwright node tests/shareapp/browser.cjs

El módulo puede instalarse fuera del proyecto con npm install --prefix /tmp/shareapp-ui --no-package-lock playwright@1.51.1 y su Chromium de pruebas. SHAREAPP_BASE_URL permite elegir otro servidor local y SHAREAPP_SCREENSHOTS permite guardar capturas de los datos sintéticos en un directorio temporal.

## Fotos y vistas previas

La acción principal «Compartir publicación» utiliza title, text y url separados, igual que el botón de la vista del producto. Envía el enlace del gestor /r/[code], que conserva la atribución y proporciona metadatos de foto y precio a los rastreadores. WhatsApp construye la tarjeta; hay que esperar su vista previa antes de publicar. No se adjunta un archivo en esta acción.

«Enviar la foto como archivo (sin tarjeta de enlace)» es una opción secundaria desplegable, con envío de JPEG, descarga y copia. Una foto adjunta es una publicación de imagen; pulsarla no equivale a abrir el producto.

/r/[code] devuelve Open Graph a los rastreadores reconocidos sin cookie de atribución. Los compradores mantienen la redirección y cookie originales. /r/[code]/image valida enlace, gestor, tienda, módulo y producto; no registra visitas. Solo descarga fotos del Storage público del proyecto configurado, sin redirecciones y con límite de 8 MB, 10 segundos y 25 millones de píxeles. Devuelve JPEG de hasta 1200 px, sin caché. No requiere migración.

Las redes deciden si muestran la vista previa y pueden conservar la anterior en caché. Las fotos adjuntas no garantizan un enlace pulsable en estados/historias. Comprobar en WhatsApp real después de desplegar: conversación, estado, foto y texto, y que una compra desde el enlace conserve la atribución.

La ruta de promoción acepta exclusivamente el dominio personalizado guardado y su alias exacto con/sin www cuando el alojamiento normaliza el host. La redirección al producto permanece en el host aceptado para conservar la cookie en checkout. Cualquier otro host se redirige al dominio guardado. Esto evita el bucle apex → www del alojamiento → apex de ShareAPP sin alterar la configuración de dominio de la tienda. No requiere SQL.

## Foto visible y pasos de publicación

El editor muestra la foto del catálogo desde la selección, antes de guardar. En el historial y al reabrir utiliza la imagen del enlace del gestor, que valida el producto y la tienda actuales. Si una imagen falla se indica explícitamente; la vista previa de la herramienta es orientativa, no una reproducción de todas las redes. No se persisten fotos nuevas ni se necesita SQL.

1. Revisa foto y texto, y guarda para preparar el enlace personal.
2. «Compartir publicación» comparte la URL con metadatos de foto/precio. WhatsApp, Facebook u otras aplicaciones deciden cómo presentar esa URL.
3. Para enviar un archivo utiliza «Compartir foto en Instagram, estados o historias». Esta opción se despliega automáticamente al elegir Instagram. Conserva/copia el enlace del gestor en las ubicaciones admitidas por la red.

No se puede garantizar que todas las redes conviertan una URL en una foto ni que una foto adjunta sea pulsable. Abrir el selector o guardar no confirma que se haya publicado. El seguimiento requiere una visita por el enlace personal.

## Metadatos de la ficha y precio público

La vista previa del enlace del gestor utiliza la imagen original del Storage público del proyecto, igual que la ficha del producto, en lugar de imponer el procesamiento JPEG a los rastreadores. Se mantienen el endpoint validado para adjuntar/descargar y el fallback de fuentes no permitidas. Se prioriza la imagen principal de galería igual que en la ficha y se alinean og:type=website, site_name y los campos de Twitter.

Los precios del catálogo de ShareAPP (y por tanto de los textos nuevos) y de sus metadatos utilizan las mismas funciones de precio público y ajuste por tienda que el storefront. No se cambia la configuración ni el precio base en la base de datos. Los textos ya guardados no se reescriben: actualizar manualmente su precio o crear una publicación nueva.

Esto no fuerza el tamaño de tarjeta de WhatsApp: sus estados pueden usar una tarjeta compacta, y las vistas previas anteriores pueden estar cacheadas. Tras desplegar se debe probar un enlace de publicación nuevo; no se cambian códigos de atribución ni destinos.
