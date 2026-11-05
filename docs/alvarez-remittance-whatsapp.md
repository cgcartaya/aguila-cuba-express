# Avisos de remesas de Álvarez

Destino exclusivo: grupo Entrada de pedidos (TimelinesAI chat 57099880).
Variables de servidor en Vercel Production: ALVAREZ_TIMELINES_API_TOKEN (sin prefijo Bearer), ALVAREZ_TIMELINES_CHAT_ID=57099880 y CRON_SECRET. No usar NEXT_PUBLIC para credenciales.

Aplicar la migración antes del despliegue. El cron de producción procesa hasta tres avisos por minuto; con cola puede tardar más. No se envían mensajes desde previews. No se importan remesas históricas.

Se registra un aviso al crear la compra web o una remesa manual en Envíos. Convertir una compra web en envío, editar o reimprimir no crea otro aviso. Se comunica el importe a entregar, sin sumar comisión. El mensaje no muestra el estado del pago. El estado contable permanece en la aplicación.

En Compras de remesas, desplegar WhatsApp para ver los últimos veinte avisos y comprobar la conexión. La comprobación consulta únicamente los metadatos del grupo, sin enviar pruebas. Una respuesta aceptada por TimelinesAI no acredita entrega o lectura. Un timeout, interrupción o respuesta ambigua se marca para revisión y no se reintenta automáticamente. Un administrador con permiso de facturación puede reintentar después de comprobar que no llegó al grupo. Esto evita reenvíos automáticos ante resultados desconocidos, pero el proveedor no garantiza idempotencia frente a un reintento manual.

Para probar tras publicar: crear una única remesa real de Álvarez, esperar al cron y comprobar el grupo y el estado. Verificar importe, destinatario y estado de pago; confirmar la compra y comprobar que no aparece otro aviso. Verificar que una remesa de otra tienda no genera aviso. Nunca enviar datos ficticios al grupo de producción.
