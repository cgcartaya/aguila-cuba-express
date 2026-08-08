import Stripe from "stripe";

// Solo se importa desde código de servidor (rutas /api). Nunca lo importes
// en un componente "use client" — expondría el secret key.
const secretKey = process.env.STRIPE_SECRET_KEY;

// Debe coincidir con el header Stripe-Version que se manda en stripeV2Fetch.
export const STRIPE_API_VERSION = "2026-07-29.dahlia";

export const stripe = secretKey
  ? new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion })
  : null;

export function requireStripe() {
  if (!stripe) {
    throw new Error(
      "STRIPE_SECRET_KEY no está configurada. Agrégala en las variables de entorno."
    );
  }
  return stripe;
}

// Stripe dejó de aceptar cuentas conectadas "v1" (accounts.create tipo
// express) para plataformas nuevas — ahora exige la API "v2" para crear y
// consultar cuentas conectadas. El SDK de Node todavía no tiene un helper
// tipado estable para v2 en todas sus versiones, así que llamamos la REST
// API de Stripe directo con fetch, para no depender de tipos inestables.
export async function stripeV2Fetch(
  path: string,
  init: { method?: string; body?: unknown } = {}
) {
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY no está configurada.");

  const response = await fetch(`https://api.stripe.com/v2/${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": STRIPE_API_VERSION,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || `Stripe respondió ${response.status}`;
    throw new Error(message);
  }

  return data;
}

/* =========================================================
   MODO DE COBRO POR TIENDA: "connect" vs "direct"

   Cada tienda cobra con tarjeta de una de estas dos formas,
   controlado por la columna stores.stripe_mode:

   - "connect" (default, el modelo que ya existía): la tienda es una
     cuenta conectada (v2) bajo TU cuenta de plataforma. Se cobra con
     stripe.checkout.sessions.create(params, { stripeAccount: ... })
     usando TU secret key, y Stripe separa automáticamente un 2% extra
     (application_fee_amount) que cae directo en tu cuenta.

   - "direct": la tienda tiene su PROPIA cuenta de Stripe normal, sin
     ninguna relación de Connect con la plataforma. Se cobra con la
     secret key de esa tienda (stores.stripe_direct_secret_key), sin
     stripeAccount y sin application_fee_amount — porque no hay cuenta
     conectada donde Stripe pueda hacer ese reparto. En este modo tu
     comisión no depende de Stripe: ya va incluida en el precio del
     producto (el 2.5% de markup), así que no hace falta cobrar nada
     extra en el momento del pago.

   getStoreStripeContext() es el único lugar que decide esto — las
   rutas de cobro solo le piden el contexto y usan lo que les devuelva.
   Para cambiar el modo de una tienda no hay que tocar código: solo
   actualizar stores.stripe_mode (y, si es "direct", guardar su
   stripe_direct_secret_key). Si el día de mañana Stripe habilita
   Accounts v2 para la plataforma, basta con volver stripe_mode a
   "connect" — el código de "connect" nunca se borra, sigue ahí.
========================================================= */

export type StoreStripeRow = {
  stripe_mode?: string | null;
  stripe_account_id?: string | null;
  stripe_charges_enabled?: boolean | null;
  stripe_direct_secret_key?: string | null;
};

export type StoreStripeContext = {
  mode: "connect" | "direct";
  stripe: Stripe;
  // Se pasa como segundo argumento a stripe.checkout.sessions.create(...).
  // En "connect" trae { stripeAccount }; en "direct" va vacío.
  requestOptions: Stripe.RequestOptions;
  // Si es true, la ruta que cobra debe agregar application_fee_amount.
  // En "direct" siempre es false: no hay cuenta conectada que lo soporte,
  // y no hace falta — la comisión ya está en el precio.
  applyPlatformFee: boolean;
};

export function getStoreStripeMode(store: StoreStripeRow): "connect" | "direct" {
  return store.stripe_mode === "direct" ? "direct" : "connect";
}

/**
 * Devuelve el cliente de Stripe + opciones correctas para cobrarle a esta
 * tienda, según su modo. Devuelve null si ese modo todavía no está listo
 * para cobrar (ej. "connect" sin cuenta conectada activa, o "direct" sin
 * secret key guardada) — la ruta que llama debe tratar null como "cobros
 * con tarjeta no disponibles todavía" (503), igual que antes.
 */
export function getStoreStripeContext(store: StoreStripeRow): StoreStripeContext | null {
  const mode = getStoreStripeMode(store);

  if (mode === "direct") {
    if (!store.stripe_direct_secret_key) return null;
    const directStripe = new Stripe(store.stripe_direct_secret_key, {
      apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
    });
    return { mode, stripe: directStripe, requestOptions: {}, applyPlatformFee: false };
  }

  if (!stripe || !store.stripe_account_id || !store.stripe_charges_enabled) return null;
  return {
    mode,
    stripe,
    requestOptions: { stripeAccount: store.stripe_account_id },
    applyPlatformFee: true,
  };
}
