# Restaurante asociado dentro de Águila

Primera versión para un restaurante, administrado por el mismo usuario/tienda Águila. No crea otro tenant ni otro administrador.

## Preparación y publicación

1. En **Inicio del administrador de Águila → Restaurante asociado → Configurar restaurante**, guardar nombre, descripción, logo, color, moneda, notas informativas y zonas propias. Se puede subir un logo usando el almacenamiento de imágenes existente. Guardar primero sin publicar.
2. En **Categorías y platos** (`/admin/menu`), crear categorías de tipo Restaurante o General y sus platos. Activarlos y permitir Delivery. No crearlos como productos o combos de la tienda.
3. Definir zonas, tarifas y mínimos del restaurante desde su configuración. No usar Ajustes → Zonas de la tienda para estos pedidos.
4. Confirmar el WhatsApp de Águila en Ajustes generales. Los pedidos del restaurante se coordinan con Águila, no con otro administrador.
5. Activar **Publicar la sección del restaurante** y guardar. El servidor exige nombre, zona, plato activo para delivery y WhatsApp. Mientras esté apagada, no muestra accesos públicos y rechaza nuevos pedidos.

La moneda inicial es USD, editable en preparación; no convierte precios. Queda fijada una vez publicado el restaurante, incluso si posteriormente se despublica, para no mezclar monedas en el menú/pedidos históricos. Las tarifas y los precios deben cargarse en esa moneda. Las notas de horario son informativas: usar **Pausar pedidos** (`/admin/menu/operacion`) para cerrar temporalmente.

## Experiencia pública

- Tarjeta de entrada visible en la tienda y enlace en su menú al publicar.
- `/restaurante/aguila` tiene nombre/logo/color propios, sello «Restaurante asociado · En Águila Express», moneda y aviso permanente de preparación/entrega separadas.
- `/menu/aguila` redirige a esa sección para que no haya un menú alternativo sin la identificación. Otras tiendas conservan sus menús.
- El botón de regreso lleva a `/tienda/aguila`.
- Al entrar/salir no se vacían carritos. La tienda usa `cart-aguila`; el restaurante usa `perla_menu_cart_v1_aguila`. Su icono abre únicamente el pedido de comida.
- El carrito de menú valida su estructura al restaurarse y se asocia a su slug antes de escribir, evitando arrastrar datos al cambiar de tenant. El restaurante reconcilia platos/opciones/precios con su catálogo actual y elimina IDs ajenos o retirados.
- El pedido del restaurante es solo Delivery, con sus propias zonas y mínimos. No permite seleccionar las zonas de la tienda ni usa su configuración por distancia.
- El modal adapta su altura al viewport visual/teclado y mantiene el cuerpo desplazable y las acciones accesibles.

## Pedidos y pagos

Los platos usan `menu_items` y los pedidos `menu_orders`/`menu_order_items`; los productos/compras de tienda continúan en `products`/`combos` y `orders`/`order_items`. Las validaciones y los precios del servidor son independientes: rechazan tipos o IDs de menú en el checkout de tienda y productos de tienda en pedidos del restaurante.

Los pedidos del restaurante se gestionan en **Pedidos del restaurante** (`/admin/menu/ordenes`), con vínculo a los pedidos de tienda. Las notas guardan restaurante/moneda/entrega propia y la zona/tarifa quedan como snapshot. Las zonas del restaurante viven en su configuración; `delivery_zone_id` permanece nulo porque no hace referencia a una zona de tienda.

Primera fase: confirmación por WhatsApp de Águila, con nombre del restaurante, moneda y aviso de delivery independiente. El texto utiliza los precios y opciones canónicos devueltos por el servidor, no precios persistidos del navegador. Se coordina el pago con Águila; no se conecta al checkout ni al Stripe de la tienda. No cambia la comisión, el cargo fijo, los cobros, el inventario de productos ni los pedidos de la tienda. La recepción por email reutiliza la configuración existente cuando corresponde; no se envían mensajes desde la implantación/pruebas.

Si falla la inserción de líneas del menú, no devuelve éxito ni descuenta stock y elimina la cabecera incompleta. La operación de cocina/inventario de menú reutiliza el módulo existente.

## Configuración y seguridad

La migración `20261024185957_aguila_restaurant_section.sql` crea `store_restaurant_sections` (store_id PK, config JSON, currency_locked, updated_at), habilita RLS, revoca acceso directo a public/anon/authenticated y concede CRUD a service_role. Se usa una tabla independiente porque los permisos heredados de store_settings no son adecuados para esta configuración nueva. Sin funciones SECURITY DEFINER ni nuevas políticas públicas.

- Lectura pública: `/api/public/restaurant-section?store=aguila` solo devuelve la configuración publicada de una tienda activa con menú habilitado.
- Administración: `/api/admin/restaurant-section?store_id=UUID` valida JWT con getUser, perfil activo y membresía activa OWNER/ADMIN, o super_admin. Solo soporta la tienda Águila. Los cambios usan updated_at para rechazar sobrescrituras de otra ventana.
- Las tarifas se recalculan desde la configuración del servidor y el cliente envía la moneda esperada para detectar carritos con una moneda anterior.
- El módulo de menú de Águila se habilita para su administración. La sección pública nace desactivada; no se insertan platos, zonas, pedidos ni datos de restaurante ficticios.

Migración aplicada en Supabase con la versión anterior. Verificado: RLS activo; SELECT/UPDATE anónimos y UPDATE autenticado denegados; configuración no publicada; cero platos/pedidos de restaurante al preparar esta fase. El aviso INFO de RLS sin políticas de esta tabla es intencional: solo la API del servidor accede, tras autorizar al usuario. Los avisos de otros objetos existentes no se modifican en este cambio.

## Verificación

- `node --test tests/restaurant-section.test.cjs`: configuración, permisos, publicación, moneda, carritos mezclados/IDs disfrazados, precios y opciones canónicos, zonas independientes, reversión de cabecera fallida y menús de otras tiendas.
- `RESTAURANT_CHROMIUM_MODULE=/ruta/a/chromium/build/index.js node tests/restaurant-browser.cjs` (o Chromium instalado por Playwright sin variable). Levanta Next en 3105 y un servidor Supabase desechable en 54329. Usa rutas SSR y API reales, sin escribir a producción ni enviar WhatsApp/email. Comprueba entrada desde tienda, vuelta conservando carritos, recarga, pedido, precio/tarifa, mensaje generado, administración, borrador oculto y vista móvil de 390px, altura reducida de 480px y escritorio de 1440px.
- TypeScript, ESLint sobre los archivos afectados y compilación Vercel.
