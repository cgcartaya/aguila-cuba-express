import { NextRequest } from "next/server";
import { db, user, json, fail, errorResponse } from "@/lib/shareapp/server";
import { CODE } from "@/lib/shareapp/core";

export async function POST(request: NextRequest) {
  try {
    const actor = await user(request);
    const { code } = await request.json();
    if (typeof code !== "string" || !CODE.test(code))
      return fail("Invitación inválida.");
    const { data: invite, error: inviteError } = await db
      .from("shareapp_members")
      .select("email")
      .eq("invite_code", code)
      .eq("active", true)
      .is("user_id", null)
      .gt("invite_expires_at", new Date().toISOString())
      .maybeSingle();
    if (inviteError) throw inviteError;
    if (!invite) return fail("La invitación caducó o ya se utilizó.", 410);
    if (
      invite.email &&
      invite.email.toLowerCase() !== actor.email.toLowerCase()
    )
      return fail(
        "Esta invitación pertenece a otro correo. Cambia de cuenta para aceptarla.",
        403,
      );
    // Single conditional UPDATE makes a one-use invitation safe under concurrent acceptance.
    const { data, error } = await db
      .from("shareapp_members")
      .update({
        user_id: actor.id,
        email: actor.email,
        invite_code: null,
        invite_expires_at: null,
      })
      .eq("invite_code", code)
      .eq("active", true)
      .is("user_id", null)
      .gt("invite_expires_at", new Date().toISOString())
      .select("store_id")
      .maybeSingle();
    if (error?.code === "23505")
      return fail("Ya tienes un acceso para esta tienda.", 409);
    if (error) throw error;
    if (!data)
      return fail(
        "La invitación caducó, fue utilizada o está desactivada.",
        410,
      );
    return json({ storeId: data.store_id });
  } catch (error) {
    return errorResponse(error);
  }
}
