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
import {
  applyPlatformFee,
  getPlatformFeePercent,
} from "@/lib/storefront/product-quantity-pricing";
import { storageImageUrl, previewHtml } from "@/lib/shareapp/preview";

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
      const price = item
        ? applyPlatformFee(
            Number(item.price),
            getPlatformFeePercent(store),
          ).toFixed(2)
        : null;
      const photo = itemImage(item);
      // Same original public image as the product page, without a processing hop.
      // Other image sources retain the constrained media endpoint fallback.
      const original =
        photo &&
        storageImageUrl(photo, process.env.NEXT_PUBLIC_SUPABASE_URL || "");
      const html = previewHtml({
        title: item
          ? `${item.name} | ${price} USD | ${store.name}`
          : store.name,
        description: item
          ? `Precio: ${price} USD. ${String(
              item.description || `Compra ${item.name} en ${store.name}.`,
            )
              .replace(/\s+/g, " ")
              .trim()}`.slice(0, 200)
          : `Descubre los productos de ${store.name}.`,
        url: `${canonical}/r/${code}`,
        image: original
          ? original.href
          : photo
            ? `${canonical}/r/${code}/image`
            : null,
        siteName: store.name,
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
