import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  cookieName,
  destination,
  storefrontForRequest,
  signReceipt,
  isPreviewBot,
} from "@/lib/shareapp/core";
import { secret, errorResponse } from "@/lib/shareapp/server";

import { promotion, itemImage } from "@/lib/shareapp/promotion";
import { previewHtml } from "@/lib/shareapp/preview";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    const { link, store, config, kind, item } = await promotion(code);
    const canonical = storefrontForRequest(
      store,
      request.nextUrl.origin,
    ).origin;
    if (request.nextUrl.origin !== canonical) {
      const response = NextResponse.redirect(`${canonical}/r/${code}`, 307);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    const target = `${canonical}${new URL(destination(store, kind, link.item_id)).pathname}`;
    if (isPreviewBot(request.headers.get("user-agent") || "")) {
      const html = previewHtml({
        title: item?.name || store.name,
        description: item
          ? `Precio: ${Number(item.price).toFixed(2)} USD · ${store.name}`
          : `Descubre los productos de ${store.name}.`,
        url: `${canonical}/r/${code}`,
        image: itemImage(item) ? `${canonical}/r/${code}/image` : null,
        destination: target,
      });
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'none'; frame-ancestors 'none'",
        },
      });
    }
    const response = NextResponse.redirect(
      `${target}?perla_ref=${store.id}`,
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
