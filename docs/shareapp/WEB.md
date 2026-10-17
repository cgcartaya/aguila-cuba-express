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
