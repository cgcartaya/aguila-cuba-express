import Stripe from "stripe";

// Solo se importa desde código de servidor (rutas /api). Nunca lo importes
// en un componente "use client" — expondría el secret key.
const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = secretKey
  ? new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" })
  : null;

export function requireStripe() {
  if (!stripe) {
    throw new Error(
      "STRIPE_SECRET_KEY no está configurada. Agrégala en las variables de entorno."
    );
  }
  return stripe;
}
