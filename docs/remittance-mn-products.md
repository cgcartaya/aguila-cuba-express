# Álvarez: compras visibles, entrega en MN y productos junto a la remesa

## Operación

En toda la administración de Álvarez aparece un aviso de compras de remesas sin revisar. Se consulta cada 30 segundos mientras la pestaña está visible y al volver a ella. Cada administrador tiene su propio registro de vistas. «Marcar como vistas» solo afecta las compras incluidas en la consulta anterior; una compra posterior sigue generando aviso. La primera consulta incluye las compras anteriores no canceladas: pueden marcarse como vistas sin alterar pedidos o pagos. Compras de remesas abre ahora todas las compras, incluidas las ya pagadas.

En Envíos → Nueva operación → Remesa, la agencia puede elegir USD o Moneda nacional (CUP / MN). Para MN debe escribir una tasa manual por operación. Ejemplo: 100 USD × 920 = 92,000 CUP. No se consulta el tipo de cambio automático. La remesa original, la comisión y la facturación se mantienen en USD. La tasa y el efectivo a entregar quedan guardados y se muestran en factura administrativa/pública y portal web del repartidor.

En el mismo formulario puede buscar productos activos de la tienda, añadir hasta veinte productos distintos y sus cantidades. El total incluye principal/comisión según la configuración existente, productos, cargos y descuentos. Los productos se cobran aparte del principal: añadir pollo no reduce los 100 USD enviados. Se guardan nombres y precios como evidencia de esa operación. No se ofrecen componentes exclusivos de combos. La base de datos vuelve a comprobar tienda, precios, cantidades y stock antes de guardar, y no acepta precios cambiados silenciosamente.

El aviso al grupo incluye efectivo a entregar, tasa manual si corresponde y cantidades/nombres de los productos. Se elimina la línea de estado de pago del mensaje; no se altera el estado contable de las compras. Las ediciones no reenvían el aviso automáticamente.

Este cambio incorpora MN y productos en el registro administrativo de Envíos. El checkout público de remesas conserva su flujo actual; sus compras generan la nueva notificación dentro de la administración. El portal web de repartidores muestra los nuevos datos. Una APK Android antigua necesita actualización para interpretar estos campos.

## Inventario y publicación

La creación con estos detalles usa un RPC que conserva numeración y comprobación de acceso y guarda la operación dentro de una transacción. El trigger solo se ejecuta para remesas nuevas/anteriores con CUP o productos; los envíos USD habituales no ejecutan esta lógica. Se bloquean los productos en orden de ID para serializar reservas. Repetir el guardado no vuelve a descontar stock; cancelar o quitar productos restituye sus existencias; restaurar una operación comprueba disponibilidad. Eliminar una entrega ya realizada no repone mercancía entregada. Los precios históricos se conservan.

La migración **no está aplicada en producción**. La revisión automática rechazó su aplicación por modificar inventario y totales de envíos. Se verificó en Postgres local aislado con pruebas de tasa, stock, atomicidad, autorización y cursores. Aplicar en producción requiere autorización explícita y después publicar la aplicación. No desplegar el código antes de la migración.

## Prueba después de publicar

1. Crear una remesa real desde la página: debe aparecer el aviso administrativo, sin necesidad de que el cliente escriba por WhatsApp.
2. Registrar en Envíos una nueva remesa con MN y tasa manual, con los productos deseados. Revisar el total antes de guardar.
3. Verificar factura y mensaje del grupo: efectivo MN correcto, tasa, productos y cantidades; sin línea de pago.
4. Comprobar en el portal web del repartidor la asignación y el detalle de entrega.
5. En un entorno de pruebas, validar que guardar dos veces no descuenta de nuevo y que cancelar devuelve existencias. Nunca usar pedidos ficticios en el grupo de producción.
