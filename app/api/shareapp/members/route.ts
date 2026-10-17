import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import {
  db,
  owner,
  settings,
  json,
  fail,
  errorResponse,
} from "@/lib/shareapp/server";
import { normalizeEmail, validEmail } from "@/lib/shareapp/accounts";
import { UUID } from "@/lib/shareapp/core";

export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get("storeId") || "";
    await owner(request, storeId);
    const { data, error } = await db
      .from("shareapp_members")
      .select(
        "id,display_name,email,active,user_id,invite_code,invite_expires_at,created_at",
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const userIds = (data || []).flatMap((row) =>
      row.user_id ? [row.user_id] : [],
    );
    const { data: accounts, error: accountError } = userIds.length
      ? await db
          .from("shareapp_accounts")
          .select("user_id,password_pending")
          .in("user_id", userIds)
      : { data: [], error: null };
    if (accountError) throw accountError;
    const pending = new Map(
      (accounts || []).map((row) => [row.user_id, row.password_pending]),
    );
    return json({
      members: (data || []).map((row) => ({
        ...row,
        password_pending: pending.get(row.user_id) || false,
      })),
      settings: await settings(storeId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actor = await owner(request, String(body.storeId || ""));
    const name = String(body.displayName || "")
      .trim()
      .slice(0, 100);
    const email = normalizeEmail(body.email);
    if (!name || !validEmail(email))
      return fail("Escribe el nombre y correo del gestor existente.");
    const { data, error } = await db
      .from("shareapp_members")
      .insert({
        store_id: body.storeId,
        display_name: name,
        email,
        invited_by: actor.id,
        invite_code: randomBytes(24).toString("hex"),
        invite_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    return json({ member: data });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const storeId = String(body.storeId || "");
    await owner(request, storeId);
    if (body.memberId) {
      if (!UUID.test(body.memberId) || typeof body.active !== "boolean")
        return fail("Datos de gestor inválidos.");
      const { data, error } = await db
        .from("shareapp_members")
        .update({ active: body.active })
        .eq("id", body.memberId)
        .eq("store_id", storeId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return fail("Gestor no encontrado.", 404);
    } else {
      const days = Number(body.attributionDays);
      if (
        typeof body.enabled !== "boolean" ||
        !Number.isInteger(days) ||
        days < 1 ||
        days > 30
      )
        return fail("El plazo debe ser de 1 a 30 días.");
      const { error } = await db.from("shareapp_settings").upsert({
        store_id: storeId,
        enabled: body.enabled,
        attribution_days: days,
      });
      if (error) throw error;
    }
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
