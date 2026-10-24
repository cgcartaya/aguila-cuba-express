# Catálogo de Carolina del Sur

La dependencia country-state-city 3.2.1 solo devolvía 283 nombres para US/SC,
incluyendo 46 condados. Faltaban Okatie, Aynor, Pawleys Island, Longs,
Johns Island y muchas otras localidades válidas para las recogidas.

El catálogo compartido conserva los nombres y coordenadas existentes válidos,
excluye los condados de las opciones de ciudades de SC y añade datos de:

- U.S. Census Bureau, Gazetteer Places 2026, South Carolina: 475 registros.
  https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2026_Gazetteer/2026_gaz_place_45.txt
- USGS GNIS / The National Map (consultado el 24 de octubre de 2026):
  Okatie (1231612), Longs (1246465), Pritchardville (1225679),
  Cherry Grove Beach (1227843), Johns Island (1223593),
  Wadmalaw Island (1231886), Saint Helena Island (1250512).
  https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer

Se utilizan los registros Populated Place de GNIS para las comunidades, y el
punto representativo de la isla Saint Helena, que no figura como Census Place.
Los puntos sirven para representar localidades en el mapa, no direcciones de
clientes ni puntos exactos de recogida. Los datos de ambas fuentes son públicos.

La unión tiene 490 nombres únicos (253 añadidos y 46 condados retirados).
Se conservan algunas grafías anteriores, como Saint George o Hilton Head,
para que las selecciones existentes sigan siendo compatibles. No se afirma
que el catálogo contenga todos los barrios o nombres postales de SC.

El mismo getCityOptions alimenta configuración de cobertura, solicitudes,
paradas manuales, editor rápido, editor de rutas existentes y mapa público.
Las demás regiones conservan sus resultados anteriores. Las zonas y ciudades
seleccionadas por cada tienda no se modifican ni se amplían automáticamente.
Se renueva la clave de caché de pickup-config para evitar servir la lista vieja.

Los datos están incluidos en el repositorio: la web no consulta Census o USGS
en cada visita, ni requiere una clave o una API de pago para estas localidades.
Para actualizar: node scripts/update-sc-localities.mjs. Revisar siempre el diff.
Pruebas: node --test tests/sc-localities.test.cjs tests/pickup-itinerary.test.mjs tests/pickup-route-api.test.cjs
