import { NextRequest } from "next/server";
import {
  db,
  user,
  json,
  fail,
  secret,
  errorResponse,
} from "@/lib/shareapp/server";
import { validPassword, temporaryDigest } from "@/lib/shareapp/accounts";
export async function POST(request: NextRequest) {
  try {
    const actor = await user(request, true);
    const { password } = await request.json();
    if (!validPassword(password))
      return fail("Usa de 12 a 128 caracteres, con letras y números.");
    const { data: account, error: accountError } = await db
      .from("shareapp_accounts")
      .select("temporary_password_digest")
      .eq("user_id", actor.id)
      .maybeSingle();
    if (accountError) throw accountError;
    if (
      account?.temporary_password_digest ===
      temporaryDigest(actor.id, password, secret())
    )
      return fail("Elige una contraseña diferente a la temporal.");
    const { error: authError } = await db.auth.admin.updateUserById(actor.id, {
      password,
    });
    if (authError)
      return fail(
        "No se pudo actualizar la contraseña. Comprueba que cumple los requisitos de tu cuenta.",
      );
    const { error } = await db
      .from("shareapp_accounts")
      .update({
        password_pending: false,
        temporary_password_digest: null,
        setup_token_hash: null,
        setup_expires_at: null,
        setup_claimed_at: null,
      })
      .eq("user_id", actor.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
