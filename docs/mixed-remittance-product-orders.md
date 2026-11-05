# Álvarez: entrega mixta y orden vinculada de productos

## Entrega de dinero

En Envíos → Remesa, «Mixta: efectivo USD + moneda nacional» permite indicar cuántos USD del principal se convierten a MN y una tasa manual. El resto se entrega en efectivo USD. Ejemplo: principal 100 USD, convertir 50 USD a 920 CUP/USD → entregar 50 USD + 46,000 CUP. Las comisiones y los productos no reducen el principal a entregar.

La parte a convertir debe ser mayor que cero y menor que el principal. Para convertir todo se elige CUP/MN, y para entregar todo en dólares se elige USD. El desglose se guarda y aparece en el formulario, las facturas, WhatsApp y el portal web del repartidor. Los resúmenes del repartidor suman USD y CUP por separado.

## Venta y comisión

Al añadir productos se crea una única orden de tienda vinculada a la remesa (`orders.source_shipment_id`, único). Sus líneas contienen nombre, cantidad, precio base, precio cobrado y comisión. El precio se calcula con la misma configuración y redondeo que la tienda: base más porcentaje de plataforma. Los precios y porcentajes quedan guardados por línea y no se recalculan al cambiar el estado de entrega.

En Álvarez, con la configuración actual de 2.5% y el fijo habitual de 0.30 USD, un producto base 100 USD se factura a 102.50 USD y registra 2.80 USD de comisión de plataforma. El fijo lo asume la tienda, no se añade a la factura del cliente. El principal y la comisión de la remesa no entran en el total de esa orden de productos ni en su comisión por venta. Una remesa sin productos no crea una venta de tienda.

La factura de Envíos incluye la remesa y los productos una sola vez. La orden de tienda es el registro de la venta, no otra solicitud de cobro. Los descuentos generales se asignan primero a la parte de productos, hasta su subtotal, para que la suma coincida con la factura. Como en el checkout normal, el descuento no altera la comisión de plataforma registrada antes del descuento.

La orden aparece en Órdenes y alimenta las métricas y liquidaciones existentes del SaaS a través de `platform_fee_amount`. Registra comisión pendiente; no transfiere fondos ni ejecuta un pago al dueño del SaaS.

## Una operación, un inventario y un cobro

La remesa sigue siendo responsable del inventario. Crear la orden vinculada no vuelve a reservar mercancía. Guardar varias veces mantiene el mismo ID de orden y una sola comisión fija. Cambiar cantidades actualiza esa orden. Retirar productos o enviar una remesa no entregada a la papelera devuelve existencias y pone a cero la venta/comisión asociada; restaurarla vuelve a validar existencias y reactiva la misma venta. Eliminar definitivamente una operación entregada conserva su venta y comisión, y no devuelve mercancía entregada.

Las órdenes vinculadas y sus líneas no se modifican directamente: se gestionan desde Envíos. La interfaz muestra el vínculo, y la base de datos bloquea cambios independientes. El checkout adicional por tarjeta se rechaza y los recordatorios automáticos de órdenes excluyen estos registros para evitar solicitar un segundo pago. Una factura completamente pagada marca también como pagada la orden de productos; con saldo pendiente no presupone que los productos se hayan pagado.

No hay carga histórica. Cambiar solamente el estado de una remesa antigua no crea una venta ni recalcula sus precios. Los campos nuevos son para el registro administrativo; el checkout público de remesas mantiene su flujo actual. El portal web de repartidores interpreta el desglose; una APK antigua requiere actualización.

## Publicación y comprobación

Aplicar `20261105165935_mixed_remittance_product_orders.sql` antes de desplegar. Esta migración aún no se ha aplicado en producción durante la implementación. No contiene carga retroactiva ni ejecuta pagos o envíos a WhatsApp.

Después de publicar, registrar una operación real con 100 USD, 50 a convertir y tasa 920, añadir los productos y revisar el total. Comprobar 50 USD + 46,000 CUP en factura y WhatsApp, una orden vinculada en Órdenes y su comisión en las métricas del SaaS. Verificar con una prueba aislada que guardar dos veces, cambiar cantidades y restaurar la papelera no duplique existencias, órdenes ni comisiones.
