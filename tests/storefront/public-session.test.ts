import test from "node:test";
import assert from "node:assert/strict";

test("public catalog reads do not wait for a blocked admin session refresh", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-public-key";
  const requests: { url: URL; headers: Headers }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({ url, headers: new Headers(init?.headers) });
    assert.equal(url.origin, "https://fixture.supabase.co");
    assert.ok(url.pathname.startsWith("/rest/v1/"));
    const single = new Headers(init?.headers).get("Accept")?.includes("object");
    const isWfCargo = url.pathname.endsWith("/stores") && url.searchParams.get("slug") !== "eq.demo";
    const row = isWfCargo
      ? { id: "item", name: "WF Cago", slug: "wf-cago", is_active: true }
      : { id: "item", name: "Tienda", slug: "demo", is_active: true };
    return new Response(JSON.stringify(single ? row : [row]), {
      headers: { "content-type": "application/json" },
    });
  };
  const { supabase } = await import("../../lib/supabase");
  const products = await import("../../lib/services/products");
  const stores = await import("../../lib/services/stores");
  const settings = await import("../../lib/services/settings");
  const combos = await import("../../lib/services/combos");
  const originalSession = supabase.auth.getSession;
  let release!: (value: { data: { session: null }; error: null }) => void;
  const blocked = new Promise<{ data: { session: null }; error: null }>(
    (resolve) => {
      release = resolve;
    },
  );
  supabase.auth.getSession = () => blocked;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const adminRead = products.getAdminProductsByStoreId("store-a");
    assert.equal(
      await Promise.race([
        adminRead.then(() => "finished"),
        new Promise((r) => setTimeout(() => r("blocked"), 50)),
      ]),
      "blocked",
    );
    const result = await Promise.race([
      Promise.all([
        stores.getStoreByDomain("example.com"),
        stores.getStoreBySlug("demo"),
        stores.getStoreBySubdomain("demo"),
        products.getStoreProductsByStoreId("store-a"),
        products.getStoreProductById("item", "store-a"),
        products.getRelatedProducts("food", "item", 4, "store-a"),
        products.getHomeFeaturedProductsByStoreId("store-a"),
        settings.getPublicStoreSettings("store-a"),
        settings.getPublicActiveCategoriesByStoreId("store-a"),
        settings.getBannersByStoreId("store-a"),
        combos.getActiveCombosByStoreId("store-a"),
        combos.getPublicComboById("item", "store-a"),
      ] as const),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Public reads waited for admin auth")),
          2000,
        );
      }),
    ]);
    assert.equal(result.length, 12);
    assert.equal(result[0]?.name, "WF Cargo Envíos");
    assert.equal(result[0]?.slug, "wf-cago");
    assert.equal(result[1]?.name, "Tienda");
    assert.equal(result[2]?.name, "WF Cargo Envíos");
    for (const request of requests) {
      assert.equal(
        request.headers.get("Authorization"),
        "Bearer fixture-public-key",
      );
      assert.equal(request.headers.get("apikey"), "fixture-public-key");
    }
    const storeRequests = requests.filter((request) => request.url.pathname.endsWith("/stores"));
    assert.equal(storeRequests.length, 3);
    for (const { url } of storeRequests) {
      assert.ok(!url.searchParams.get("select")?.includes("platform_order_fixed_fee"));
    }
    for (const request of requests.filter(
      (r) =>
        r.url.pathname.endsWith("/products") ||
        r.url.pathname.endsWith("/combos"),
    )) {
      assert.equal(request.url.searchParams.get("store_id"), "eq.store-a");
      assert.equal(request.url.searchParams.get("is_active"), "eq.true");
      assert.equal(request.url.searchParams.get("deleted_at"), "is.null");
    }
    release({ data: { session: null }, error: null });
    await adminRead;
  } finally {
    if (timeout) clearTimeout(timeout);
    release({ data: { session: null }, error: null });
    supabase.auth.getSession = originalSession;
    globalThis.fetch = originalFetch;
  }
});
