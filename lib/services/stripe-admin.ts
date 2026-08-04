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
