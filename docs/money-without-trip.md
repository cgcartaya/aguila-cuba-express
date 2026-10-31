# Envíos de dinero sin viaje

Para todas las agencias con módulo de envíos:

1. En «Todos los envíos», abrir «Nuevo envío de dinero» o elegir «Envío de dinero» al crear una operación.
2. Registrar cliente, destinatario, monto, comisión y, si procede, repartidor. Los importes usan los ajustes actuales de cada agencia.
3. Elegir Pendiente de entrega, En reparto, Entregado o Incidencia. El sistema conserva los códigos de estado existentes, compatibles con las facturas y registros previos.
4. Guardar. La operación recibe consecutivo general, rastreo y factura. No se asocia a un viaje, aunque exista uno predeterminado o se haya entrado desde un viaje.
5. Gestionar desde la lista general, filtrando Contenido → Solo dinero, por estado o por repartidor. Editar permite cambiar estado y repartidor.

Paquetes y operaciones mixtas siguen requiriendo viaje al crearse. Cambiar el tipo de operación en el formulario conserva los datos ya escritos. Los registros históricos no se desvinculan automáticamente de sus viajes. La interfaz de las remesas sin viaje no muestra el control para asignarles uno.

No requiere migración ni configuración nueva. Aprovecha trip_id nullable y el consecutivo general que ya admite la base. La APK no forma parte de este cambio.

Pruebas: `node --test tests/money-operation.test.mjs tests/shipment-discount.test.mjs`. Con Playwright/esbuild y Chromium disponibles, `node tests/money-without-trip-browser.mjs` comprueba el formulario real con servicios simulados. Admite PRINT_QA_CHROMIUM y PRINT_QA_NODE_MODULES para las dependencias de comprobación.
