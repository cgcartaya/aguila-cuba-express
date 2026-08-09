// Interruptor temporal para los pagos con tarjeta (envíos/recogida y
// tienda). Se apagó la noche del 4 de agosto de 2026 mientras Frank
// termina de conectar la cuenta real de Stripe de Águila — no había
// tiempo de probarlo esa misma noche, así que se ocultó la opción en
// vez de dejarla visible y fallando.
//
// Para reactivarlo: cambia esto a `true` y vuelve a desplegar. No hay
// que tocar nada más — todo el código de tarjeta (Stripe Checkout, QR,
// WhatsApp, webhook, recibos) sigue intacto, solo estaba oculto.
export const CARD_PAYMENTS_ENABLED = true;

// Recargo por pagar con tarjeta (no aplica a efectivo/WhatsApp). Es aparte
// de la comisión de plataforma (el 2.5% ya incluido en el precio) — este
// recargo es para que Frank no pierda plata con lo que Stripe le descuenta
// por procesar la tarjeta. Se cobra como línea aparte en el Checkout de
// Stripe, nunca se mezcla con el precio del pedido/envío.
//
// Nota: varios estados regulan cuánto se puede recargar por tarjeta y
// exigen avisarlo antes del cobro (esto ya lo hace, como línea aparte en
// el Checkout) — vale la pena confirmar con un contador/abogado que 2.5%
// esté dentro de lo permitido en Florida antes de dejarlo en producción.
export const CARD_SURCHARGE_RATE = 0.025;
