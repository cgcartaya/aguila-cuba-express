import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
const storeId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const memberId = "33333333-3333-4333-8333-333333333333";
const request = (path: string, body?: unknown) =>
  new NextRequest(`https://perlamarketplace.com/api/shareapp/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: "Bearer test" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

function query(data: unknown, error: unknown = null) {
  const response = { data, error };
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    gt: () => chain,
    not: () => chain,
    order: () => chain,
    maybeSingle: async () => response,
    single: async () => response,
    then: (resolve: (result: unknown) => unknown) =>
      Promise.resolve(response).then(resolve),
  };
  return chain;
}

test("ShareAPP API authorization and scope", async (t) => {
  const { db } = await import("../../lib/shareapp/server");
  const { GET: catalog } = await import("../../app/api/shareapp/catalog/route");
  const { POST: members } =
    await import("../../app/api/shareapp/members/route");
  const { GET: results } = await import("../../app/api/shareapp/results/route");
  const { GET: config } = await import("../../app/api/shareapp/config/route");
  db.auth.getUser = (async () => ({
    data: { user: { id: userId } },
    error: null,
  })) as never;

  await t.test(
    "a store viewer cannot invite or administer gestores",
    async () => {
      db.from = ((table: string) => {
        if (table === "profiles")
          return query({ active: true, role: "store_owner" });
        if (table === "store_users") return query({ role: "VIEWER" });
        throw new Error(`Unexpected query/mutation: ${table}`);
      }) as never;
      assert.equal(
        (await members(request("members", { storeId, displayName: "New" })))
          .status,
        403,
      );
    },
  );
  await t.test(
    "membership in another store cannot read its catalog",
    async () => {
      db.from = ((table: string) => {
        if (table === "profiles") return query(null);
        if (table === "shareapp_members") return query(null);
        if (table === "stores")
          return query({
            id: storeId,
            is_active: true,
            module_store_enabled: true,
          });
        throw new Error(`Unexpected catalog read: ${table}`);
      }) as never;
      assert.equal(
        (await catalog(request(`catalog?storeId=${storeId}`))).status,
        403,
      );
    },
  );
  await t.test(
    "gestor results use only the authenticated membership, ignoring caller memberId",
    async () => {
      db.from = ((table: string) => {
        if (table === "profiles") return query(null);
        if (table === "shareapp_members")
          return query({ id: memberId, store_id: storeId });
        if (table === "stores")
          return query({
            id: storeId,
            is_active: true,
            module_store_enabled: true,
          });
        if (table === "shareapp_settings")
          return query({ enabled: true, attribution_days: 7 });
        throw new Error(`Unexpected query: ${table}`);
      }) as never;
      let called = false;
      db.rpc = ((name: string, args: unknown) => {
        called = true;
        assert.equal(name, "shareapp_results");
        assert.deepEqual(args, { p_store_id: storeId, p_member_id: memberId });
        return Promise.resolve({ data: [], error: null });
      }) as never;
      const response = await results(
        request(`results?storeId=${storeId}&memberId=someone-else`),
      );
      assert.equal(response.status, 200);
      assert.ok(called);
    },
  );
  await t.test(
    "public mobile configuration never returns privileged credentials",
    async () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-key";
      const response = await config();
      assert.deepEqual(await response.json(), {
        apiVersion: 1,
        authUrl: "https://test.invalid",
        anonKey: "public-key",
      });
    },
  );
});
