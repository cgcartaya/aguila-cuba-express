import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import {
  db,
  owner,
  json,
  fail,
  secret,
  errorResponse,
} from "@/lib/shareapp/server";
import {
  normalizeEmail,
  validEmail,
  validPassword,
  tokenHash,
  temporaryDigest,
} from "@/lib/shareapp/accounts";
import { UUID } from "@/lib/shareapp/core";
const activationUrl = (token: string) =>
  `https://perlamarketplace.com/gestores/activar#setup=${token}`;

export async function POST(request: NextRequest) {
  let createdUserId: string | null = null;
  let committed = false;
  try {
    const body = await request.json();
    const storeId = String(body.storeId || "");
    const actor = await owner(request, storeId);
    // Rotate a setup link only while this store's managed account is pending.
    if (body.memberId) {
      if (!UUID.test(body.memberId)) return fail("Gestor inválido.");
      const { data: membership, error: memberError } = await db
        .from("shareapp_members")
        .select("user_id")
        .eq("id", body.memberId)
        .eq("store_id", storeId)
        .eq("active", true)
        .maybeSingle();
      if (memberError) throw memberError;
      if (!membership?.user_id) return fail("Gestor no encontrado.", 404);
      const token = randomBytes(32).toString("hex");
      const { data, error } = await db
        .from("shareapp_accounts")
        .update({
          setup_token_hash: tokenHash(token),
          setup_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
          setup_claimed_at: null,
        })
        .eq("user_id", membership.user_id)
        .eq("created_store_id", storeId)
        .eq("password_pending", true)
        .is("setup_claimed_at", null)
        .select("user_id")
        .maybeSingle();
      if (error) throw error;
      if (!data)
        return fail(
          "La cuenta ya fue activada. El gestor puede recuperar su contraseña desde ShareAPP.",
          409,
        );
      return json({ activationUrl: activationUrl(token) });
    }
    const name = String(body.displayName || "")
      .trim()
      .slice(0, 100);
    const email = normalizeEmail(body.email);
    const mode = body.mode === "temporary" ? "temporary" : "activation";
    if (!name || !validEmail(email))
      return fail("Escribe el nombre y un correo válido.");
    if (mode === "temporary" && !validPassword(body.temporaryPassword))
      return fail(
        "La contraseña temporal debe tener de 12 a 128 caracteres, letras y números.",
      );
    const { data: store, error: storeError } = await db
      .from("stores")
      .select("id")
      .eq("id", storeId)
      .eq("is_active", true)
      .eq("module_store_enabled", true)
      .maybeSingle();
    if (storeError) throw storeError;
    if (!store) return fail("La tienda no está activa.", 409);
    // createUser is intentionally strict: never update, reset, or take over an existing account.
    const { data: created, error: authError } = await db.auth.admin.createUser({
      email,
      password:
        mode === "temporary"
          ? body.temporaryPassword
          : randomBytes(36).toString("base64url"),
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (authError || !created.user) {
      if (
        authError?.code === "email_exists" ||
        authError?.code === "user_already_exists"
      )
        return fail(
          "Ese correo ya tiene una cuenta. Usa «Invitar gestor existente»; su contraseña no se modificará.",
          409,
        );
      return fail(
        "No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.",
        400,
      );
    }
    createdUserId = created.user.id;
    const token = randomBytes(32).toString("hex");
    const { error: accountError } = await db.from("shareapp_accounts").insert({
      user_id: createdUserId,
      created_store_id: storeId,
      created_by: actor.id,
      email,
      full_name: name,
      password_pending: true,
      temporary_password_digest:
        mode === "temporary"
          ? temporaryDigest(createdUserId, body.temporaryPassword, secret())
          : null,
      setup_token_hash: tokenHash(token),
      setup_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    if (accountError) throw accountError;
    const { data: member, error: memberError } = await db
      .from("shareapp_members")
      .insert({
        store_id: storeId,
        user_id: createdUserId,
        display_name: name,
        email,
        invited_by: actor.id,
      })
      .select("id")
      .single();
    if (memberError) throw memberError;
    committed = true;
    return json({
      member,
      email,
      mode,
      activationUrl: activationUrl(token),
      passwordPending: true,
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    // Compensate only the brand-new Auth identity from this attempt, never an existing account.
    if (createdUserId && !committed) {
      const { error } = await db.auth.admin.deleteUser(createdUserId);
      if (error)
        console.error(
          "ShareAPP: no se pudo limpiar una cuenta incompleta",
          createdUserId,
          error.code,
        );
    }
  }
}
