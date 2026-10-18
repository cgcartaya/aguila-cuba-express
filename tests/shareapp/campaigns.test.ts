import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture";
const store = "11111111-1111-4111-8111-111111111111",
  uid = "22222222-2222-4222-8222-222222222222",
  mid = "33333333-3333-4333-8333-333333333333",
  cid = "44444444-4444-4444-8444-444444444444",
  file = "55555555-5555-4555-8555-555555555555.jpg";
function req(path: string, body?: unknown, method = body ? "POST" : "GET") {
  return new NextRequest(`https://example.com/api/shareapp/${path}`, {
    method,
    headers: { Authorization: "Bearer fixture" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
test("campaign permissions, owned posters, publications and previews", async (t) => {
  const { db } = await import("../../lib/shareapp/server");
  const api = await import("../../app/api/shareapp/campaigns/route");
  const report = await import("../../app/api/shareapp/campaign-results/route");
  const links = await import("../../app/api/shareapp/links/route");
  const preview = await import("../../app/r/[code]/route");
  const upload = await import("../../app/api/shareapp/campaigns/poster/route");
  db.auth.getUser = (async () => ({
    data: { user: { id: uid, email: "gestor@test.example" } },
    error: null,
  })) as never;
  let role = "OWNER",
    campaignActive = true,
    targetAvailable = true;
  const seen: { table: string; method: string; args: unknown[] }[] = [];
  let inserted: Record<string, unknown> = {};
  let rpcArgs: Record<string, unknown> = {};
  let uploadCount = 0;
  const campaign = () => ({
    id: cid,
    store_id: store,
    title: "Póster de oferta",
    body: "Texto de campaña",
    poster_path: `${store}/${file}`,
    kind: "store",
    item_id: null,
    active: true,
  });
  db.storage.from = ((bucket: string) => ({
    getPublicUrl: (path: string) => ({
      data: {
        publicUrl: `https://test.supabase.co/storage/v1/object/public/${bucket}/${path}`,
      },
    }),
    list: async () => ({ data: [{ name: file }], error: null }),
    upload: async (path: string, bytes: Buffer) => {
      uploadCount++;
      assert.ok(path.startsWith(`${store}/`));
      assert.ok(bytes[0] === 255 && bytes[1] === 216);
      return { error: null };
    },
  })) as never;
  db.from = ((table: string) => {
    const value = () =>
      table === "profiles" || table === "shareapp_accounts"
        ? null
        : table === "store_users"
          ? { role }
          : table === "shareapp_members"
            ? { id: mid, store_id: store }
            : table === "stores"
              ? {
                  id: store,
                  slug: "demo",
                  name: "Tienda",
                  is_active: true,
                  module_store_enabled: true,
                }
              : table === "shareapp_settings"
                ? { enabled: true, attribution_days: 7 }
                : table === "shareapp_campaigns"
                  ? campaignActive
                    ? campaign()
                    : null
                  : table === "shareapp_links"
                    ? {
                        id: cid,
                        store_id: store,
                        member_id: mid,
                        campaign_id: cid,
                        kind: "store",
                        item_id: null,
                        code: "a".repeat(48),
                        ...inserted,
                      }
                    : targetAvailable
                      ? { id: cid }
                      : null;
    const q: Record<string, unknown> = {};
    for (const method of [
      "select",
      "eq",
      "is",
      "not",
      "order",
      "range",
      "limit",
      "ilike",
      "update",
    ]) {
      q[method] = (...args: unknown[]) => {
        seen.push({ table, method, args });
        return q;
      };
    }
    q.insert = (row: Record<string, unknown>) => {
      inserted = row;
      return q;
    };
    q.maybeSingle = q.single = async () => ({ data: value(), error: null });
    q.then = (resolve: (x: unknown) => unknown) =>
      Promise.resolve({
        data: table === "shareapp_campaigns" ? [campaign()] : [],
        error: null,
      }).then(resolve);
    return q;
  }) as never;
  db.rpc = (async (_name: string, args: Record<string, unknown>) => {
    rpcArgs = args;
    return {
      data: {
        campaigns: [],
        members: [],
        publications: [],
        hasMore: false,
        periodDays: 30,
      },
      error: null,
    };
  }) as never;
  await t.test(
    "a viewer cannot create or pause campaigns or read store totals",
    async () => {
      role = "VIEWER";
      assert.equal(
        (await api.POST(req("campaigns", { storeId: store, title: "x" })))
          .status,
        403,
      );
      assert.equal(
        (
          await api.PATCH(
            req(
              "campaigns",
              { storeId: store, id: cid, active: false },
              "PATCH",
            ),
          )
        ).status,
        403,
      );
      assert.equal(
        (await report.GET(req(`campaign-results?storeId=${store}&scope=store`)))
          .status,
        403,
      );
      role = "OWNER";
    },
  );
  await t.test(
    "gestor listing is restricted to active campaigns in its store",
    async () => {
      seen.length = 0;
      assert.equal(
        (await api.GET(req(`campaigns?storeId=${store}`))).status,
        200,
      );
      assert.ok(
        seen.some(
          (x) =>
            x.table === "shareapp_campaigns" &&
            x.args[0] === "store_id" &&
            x.args[1] === store,
        ),
      );
      assert.ok(
        seen.some(
          (x) =>
            x.table === "shareapp_campaigns" &&
            x.args[0] === "active" &&
            x.args[1] === true,
        ),
      );
    },
  );
  await t.test(
    "foreign poster paths and foreign target products are rejected",
    async () => {
      const b = {
        storeId: store,
        title: "Oferta",
        posterPath: `${store}/${file}`,
        kind: "product",
        itemId: cid,
      };
      assert.equal(
        (
          await api.POST(
            req("campaigns", { ...b, posterPath: `${uid}/${file}` }),
          )
        ).status,
        400,
      );
      targetAvailable = false;
      assert.equal((await api.POST(req("campaigns", b))).status, 404);
      targetAvailable = true;
    },
  );
  await t.test(
    "owner creates a campaign with an existing owned poster",
    async () => {
      assert.equal(
        (
          await api.POST(
            req("campaigns", {
              storeId: store,
              title: "Oferta",
              body: "Texto",
              posterPath: `${store}/${file}`,
              kind: "store",
            }),
          )
        ).status,
        200,
      );
      assert.equal(inserted.store_id, store);
    },
  );
  await t.test(
    "campaign publication binds the authenticated member and server destination",
    async () => {
      inserted = {};
      const response = await links.POST(
        req("links", {
          storeId: store,
          campaignId: cid,
          memberId: uid,
          kind: "product",
          itemId: uid,
          title: "Mi publicación",
          body: "Mi texto",
          network: "whatsapp",
        }),
      );
      assert.equal(response.status, 200);
      assert.equal(inserted.member_id, mid);
      assert.equal(inserted.campaign_id, cid);
      assert.equal(inserted.kind, "store");
      assert.equal(inserted.item_id, null);
      const row = await response.json();
      assert.ok(row.url.includes("/r/"));
    },
  );
  await t.test(
    "report ignores forged memberId and filters the real gestor",
    async () => {
      assert.equal(
        (
          await report.GET(
            req(
              `campaign-results?storeId=${store}&memberId=${uid}&campaignId=${cid}`,
            ),
          )
        ).status,
        200,
      );
      assert.equal(rpcArgs.p_member_id, mid);
      assert.equal(rpcArgs.p_store_id, store);
      assert.equal(rpcArgs.p_campaign_id, cid);
      await report.GET(req(`campaign-results?storeId=${store}&scope=store`));
      assert.equal(rpcArgs.p_member_id, null);
    },
  );
  await t.test(
    "poster preview preserves personal URL without recording a visit",
    async () => {
      const r = await preview.GET(
        new NextRequest(`https://perlamarketplace.com/r/${"a".repeat(48)}`, {
          headers: { "user-agent": "WhatsApp/2.0" },
        }),
        { params: Promise.resolve({ code: "a".repeat(48) }) },
      );
      assert.equal(r.status, 200);
      const html = await r.text();
      assert.ok(html.includes("Póster de oferta"));
      assert.ok(html.includes(`/shareapp-campaigns/${store}/${file}`));
      assert.ok(html.includes(`/r/${"a".repeat(48)}`));
      assert.equal(r.headers.get("set-cookie"), null);
    },
  );
  await t.test(
    "paused campaigns cannot issue links or serve public previews",
    async () => {
      campaignActive = false;
      assert.equal(
        (
          await links.POST(
            req("links", { storeId: store, campaignId: cid, kind: "store" }),
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await preview.GET(
            new NextRequest("https://perlamarketplace.com/r/" + "a".repeat(48)),
            { params: Promise.resolve({ code: "a".repeat(48) }) },
          )
        ).status,
        404,
      );
      campaignActive = true;
    },
  );
  await t.test(
    "poster upload validates bytes and converts to JPEG",
    async () => {
      const form = new FormData();
      form.set(
        "poster",
        new File(["<svg>bad</svg>"], "bad.jpg", { type: "image/jpeg" }),
      );
      const bad = await upload.POST(
        new NextRequest(
          `https://example.com/api/shareapp/campaigns/poster?storeId=${store}`,
          {
            method: "POST",
            headers: { Authorization: "Bearer fixture" },
            body: form,
          },
        ),
      );
      assert.equal(bad.status, 400);
      assert.equal(uploadCount, 0);
      const sharp = (await import("sharp")).default;
      const image = await sharp({
        create: { width: 4, height: 4, channels: 3, background: "red" },
      })
        .png()
        .toBuffer();
      const good = new FormData();
      good.set(
        "poster",
        new File([new Uint8Array(image)], "poster.png", { type: "image/png" }),
      );
      assert.equal(
        (
          await upload.POST(
            new NextRequest(
              `https://example.com/api/shareapp/campaigns/poster?storeId=${store}`,
              {
                method: "POST",
                headers: { Authorization: "Bearer fixture" },
                body: good,
              },
            ),
          )
        ).status,
        200,
      );
      assert.equal(uploadCount, 1);
    },
  );
});
