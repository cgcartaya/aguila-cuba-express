# Square Payments en PerlaMarketplace

Cada tienda autoriza su propia cuenta de Square. Square aloja el checkout y abona el pago al comercio. PerlaMarketplace guarda la referencia de la sesión y del pago, el importe y la moneda. Los datos de la tarjeta se introducen en Square. Las comisiones de PerlaMarketplace siguen el proceso existente de facturación de pedidos.

Square se integra con el checkout de la tienda virtual, incluidos los combos. Envíos, recogidas, remesas y otros cobros mantienen sus rutas actuales. LYM queda fuera del checkout de tarjeta.

## Configuración de Square Developer

1. Crea una aplicación en [Square Developer Console](https://developer.squareup.com/apps) y selecciona Sandbox.
2. Crea o selecciona un vendedor de prueba de Estados Unidos con una ubicación activa habilitada para tarjeta en USD.
3. Registra la URL OAuth exacta. Ejemplo en un entorno de prueba aislado: `https://qa.example.com/api/admin/payment-settings/square/callback`.
4. Configura una suscripción en la aplicación para `payment.created`, `payment.updated`, `refund.created`, `refund.updated` y `oauth.authorization.revoked`. Usa `https://qa.example.com/api/webhooks/square` y copia la clave de firma de esa suscripción.
5. Configura las variables de servidor y aplica las dos migraciones versionadas en orden. El dominio administrativo que abre la autorización debe coincidir con el dominio de la URL OAuth.
6. En **Ajustes → Plataformas de pago**, conecta Square, elige una ubicación y verifica la conexión. Pulsa **Verificar conexión** para cargar la lista de ubicaciones. Para probar cobros, elige Square como pasarela de nuevos pedidos.

| Variable | Uso |
| --- | --- |
| `SQUARE_SANDBOX_APPLICATION_ID` | ID de aplicación Sandbox |
| `SQUARE_SANDBOX_APPLICATION_SECRET` | Secreto OAuth Sandbox |
| `SQUARE_SANDBOX_REDIRECT_URI` | URL HTTPS de retorno OAuth |
| `SQUARE_SANDBOX_WEBHOOK_URL` | URL exacta registrada para la firma |
| `SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY` | Clave de la suscripción Sandbox |
| `SQUARE_ENABLE_SANDBOX_CHECKOUT` | Pon `true` solo con una base de datos y un entorno de pruebas aislados |
| `SQUARE_TOKEN_ENCRYPTION_KEY` | 32 bytes aleatorios representados como 64 caracteres hexadecimales |
| `SQUARE_ENABLE_PRODUCTION` | Habilita la conexión y los cobros Production con `true` |
| `CRON_SECRET` | Autenticación del proceso periódico que concilia enlaces vencidos |

Production utiliza las mismas cinco variables de aplicación, OAuth y webhook con prefijo `SQUARE_PRODUCTION_`. Usa credenciales y claves distintas para cada entorno. Conserva la clave de cifrado mientras existan conexiones activas. La integración fija Square API `2026-09-16`.

Los permisos son `MERCHANT_PROFILE_READ` para el comercio y sus ubicaciones, `ORDERS_READ` y `ORDERS_WRITE` para enlaces y conciliación, y `PAYMENTS_READ` y `PAYMENTS_WRITE` para el checkout y sus eventos. Referencias [OAuth](https://developer.squareup.com/reference/square/oauth-api), [Payment Links](https://developer.squareup.com/reference/square/checkout-api/create-payment-link) y [validación de webhooks](https://developer.squareup.com/docs/webhooks/step3validate).

## Operación

- **Cambiar pasarela.** Solo cambia el proveedor de las órdenes nuevas. Las órdenes que ya tienen uno asignado conservan ese proveedor. Las órdenes históricas con valor vacío siguen usando la regla anterior de la tienda.
- **Revisar un pago.** El regreso desde Square abre el seguimiento del pedido. La liquidación se aplica en una transacción de base de datos tras validar la firma, el comercio, el entorno, la orden de Square, la ubicación, el importe y la moneda. Un importe incorrecto, un pago tardío o un reembolso completado pasa a **Pagos Square por conciliar**. Los reembolsos parciales o totales requieren conciliación administrativa.
- **Pedido abandonado.** Cada enlace nuevo tiene una ventana local de 30 minutos. El proceso periódico solicita cancelar el enlace y consulta la orden de Square. Devuelve la reserva, utilizando los movimientos originales, únicamente al confirmar que la orden se canceló sin un cobro asociado. Los errores transitorios se reintentan en el siguiente ciclo. Si Square reporta una orden completada que sigue pendiente en PerlaMarketplace, el pago queda en revisión hasta recibir la confirmación válida.
- **Desconectar.** Cambia la pasarela activa y concilia cualquier sesión pendiente antes de revocar la autorización. El historial de pagos permanece disponible. Una revocación desde Square elimina la conexión local al recibir el evento firmado.
- **Renovación.** Se renueva el token antes de una operación de Square cuando faltan hasta siete días para su vencimiento. Se usa el token de renovación cifrado y una actualización condicional para evitar sobrescribir otra conexión concurrente.
- **Incidencias.** Confirma que la URL registrada para el webhook coincide exactamente con la variable y revisa los envíos en el panel de Square. Si Square rechaza la autorización, verifica la ubicación y los permisos de la cuenta. Usa los ID de comercio, orden y pago al conciliar, sin incluir tokens ni datos de tarjeta.
- **Sesión en creación.** Si una solicitud a Square falla antes de registrar la respuesta, un nuevo intento del comprador usa la misma clave de idempotencia. Antes de resolver manualmente una sesión atascada, confirma su estado en Square.

## Validación antes de producción

1. Ejecuta `node --test tests/square-payments.test.mjs tests/clover-payments.test.mjs` y `npx tsc --noEmit`.
2. En Sandbox, autoriza dos comercios de prueba independientes. Comprueba la autorización cancelada, tokens próximos a vencer, revocación y cuentas sin ubicación elegible.
3. Prueba compras en ambos comercios con tarjetas de [prueba de Square](https://developer.squareup.com/docs/devtools/sandbox/payments). Incluye éxito, rechazo, abandono y dos intentos simultáneos.
4. Reenvía eventos y comprueba que cada pedido solo se confirma una vez. Valida pagos tardíos, reembolsos, importes y comercio incorrectos, y cambios de proveedor con un enlace vivo.
5. Comprueba que inventario, notificaciones de órdenes y comisiones siguen el flujo de tienda. Completa una compra de prueba en Stripe y otra en Clover.
6. Tras aprobar la prueba integral, configura la aplicación Production y sus webhooks. Valida la autorización del comercio antes de seleccionar Square en una tienda.
