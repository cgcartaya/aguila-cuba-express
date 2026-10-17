import { NextRequest } from "next/server";
import { db, json, fail, secret, errorResponse } from "@/lib/shareapp/server";
import {
  tokenHash,
  validPassword,
  temporaryDigest,
} from "@/lib/shareapp/accounts";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token))
      return fail("Enlace de activación inválido.", 410);
    const hash = tokenHash(body.token);
    const { data: account, error } = await db
      .from("shareapp_accounts")
      .select(
        "user_id,email,full_name,created_store_id,temporary_password_digest",
      )
      .eq("setup_token_hash", hash)
      .eq("password_pending", true)
      .gt("setup_expires_at", new Date().toISOString())
      .is("setup_claimed_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!account)
      return fail(
        "El enlace caducó o ya se utilizó. Pide al dueño uno nuevo.",
        410,
      );
    const { data: membership, error: memberError } = await db
      .from("shareapp_members")
      .select("id")
      .eq("user_id", account.user_id)
      .eq("store_id", account.created_store_id)
      .eq("active", true)
      .maybeSingle();
    if (memberError) throw memberError;
    if (!membership) return fail("Este acceso fue desactivado.", 403);
    if (body.action === "inspect")
      return json({ email: account.email, fullName: account.full_name });
    if (!validPassword(body.password))
      return fail("Usa de 12 a 128 caracteres, con letras y números.");
    if (
      account.temporary_password_digest ===
      temporaryDigest(account.user_id, body.password, secret())
    )
      return fail("Elige una contraseña diferente a la temporal.");
    const claimTime = new Date().toISOString();
    const { data: claim, error: claimError } = await db
      .from("shareapp_accounts")
      .update({ setup_claimed_at: claimTime })
      .eq("user_id", account.user_id)
      .eq("setup_token_hash", hash)
      .eq("password_pending", true)
      .gt("setup_expires_at", claimTime)
      .is("setup_claimed_at", null)
      .select("user_id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claim) return fail("Este enlace ya se está utilizando.", 409);
    const { error: authError } = await db.auth.admin.updateUserById(
      account.user_id,
      { password: body.password },
    );
    if (authError) {
      await db
        .from("shareapp_accounts")
        .update({ setup_claimed_at: null })
        .eq("user_id", account.user_id)
        .eq("setup_claimed_at", claimTime)
        .eq("setup_token_hash", hash);
      return fail(
        "No se pudo guardar la contraseña. Revisa los requisitos e inténtalo de nuevo.",
      );
    }
    const { error: completeError } = await db
      .from("shareapp_accounts")
      .update({
        password_pending: false,
        temporary_password_digest: null,
        setup_token_hash: null,
        setup_expires_at: null,
        setup_claimed_at: null,
      })
      .eq("user_id", account.user_id)
      .eq("setup_token_hash", hash)
      .eq("setup_claimed_at", claimTime);
    if (completeError) throw completeError;
    return json({ ok: true, email: account.email });
  } catch (error) {
    return errorResponse(error);
  }
}
