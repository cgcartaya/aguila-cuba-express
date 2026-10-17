import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { validPassword, tokenHash } from "../../lib/shareapp/accounts";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
const storeId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
const createdId = "33333333-3333-4333-8333-333333333333";
const req = (path: string, body?: unknown) =>
  new NextRequest(`https://perlamarketplace.com/api/shareapp/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: "Bearer test" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
function chain(
  data: unknown,
  observe?: (method: string, value: unknown) => void,
) {
  const q = {
    select: () => q,
    eq: (a: unknown, b: unknown) => {
      observe?.("eq", [a, b]);
      return q;
    },
    is: () => q,
    gt: () => q,
    not: () => q,
    insert: (value: unknown) => {
      observe?.("insert", value);
      return q;
    },
    update: (value: unknown) => {
      observe?.("update", value);
      return q;
    },
    maybeSingle: async () => ({ data, error: null }),
    single: async () => ({ data, error: null }),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve),
  };
  return q;
}
test("managed account security", async (t) => {
  const { db, user } = await import("../../lib/shareapp/server");
  const { POST: accounts } =
    await import("../../app/api/shareapp/accounts/route");
  const { POST: activate } =
    await import("../../app/api/shareapp/activation/route");
  const { POST: password } =
    await import("../../app/api/shareapp/password/route");
  const { GET: me } = await import("../../app/api/shareapp/me/route");
  db.auth.getUser = (async () => ({
    data: {
      user: {
        id: actorId,
        email: "ana@example.com",
        user_metadata: { full_name: "Ana" },
      },
    },
    error: null,
  })) as never;
  const ownerQueries = (table: string) => {
    if (table === "profiles")
      return chain({ active: true, role: "store_owner" });
    if (table === "store_users") return chain({ role: "OWNER" });
    if (table === "shareapp_accounts") return chain(null);
    if (table === "stores") return chain({ id: storeId });
    throw new Error(`Unexpected ${table}`);
  };
  await t.test("personal password policy and token storage", () => {
    assert.ok(validPassword("Personal12345"));
    assert.ok(!validPassword("short1"));
    assert.ok(!validPassword("abcdefghijklm"));
    assert.equal(tokenHash("a".repeat(64)).length, 64);
    assert.notEqual(tokenHash("a".repeat(64)), "a".repeat(64));
  });
  await t.test("existing account passwords are never overwritten", async () => {
    db.from = ownerQueries as never;
    let updated = false;
    db.auth.admin.createUser = (async () => ({
      data: { user: null },
      error: { code: "email_exists", status: 422 },
    })) as never;
    db.auth.admin.updateUserById = (async () => {
      updated = true;
      throw Error("must not overwrite");
    }) as never;
    const result = await accounts(
      req("accounts", {
        storeId,
        displayName: "Ana",
        email: "ANA@example.com",
      }),
    );
    assert.equal(result.status, 409);
    assert.equal(updated, false);
  });
  await t.test(
    "new managed account has no administrative grants and requires setup",
    async () => {
      let pending = false;
      let privateHash = "";
      let adminGrant = false;
      db.from = ((table: string) => {
        if (["profiles", "store_users"].includes(table))
          return ownerQueries(table);
        if (table === "stores") return chain({ id: storeId });
        if (table === "shareapp_accounts")
          return chain(null, (method, value) => {
            if (method === "insert") {
              const row = value as {
                password_pending: boolean;
                setup_token_hash: string;
              };
              pending = row.password_pending;
              privateHash = row.setup_token_hash;
            }
          });
        if (table === "shareapp_members") return chain({ id: "membership" });
        adminGrant = true;
        throw Error(`Unexpected ${table}`);
      }) as never;
      db.auth.admin.createUser = (async (params: unknown) => {
        const p = params as { user_metadata: Record<string, unknown> };
        assert.equal(p.user_metadata.role, undefined);
        return { data: { user: { id: createdId } }, error: null };
      }) as never;
      const response = await accounts(
        req("accounts", {
          storeId,
          displayName: "Ana",
          email: "ana@example.com",
        }),
      );
      assert.equal(response.status, 200);
      const data = await response.json();
      const raw = new URL(data.activationUrl).hash.split("=")[1];
      assert.equal(privateHash, tokenHash(raw));
      assert.ok(pending);
      assert.equal(adminGrant, false);
    },
  );
  await t.test(
    "pending identity can inspect itself but cannot access catalog APIs",
    async () => {
      db.from = ((table: string) =>
        table === "profiles"
          ? chain(null)
          : chain({ password_pending: true })) as never;
      await assert.rejects(() => user(req("catalog")), /Define tu contraseña/);
      const response = await me(req("me"));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).passwordPending, true);
    },
  );
  await t.test(
    "expired activation never updates an Auth password",
    async () => {
      db.from = (() => chain(null)) as never;
      let changed = false;
      db.auth.admin.updateUserById = (async () => {
        changed = true;
        return { error: null };
      }) as never;
      assert.equal(
        (
          await activate(
            req("activation", {
              token: "b".repeat(64),
              password: "Personal12345",
            }),
          )
        ).status,
        410,
      );
      assert.equal(changed, false);
    },
  );
  await t.test(
    "activation must acquire a one-use claim before password mutation",
    async () => {
      let calls = 0,
        changed = false;
      db.from = ((table: string) => {
        if (table === "shareapp_members") return chain({ id: "member" });
        calls++;
        return chain(
          calls === 1
            ? {
                user_id: createdId,
                email: "ana@example.com",
                created_store_id: storeId,
              }
            : null,
        );
      }) as never;
      db.auth.admin.updateUserById = (async () => {
        changed = true;
        return { error: null };
      }) as never;
      assert.equal(
        (
          await activate(
            req("activation", {
              token: "b".repeat(64),
              password: "Personal12345",
            }),
          )
        ).status,
        409,
      );
      assert.equal(changed, false);
    },
  );
  await t.test(
    "activation is consumed after a successful password setup",
    async () => {
      let consumed = false,
        mutations = 0;
      db.from = ((table: string) => {
        if (table === "shareapp_members") return chain({ id: "membership" });
        const q = chain(
          consumed
            ? null
            : {
                user_id: createdId,
                email: "ana@example.com",
                created_store_id: storeId,
              },
        );
        const original = q.update;
        q.update = (value: unknown) => {
          if (
            (value as { password_pending?: boolean }).password_pending === false
          )
            consumed = true;
          return original(value);
        };
        return q;
      }) as never;
      db.auth.admin.updateUserById = (async () => {
        mutations++;
        return { error: null };
      }) as never;
      const payload = { token: "c".repeat(64), password: "Personal12345" };
      assert.equal((await activate(req("activation", payload))).status, 200);
      assert.equal((await activate(req("activation", payload))).status, 410);
      assert.equal(mutations, 1);
    },
  );
  await t.test(
    "self-service password changes cannot target another userId",
    async () => {
      db.from = ((table: string) =>
        table === "profiles" ? chain(null) : chain(null)) as never;
      let target = "";
      db.auth.admin.updateUserById = (async (id: string) => {
        target = id;
        return { error: null };
      }) as never;
      assert.equal(
        (
          await password(
            req("password", { userId: createdId, password: "Personal12345" }),
          )
        ).status,
        200,
      );
      assert.equal(target, actorId);
    },
  );
});
