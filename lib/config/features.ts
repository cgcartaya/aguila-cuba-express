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
