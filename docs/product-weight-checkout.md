# Productos con envío por peso

Disponible para todas las tiendas. En Productos → Nuevo / Editar se guarda el peso de **una unidad empacada** y su unidad (`g`, `lb`, `kg`). El peso vacío conserva la compra habitual, pero bloquea una cotización de envío que quedaría incompleta.

La casilla «No aplicar la comisión porcentual» conserva el precio base y las escalas por cantidad. La comisión fija por orden sigue vigente. Se refleja en catálogo, detalle, carrito, checkout, metadata y ShareApp. Los combos conservan su precio y comisión propios; su peso se suma a partir de sus componentes.

## Checkout

Las agencias con el módulo de envíos y tarifas activas por libra ofrecen «Estos productos son para enviar». El cliente elige servicio, modalidad y destino de las tarifas configuradas en esa agencia. Se requiere destinatario, teléfono y dirección completa. El envío por peso sustituye el delivery local para esa compra.

El servidor consulta nuevamente los productos y cantidades, convierte a libras sin redondear cada artículo y calcula peso real, peso facturable, mínimos, cargo fijo y tarifa por umbral. Aplica el comportamiento especial existente de Álvarez y el cargo aeroportuario de estaciones de energía. No cobra recogida ni seguro opcionales (la mercancía se compra a la propia tienda).

La API de creación de orden vuelve a calcular la cotización, ignora montos/pesos enviados por el navegador y guarda el resultado en `orders.shipping_details`, `delivery_fee` y las notas de la compra. El cargo de tarjeta existente se calcula sobre el total normal de la orden. No se crea automáticamente un envío operativo ni un viaje.

La selección se conserva al volver de agregar productos, separada por tienda, pero la cotización se recalcula con el carrito actual. Los productos con entrega local incluida no eliminan el transporte por peso.

## Datos de Yoyó

El 8 de noviembre de 2026 se importaron 64 pesos del Excel «Copia de Productos_Yoyo.xlsx». Se normalizó «Libras» a `lb`, con coincidencia única por nombre sin espacios exteriores y precio, siempre dentro de Yoyó y excluyendo papelera. Los 17 pesos vacíos no se inventaron. No se modificaron precios, stock ni las exenciones de comisión de ningún producto.

## Validación

`node --test tests/product-shipping.test.mjs tests/catalog-share-metadata.test.mjs tests/checkout-customer.test.mjs`

Prueba conversiones, mínimos, umbrales, componentes de combos, aislamiento de tiendas, productos sin peso, exención porcentual y la API real de creación de órdenes con una base simulada. El esquema se valida en Postgres/PGlite. No emite compras ni notificaciones reales.
