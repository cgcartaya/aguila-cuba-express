# Rutas públicas rápidas

Administración → Recogidas → Rutas → Crear ruta rápida.

- Elegir zona y ciudades; ordenar con flechas; horas opcionales.
- Un grupo puede tener varias ciudades con una misma franja horaria.
- Guardar plantilla reutilizable, borrador o publicar tras revisar.
- Desde un cartel: adjuntar JPG/PNG/WebP, leer y corregir el borrador.
- Sin año explícito, la lectura deja la fecha vacía y solicita revisión.
- La publicación no inventa clientes ni paradas operativas. Las solicitudes
  llegan como nuevas y se revisan/asignan en el módulo existente.
- Se conservan planificación con clientes, gestión de paradas y carteles sociales.
- La landing conserva el mapa decorativo y vuelve a mostrar próximas rutas.
  Solo muestra rutas públicas publicadas/en recorrido, desde el día local de
  la tienda; usa centros de ciudades, nunca coordenadas de clientes.

## Configuración

Aplicar `supabase/migrations/20261024023323_yoyo_quick_route_itineraries.sql`
antes de desplegar. La migración es aditiva; no publica ninguna ruta.

En Vercel configurar `OPENAI_API_KEY` (solo servidor) para activar la lectura.
`PICKUP_ROUTE_VISION_MODEL` es opcional, por defecto `gpt-4.1-mini`.
Sin clave siguen disponibles el editor manual y adjuntar el cartel.
La clave no se guarda ni se muestra en el editor. Las imágenes se envían a
OpenAI únicamente al pulsar Leer; se solicita `store:false`.

La lectura tiene límite de 20 intentos por tienda por 24 horas y reutiliza
resultados para la misma imagen. Los horarios, ciudades y fechas extraídos son
un borrador: no se publica nada hasta revisión y confirmación del negocio.
Los carteles se guardan como archivos públicos promocionales al guardar la ruta.
Las plantillas y el registro de lecturas no admiten acceso directo desde el
navegador: requieren API autenticada y rol de administración de rutas.

## Verificación

`node --test tests/pickup-itinerary.test.mjs tests/pickup-route-api.test.cjs`

`node tests/pickup-quick-browser.cjs` con Next dev en `http://127.0.0.1:3100`,
URL/clave pública de Supabase de prueba y Playwright Chromium instalado.
El test intercepta autenticación/APIs: no publica rutas ni llama a OpenAI.
`PICKUP_TEST_ORIGIN` permite otra URL local; `PICKUP_CHROMIUM_MODULE` permite
un módulo alternativo de Chromium para entornos sin navegador instalado.

## Editar una ruta existente

El detalle de ruta muestra primero el recorrido público por ciudades, incluso
si está En recorrido y todavía no tiene clientes asignados. Se pueden añadir,
quitar, renombrar y ordenar ciudades, y cambiar sus franjas horarias opcionales.
Guardar conserva el estado de la ruta y las recogidas de clientes. La confirmación
se muestra junto al botón; las versiones concurrentes se rechazan sin sobrescribir.
Las rutas completadas/canceladas quedan de solo lectura para este editor.

Los datos del conductor y las recogidas están en un apartado desplegable separado.
La migración `20261024145013_explicit_public_itinerary.sql` distingue un anuncio
vacío intencionadamente de las rutas antiguas basadas en clientes: quitar la
última ciudad no vuelve a introducir ciudades de clientes en la landing.

Prueba de interfaz: `node tests/pickup-route-editor-browser.cjs` con las mismas
variables de prueba y Playwright que el editor rápido. Usa servicios simulados;
no modifica rutas reales ni solicitudes.

## Avance público estimado por horario

La landing calcula el avance en el navegador con la fecha de la ruta y la zona IANA de `pickup_service_settings.timezone` (por defecto `America/New_York`). La API pública incluye esa zona junto a las rutas. No usa la zona horaria del visitante para escoger la parada.

- Antes de empezar muestra la primera parada prevista, sin camión en una ciudad.
- En una franja resalta todas las ciudades que comparten ese horario; no elige arbitrariamente una de ellas.
- Entre franjas anima un camión entre los centros de las ciudades, por un segmento ilustrativo, no por una carretera calculada.
- Después de la última franja indica que finalizó el horario, sin marcar la ruta administrativa como completada ni confirmar recogidas.
- Si falta alguna franja o hay horas inválidas/solapadas, muestra el recorrido neutral con horarios por coordinar. Nunca supone que sigue en la primera ciudad.
- El reloj recalcula cada 15 segundos y al regresar a la pestaña. El camión interpola suavemente entre esos cálculos; `prefers-reduced-motion` desactiva las animaciones. La actualización no reinicia el zoom del usuario.
- Las ciudades sin coordenadas siguen visibles en el listado. No se trazan segmentos ni se coloca un camión saltando sobre ellas.

El mapa y la tarjeta indican «Estimación según horario / No es ubicación GPS». Los checks significan **horario finalizado**, nunca visita confirmada. Los estados administrativos, solicitudes, reservas y notificaciones mantienen su funcionamiento anterior. No necesita GPS, OpenAI, claves nuevas ni migraciones.

Verificación: `node --test tests/pickup-scheduled-progress.test.cjs tests/pickup-itinerary.test.mjs tests/pickup-route-api.test.cjs`.
