import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
const storeId = "11111111-1111-4111-8111-111111111111",
  userId = "22222222-2222-4222-8222-222222222222",
  memberId = "33333333-3333-4333-8333-333333333333",
  linkId = "44444444-4444-4444-8444-444444444444";
function query(
  data: unknown,
  observe?: (method: string, args: unknown[]) => void,
) {
  const q = {
    select: () => q,
    eq: (...args: unknown[]) => {
      observe?.("eq", args);
      return q;
    },
    is: () => q,
    order: () => q,
    range: () => q,
    update: (...args: unknown[]) => {
      observe?.("update", args);
      return q;
    },
    maybeSingle: async () => ({ data, error: null }),
    then: (resolve: (result: unknown) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve),
  };
  return q;
}
function request(method: string, body?: unknown) {
  return new NextRequest(
    `https://example.com/api/shareapp/links?storeId=${storeId}&memberId=victim`,
    {
      method,
      headers: { Authorization: "Bearer test" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
}
test("saved publications remain scoped to the authenticated gestor", async (t) => {
  const { db } = await import("../../lib/shareapp/server");
  const { GET, PATCH, POST } =
    await import("../../app/api/shareapp/links/route");
  db.auth.getUser = (async () => ({
    data: { user: { id: userId, email: "ana@example.com" } },
    error: null,
  })) as never;
  const base = (table: string) => {
    if (table === "profiles" || table === "shareapp_accounts")
      return query(null);
    if (table === "shareapp_members")
      return query({ id: memberId, store_id: storeId });
    if (table === "shareapp_settings") return query({ enabled: true });
    if (table === "stores")
      return query({
        id: storeId,
        slug: "demo",
        is_active: true,
        module_store_enabled: true,
      });
    throw Error(`Unexpected ${table}`);
  };
  await t.test("history ignores caller-supplied memberId", async () => {
    const filters: unknown[][] = [];
    db.from = ((table: string) =>
      table === "shareapp_links"
        ? query(
            [{ id: linkId, code: "a".repeat(48), body: "Saved copy" }],
            (method, args) => {
              if (method === "eq") filters.push(args);
            },
          )
        : base(table)) as never;
    const response = await GET(request("GET"));
    assert.equal(response.status, 200);
    assert.ok(
      filters.some(([key, value]) => key === "member_id" && value === memberId),
    );
    assert.ok(
      filters.some(([key, value]) => key === "store_id" && value === storeId),
    );
    const data = await response.json();
    assert.equal(data.publications[0].body, "Saved copy");
    assert.ok(
      data.publications[0].url.startsWith("https://perlamarketplace.com/r/"),
    );
  });
  await t.test("editing another gestor's link returns not found", async () => {
    const filters: unknown[][] = [];
    db.from = ((table: string) =>
      table === "shareapp_links"
        ? query(null, (method, args) => {
            if (method === "eq") filters.push(args);
          })
        : base(table)) as never;
    assert.equal(
      (await PATCH(request("PATCH", { storeId, id: linkId, body: "Attack" })))
        .status,
      404,
    );
    assert.ok(
      filters.some(([key, value]) => key === "member_id" && value === memberId),
    );
  });
  await t.test(
    "ownership and attribution identifiers cannot be reassigned while editing",
    async () => {
      let update: Record<string, unknown> = {};
      db.from = ((table: string) =>
        table === "shareapp_links"
          ? query({ id: linkId, code: "a".repeat(48) }, (method, args) => {
              if (method === "update")
                update = args[0] as Record<string, unknown>;
            })
          : base(table)) as never;
      const response = await PATCH(
        request("PATCH", {
          storeId,
          id: linkId,
          title: "My copy",
          body: "New body",
          member_id: "victim",
          code: "bad",
          network: "facebook",
          active: false,
        }),
      );
      assert.equal(response.status, 200);
      assert.equal(update.title, "My copy");
      assert.equal(update.active, false);
      assert.equal(update.member_id, undefined);
      assert.equal(update.code, undefined);
      assert.equal(update.network, undefined);
    },
  );
  await t.test(
    "a product from another store cannot get a promotion link",
    async () => {
      db.from = ((table: string) =>
        table === "products" ? query(null) : base(table)) as never;
      assert.equal(
        (
          await POST(
            request("POST", {
              storeId,
              kind: "product",
              itemId: linkId,
              network: "whatsapp",
            }),
          )
        ).status,
        404,
      );
    },
  );
});
