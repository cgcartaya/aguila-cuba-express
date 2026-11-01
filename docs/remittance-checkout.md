# Compra de remesas — Álvarez Travel

## Cliente

La tienda muestra la tarjeta **Enviar dinero a Cuba**. El cotizador de la landing tiene **Continuar con mi remesa**, que conserva el importe al abrir `/tienda/remesas?amount=200`. En el dominio central la ruta es `/tienda/alvares-travel/remesas`.

El carrito de remesa es independiente del carrito físico y representa **una operación**, con un campo propio de importe. El cliente completa nombre/teléfono del remitente, nombre/teléfono/dirección/provincia/municipio del destinatario e indicaciones opcionales. Se admiten importes de 0.01 a 100,000 USD con dos decimales. El destinatario recibe el principal y el comprador paga principal + comisión.

La cotización se obtiene del servidor, que lee `shipping_settings`: cargo fijo por debajo de `money_fixed_fee_below`, porcentaje inferior hasta menos de `money_threshold` y porcentaje superior desde ese umbral. No hay un precio de producto que mantener ni se utiliza la cantidad de unidades para representar dólares. El cálculo monetario del checkout usa numeric/round de Postgres. Los pedidos conservan su cotización al crearse; cambios posteriores de tarifas afectan nuevas compras.

## Pago manual en esta primera versión

No hay cobro con Stripe ni Clover. Al confirmar el checkout se crea un pedido **pendiente de pago** y se muestra una referencia privada con el botón de coordinación por WhatsApp de Álvarez. No se afirma que se haya recibido dinero ni se genera una entrega en ese momento.

El enlace de confirmación permite consultar el estado sin iniciar sesión, mediante referencia UUID no enumerable, limitada por agencia. Solo devuelve importes/estado y el rastreo cuando el pago está confirmado; no devuelve datos personales. Debe conservarse privado. La página no se indexa.

## Administración

Abrir **Envíos → Compras de remesas**, desde el dashboard de Álvarez. Se pueden listar pendientes, pagados y cancelados, con paginación. El permiso `shipping.view` permite consultar; `shipping.billing` permite confirmar o cancelar. Se valida sesión activa, membresía de la agencia y permisos en servidor.

Para confirmar, el operador debe verificar el pago fuera del sistema, escribir el importe recibido que coincide con el total e indicar su referencia/comprobante. La confirmación registra el actor y la referencia; crea de forma atómica un envío de dinero sin viaje y su partida de factura, con estado pendiente de entrega, pago completo y saldo cero. Luego se asigna a un repartidor como cualquier remesa. En operaciones existentes el importe principal ya está en Cuba: este proceso no hace transferencias bancarias ni movimientos de caja automáticos.

La factura incluye el principal y la comisión cobrados en la compra. Estos pedidos no usan la tabla orders ni inventario/bonos/comisiones de ecommerce físico. No se aplica la comisión general de tienda sobre el principal de una remesa. No crea recibos de otra pasarela, ni envía correos o mensajes automáticamente.

## Integridad y seguridad

- `remittance_orders` y sus RPC son accesibles únicamente con service_role desde rutas de servidor. RLS está activa, sin acceso de anon/authenticated; no se cambian políticas heredadas.
- La agencia se resuelve por host y, solo en el host central/preview, por slug. El servidor fija Álvarez y no confía en un storeId público.
- La cotización se recalcula al crear el pedido. Si cambió, devuelve 409 y exige volver a revisar/aceptar el total.
- Idempotency key por intento de compra; misma clave y mismo payload recuperan el mismo pedido. Cambiar datos con esa clave se rechaza.
- Confirmación con bloqueo de fila y transacción: un segundo clic o reintento no duplica envíos. Cancelar solo afecta pedidos pendientes.
- Máximo cinco pedidos por teléfono del remitente en una hora, coordinado por bloqueo de transacción. No es una protección global frente a bots que cambien de teléfono; para grandes volúmenes se debe añadir limitación global.
- Cambios aditivos: no alteran envíos registrados ni los flujos de Águila.

## Validación

`node --test tests/remittance-checkout.test.mjs`: validación, agencias, datos económicos manipulados, CSRF, consulta pública mínima y permisos de confirmación.

`tests/remittance-checkout-rollback.sql`: cotización por tramos/límites, centavos, tarifa alterada, idempotencia, principal+comisión pagados, partida de factura, cancelación y permisos de DB. Todo se ejecuta en una transacción con rollback, incluidas tarifas temporales.

`node tests/remittance-checkout-browser.mjs`: carrito/checkout móvil, reintento tras pérdida de respuesta con misma idempotency key, consulta de pago/rastreo y confirmación administrativa. Usa mocks y no crea compras reales. Requiere esbuild, @sparticuz/chromium y Playwright en el entorno de QA indicado por el script.
