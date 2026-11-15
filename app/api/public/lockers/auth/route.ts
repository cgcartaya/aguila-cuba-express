import { createHash } from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { publicStore, response } from "@/lib/procedures/server";

const email = z.email().trim().toLowerCase().max(254);
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("signup"), email, password: z.string().min(8).max(72)
    .refine(value => Buffer.byteLength(value) <= 72) }),
  z.object({ action: z.literal("recovery"), email }),
]);

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin || !await publicStore(request)) {
    return response({ error: "Casillero no disponible." }, 404);
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: "Revisa el correo y la contraseña." }, 400);
  const key = process.env.WF_CARGO_RESEND_API_KEY;
  if (!key) return response({ error: "El envío de correos no está disponible." }, 503);

  const details = parsed.data;
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const digest = (value: string) => createHash("sha256").update(value).digest("hex");
  for (const [bucket, limit] of [[`ip:${digest(ip)}`, 20], [`email:${digest(details.email)}`, 3]] as const) {
    const { data, error } = await supabaseAdmin.rpc("consume_wf_locker_auth_attempt", {
      bucket_key: bucket, max_attempts: limit,
    });
    if (error) return response({ error: "El envío de correos no está disponible." }, 503);
    if (!data) return response({ error: "Espera unos minutos antes de volver a intentarlo." }, 429);
  }

  if (details.action === "signup") {
    const { data: retryAfter, error } = await supabaseAdmin.rpc("reserve_wf_locker_confirmation", {
      bucket_key: digest(details.email),
    });
    if (error) return response({ error: "El envío de correos no está disponible." }, 503);
    if (retryAfter > 0) {
      return response({ error: "Espera para solicitar otro enlace.", retryAfter }, 429);
    }
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink(details.action === "signup"
    ? { type: "signup", email: details.email, password: details.password }
    : { type: "recovery", email: details.email });
  if (error) {
    if (error.code === "email_exists" || error.code === "user_already_exists" || error.code === "user_not_found") {
      return response({ ok: true });
    }
    if (error.code === "weak_password") return response({ error: "Elige una contraseña más segura." }, 400);
    console.error("WF Cargo auth link failed", error.code, error.status);
    return response({ error: "No se pudo procesar la solicitud. Intenta de nuevo." }, 503);
  }
  // Recovery must not verify an account whose original signup is still pending.
  if (details.action === "recovery" && !data.user.email_confirmed_at) return response({ ok: true });
  const url = new URL("/casillero", origin);
  url.hash = new URLSearchParams({ wf_token: data.properties.hashed_token, wf_action: details.action }).toString();
  const signup = details.action === "signup";
  const subject = signup ? "Confirma tu cuenta de WF Cargo Envíos" : "Restablece tu contraseña de WF Cargo";
  const button = signup ? "Confirmar mi cuenta" : "Restablecer mi contraseña";
  const intro = signup
    ? "Gracias por registrarte en nuestro casillero virtual. Confirma tu correo para activar tu cuenta y obtener tu código personal de compras en Estados Unidos."
    : "Abre el enlace para elegir una nueva contraseña para tu casillero.";
  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "WF Cargo Envíos <no-reply@wfcargoenviospsl.com>",
        to: [details.email],
        subject,
        text: `${intro}\n\n${button}: ${url.href}\n\nSi no solicitaste este correo, puedes ignorarlo.`,
        html: `<img src="https://wfcargoenviospsl.com/wfcargo/logo.webp" width="64" alt="WF Cargo Envíos"><h1>${subject}</h1><p>${intro}</p><p><a style="background:#1e40af;color:#fff;padding:12px 16px" href="${url.href.replaceAll("&", "&amp;")}">${button}</a></p><p>Si no solicitaste este correo, puedes ignorarlo.</p>`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (result.ok) return response({ ok: true });
    console.error("WF Cargo auth mail rejected", result.status);
  } catch {
    console.error("WF Cargo auth mail request failed");
  }
  return response({ error: "No se pudo enviar el correo. Puedes volver a intentarlo." }, 503);
}
