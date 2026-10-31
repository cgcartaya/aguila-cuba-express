# Etiquetas y contenido de paquetes

Disponible para todas las agencias con el módulo de envíos.

- Al registrar o editar un envío con paquete, «Contenido del paquete» permite añadir cantidad y descripción. Es opcional y no altera precios ni existencias.
- El sistema asigna un identificador global `PKG-00000001`. Se conserva al editar, borrar a papelera, restaurar o reimprimir. Los envíos anteriores también reciben identificador. Puede haber saltos de numeración.
- En la lista de envíos o las acciones de factura, «Etiqueta / Contenido» abre la impresión. Etiqueta: 4×6 pulgadas, escala 100 %, sin encabezados ni pies del navegador.
- El QR real se genera localmente con la biblioteca `qrcode` y apunta a `/factura/<código de rastreo>` en el dominio de la agencia. Se requiere tener activa la factura/rastreo público; la pantalla avisa y bloquea imprimir la etiqueta si no está disponible.
- La etiqueta muestra los primeros cuatro artículos y avisa cuando existe más contenido. La factura pública, la factura administrativa y «Lista de contenido A4» contienen la lista completa, hasta 100 filas. La lista A4 incorpora casillas de comprobación y espacio de firma.
- En esta versión cada registro de envío representa un paquete. La gestión de varios bultos por envío y la integración con la APK quedan fuera de este cambio.

## Instalación

Aplicar `supabase/migrations/20261031163951_shipping_package_labels.sql` antes de desplegar el código. Ya se aplicó al proyecto de producción de Perla. No requiere cambios de configuración por agencia. El número se genera en Postgres; nunca se envía en las escrituras del formulario.

## Verificación

`node --test tests/package-label.test.mjs tests/shipment-discount.test.mjs tests/alvarez-shipping.test.mjs`

Para comprobar impresión con Chromium/Playwright instalado: `node tests/package-label-browser.mjs`. Se puede indicar otro ejecutable mediante `PRINT_QA_CHROMIUM`. Los archivos de comprobación se escriben en `/tmp`.

## Cantidad en cargos adicionales

Al seleccionar un cargo en «Rebaja y total de la factura», se muestra «Cantidad» y su subtotal. Por ejemplo, Teléfono a $20 y cantidad 2 suma $40. Las cantidades se guardan al editar y se imprimen como cantidad × precio unitario en las facturas. Los cargos anteriores sin cantidad se interpretan como una unidad. Los cargos por libra y porcentuales conservan su fórmula por unidad y se multiplican por la cantidad elegida.

La lista descriptiva de contenido y las cantidades cobradas son campos independientes: escribir «2 teléfonos» en el contenido no selecciona automáticamente un cargo.
