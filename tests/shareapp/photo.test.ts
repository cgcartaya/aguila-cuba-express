import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { previewHtml, storageImageUrl } from "../../lib/shareapp/preview";
import { newDraft } from "../../lib/shareapp/workspace-types";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
const code = "a".repeat(48),
  storeId = "11111111-1111-4111-8111-111111111111";

test("image source accepts only configured public Storage and escapes preview HTML", () => {
  const project = "https://test.supabase.co";
  assert.ok(
    storageImageUrl(
      `${project}/storage/v1/object/public/products/a.png`,
      project,
    ),
  );
  for (const url of [
    "http://127.0.0.1/a",
    "https://other.supabase.co/storage/v1/object/public/a",
    `${project}/storage/v1/object/sign/a`,
    `https://test.supabase.co.evil.com/storage/v1/object/public/a`,
    `https://user:pass@test.supabase.co/storage/v1/object/public/a`,
  ])
    assert.equal(storageImageUrl(url, project), null);
  const html = previewHtml({
    title: '\"><script>alert(1)</script>',
    description: "safe",
    url: "https://example.com",
    image: null,
    destination: "https://example.com",
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});
test("new suggested copy omits repeated title and stays concise", () => {
  const draft = newDraft({
    id: "p",
    name: "Cerveza Cristal",
    price: 13,
    image_url: null,
    description: "Cerveza Cristal\n" + "Una cerveza refrescante. ".repeat(40),
  });
  assert.equal(draft.body.split("Cerveza Cristal").length - 1, 1);
  assert.ok(draft.body.length < 300);
  assert.ok(draft.body.includes("13.00 USD"));
});
test("promotion preview, original attribution and photo gates", async (t) => {
  const { db } = await import("../../lib/shareapp/server");
  const { GET: visit } = await import("../../app/r/[code]/route");
  const { GET: image } = await import("../../app/r/[code]/image/route");
  const sharp = (await import("sharp")).default;
  let paused = false,
    retired = false,
    enabled = true,
    kind = "product",
    source = "https://test.supabase.co/storage/v1/object/public/products/a.png";
  const filters: unknown[][] = [];
  db.from = ((table: string) => {
    const value = () =>
      table === "shareapp_links"
        ? paused
          ? null
          : {
              id: storeId,
              store_id: storeId,
              member_id: storeId,
              kind,
              item_id: storeId,
            }
        : table === "stores"
          ? {
              id: storeId,
              slug: "demo",
              name: "Tienda Demo",
              is_active: true,
              module_store_enabled: true,
            }
          : table === "shareapp_members"
            ? { id: storeId }
            : table === "shareapp_settings"
              ? { enabled, attribution_days: 7 }
              : retired
                ? null
                : {
                    name: "Cerveza",
                    price: 13,
                    image_url: kind === "combo" ? source : "",
                    product_images: [
                      { image_url: source, is_main: true, position: 0 },
                    ],
                  };
    const q = {
      select: () => q,
      eq: (...args: unknown[]) => {
        filters.push([table, ...args]);
        return q;
      },
      not: () => q,
      is: () => q,
      maybeSingle: async () => ({ data: value(), error: null }),
    };
    return q;
  }) as never;
  const ctx = { params: Promise.resolve({ code }) };
  const request = (ua = "Mozilla/5.0") =>
    new NextRequest(`https://perlamarketplace.com/r/${code}`, {
      headers: { "user-agent": ua },
    });
  await t.test(
    "WhatsApp preview returns photo metadata without attribution cookie",
    async () => {
      const response = await visit(request("WhatsApp/2.0"), ctx);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("set-cookie"), null);
      const html = await response.text();
      assert.ok(html.includes(`https://perlamarketplace.com/r/${code}/image`));
      assert.ok(html.includes("13.00 USD"));
      assert.ok(
        filters.some(
          ([table, key, value]) =>
            table === "products" && key === "store_id" && value === storeId,
        ),
      );
    },
  );
  await t.test(
    "buyer redirects and receives signed HttpOnly attribution",
    async () => {
      const response = await visit(request(), ctx);
      assert.equal(response.status, 307);
      assert.ok(
        response.headers
          .get("location")
          ?.includes(`/producto/${storeId}?perla_ref=${storeId}`),
      );
      assert.ok(response.headers.get("set-cookie")?.includes("HttpOnly"));
    },
  );
  await t.test(
    "photo produces JPEG, refuses external URLs, and records no visit",
    async () => {
      const original = globalThis.fetch;
      let fetches = 0;
      const png = await sharp({
        create: { width: 10, height: 10, channels: 4, background: "red" },
      })
        .png()
        .toBuffer();
      globalThis.fetch = (async (_url, options) => {
        fetches++;
        assert.equal(options?.redirect, "error");
        return new Response(new Uint8Array(png));
      }) as typeof fetch;
      try {
        const response = await image(request(), ctx);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("content-type"), "image/jpeg");
        assert.equal(response.headers.get("set-cookie"), null);
        const metadata = await sharp(
          Buffer.from(await response.arrayBuffer()),
        ).metadata();
        assert.equal(metadata.format, "jpeg");
        source = "https://127.0.0.1/private";
        assert.equal((await image(request(), ctx)).status, 404);
        assert.equal(fetches, 1);
        source =
          "https://test.supabase.co/storage/v1/object/public/products/a.png";
        globalThis.fetch = (async () =>
          new Response("x", {
            headers: { "content-length": "9000000" },
          })) as typeof fetch;
        assert.equal((await image(request(), ctx)).status, 502);
      } finally {
        globalThis.fetch = original;
      }
    },
  );
  await t.test(
    "paused and disabled promotions expose no preview or photo",
    async () => {
      paused = true;
      assert.equal((await image(request(), ctx)).status, 404);
      assert.equal(
        (await visit(request("facebookexternalhit"), ctx)).status,
        404,
      );
      paused = false;
      enabled = false;
      assert.equal((await image(request(), ctx)).status, 410);
      enabled = true;
    },
  );
  await t.test(
    "retired items fall back to store and combos carry photo metadata",
    async () => {
      retired = true;
      const response = await visit(request(), ctx);
      assert.ok(!response.headers.get("location")?.includes("producto"));
      assert.equal((await image(request(), ctx)).status, 404);
      retired = false;
      kind = "combo";
      assert.ok(
        (await (await visit(request("TelegramBot"), ctx)).text()).includes(
          `r/${code}/image`,
        ),
      );
    },
  );
});
