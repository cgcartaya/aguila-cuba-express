import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  CODE,
  cookieName,
  destination,
  storefront,
  signReceipt,
  isPreviewBot,
} from "@/lib/shareapp/core";
import {
  db,
  settings,
  secret,
  fail,
  errorResponse,
} from "@/lib/shareapp/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    if (!CODE.test(code)) return fail("Enlace inválido.", 404);
    const { data: link, error } = await db
      .from("shareapp_links")
      .select("id,store_id,member_id,kind,item_id")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    if (!link) return fail("Este enlace ya no está disponible.", 404);
    const [
      { data: store, error: storeError },
      { data: promoter, error: memberError },
      config,
    ] = await Promise.all([
      db
        .from("stores")
        .select("id,slug,domain,subdomain,has_landing,is_active,module_store_enabled")
        .eq("id", link.store_id)
        .eq("is_active", true)
        .maybeSingle(),
      db
        .from("shareapp_members")
        .select("id")
        .eq("id", link.member_id)
        .eq("active", true)
        .not("user_id", "is", null)
        .maybeSingle(),
      settings(link.store_id),
    ]);
    if (storeError) throw storeError;
    if (memberError) throw memberError;
    if (!store || !store.module_store_enabled || !promoter || !config.enabled)
      return fail("Esta promoción está desactivada.", 410);
    const canonical = storefront(store).origin;
    // Cookies must be set on the same host where this store performs checkout.
    if (request.nextUrl.origin !== canonical)
      return NextResponse.redirect(`${canonical}/r/${code}`, 307);
    let kind = link.kind;
    if (kind !== "store") {
      const { data: item, error: itemError } = await db
        .from(kind === "combo" ? "combos" : "products")
        .select("id")
        .eq("id", link.item_id)
        .eq("store_id", store.id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();
      if (itemError) throw itemError;
      if (!item) kind = "store"; // Old posts remain useful when an item is retired.
    }
    const response = NextResponse.redirect(
      `${destination(store, kind, link.item_id)}?perla_ref=${store.id}`,
      307,
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    if (!isPreviewBot(request.headers.get("user-agent") || "")) {
      response.cookies.set(
        cookieName(store.id),
        signReceipt(
          {
            linkId: link.id,
            storeId: store.id,
            visitId: randomUUID(),
            issuedAt: Date.now(),
          },
          secret(),
        ),
        {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: config.attribution_days * 86400,
        },
      );
    }
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
