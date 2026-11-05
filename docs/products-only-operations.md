# Álvarez: operaciones solo de productos

En Envíos → Nueva operación, seleccionar **Solo productos de la tienda**. Añadir al menos un producto, indicar cliente/destinatario y asignar un repartidor si corresponde. No se requiere monto de dinero, peso, tipo de paquete ni viaje.

Se conserva una única factura y una única orden de tienda vinculada, con los precios y la comisión existentes. La reserva y devolución de inventario siguen siendo responsabilidad del envío, sin descontar stock otra vez al crear la orden. La facturación por uso del módulo de Envíos mantiene la configuración vigente de la agencia; no se inventa una remesa ni una comisión por envío de dinero para este caso.

Internamente son mercancías físicas (`contains_package=true`, `contains_money=false`, `products_only=true`), con peso y subtotal por peso en cero y sin viaje. El monto, comisión y total de dinero se guardan en cero incluso si el formulario tenía datos de una remesa anterior. La operación no admite quedar sin productos: se cancela desde la papelera del envío. Cancelar/restaurar conserva la misma orden y evita duplicar existencias o comisión.

Los productos aparecen en ambas facturas y en el detalle del repartidor aunque no haya dinero. En la lista de envíos se identifican como entrega de productos sin viaje.

WhatsApp recibe un único aviso de **Nuevo envío de productos**, con productos y cantidades. No incluye una remesa ficticia de cero dólares. En remesas en MN o mixtas se conserva el efectivo a entregar y la tasa manual, pero se elimina la frase «Origen … USD» del mensaje para el grupo. El importe original sigue guardado para la contabilidad y la factura.

La migración `20261105172653_products_only_shipping_operations.sql` se aplica antes de desplegar. No contiene carga histórica ni reenvía avisos antiguos. Las pruebas usan Postgres aislado y un proveedor WhatsApp simulado, sin enviar pedidos ficticios al grupo.
