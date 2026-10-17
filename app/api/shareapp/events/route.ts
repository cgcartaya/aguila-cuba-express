import { NextRequest } from "next/server";
import {
  db,
  resolveReceipt,
  json,
  fail,
  errorResponse,
} from "@/lib/shareapp/server";
import { UUID, isPreviewBot } from "@/lib/shareapp/core";
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      return fail("Origen inválido.", 403);
    if (isPreviewBot(request.headers.get("user-agent") || ""))
      return json({ ok: true });
    const body = await request.json();
    if (typeof body.storeId !== "string" || !UUID.test(body.storeId))
      return fail("Tienda inválida.");
    const receipt = await resolveReceipt(body.storeId);
    if (!receipt) return json({ ok: true });
    const kind = body.kind === "product_view" ? "product_view" : "page_view";
    const path = String(body.path || "/")
      .split("?")[0]
      .slice(0, 300);
    if (!path.startsWith("/") || /^\/(admin|gestores|api)(\/|$)/.test(path))
      return fail("Ruta inválida.");
    const itemId =
      typeof body.itemId === "string" && UUID.test(body.itemId)
        ? body.itemId
        : null;
    if (kind === "product_view" && !itemId) return fail("Producto inválido.");
    const { error } = await db.from("shareapp_events").upsert(
      {
        store_id: body.storeId,
        member_id: receipt.memberId,
        link_id: receipt.linkId,
        visit_id: receipt.visitId,
        kind,
        path,
        item_id: itemId,
        event_key: `${kind}:${kind === "product_view" ? itemId : path}`,
      },
      { onConflict: "visit_id,event_key", ignoreDuplicates: true },
    );
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
