const { chromium } = require(
  process.env.SHAREAPP_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--host-resolver-rules=MAP storefront.test 127.0.0.1"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const storeId = "11111111-1111-4111-8111-111111111111";
  const enc = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const expired = {
    access_token: `${enc({ alg: "HS256" })}.${enc({ sub: storeId, exp: 1 })}.fixture`,
    refresh_token: "fixture",
    expires_at: 1,
    token_type: "bearer",
    user: { id: storeId },
  };
  await page.addInitScript(
    (expired) =>
      localStorage.setItem("sb-test-auth-token", JSON.stringify(expired)),
    expired,
  );
  let refreshRequests = 0;
  let failProducts = true;
  await page.route("https://test.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/auth/")) {
      refreshRequests++;
      return;
    }
    const table = url.pathname.split("/").pop();
    if (table === "products" && failProducts)
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "simulated network failure" }),
      });
    const rows = {
      stores: [
        {
          id: storeId,
          name: "Tienda de prueba",
          domain: "storefront.test",
          slug: "demo",
          is_active: true,
          module_store_enabled: true,
          has_landing: true,
        },
      ],
      products: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          store_id: storeId,
          name: "Producto de prueba",
          category: "Alimentos",
          price: 10,
          stock: 4,
          is_active: true,
          product_images: [],
          is_home_featured: true,
        },
      ],
      categories: [
        {
          id: "c1",
          store_id: storeId,
          name: "Alimentos",
          slug: "alimentos",
          is_active: true,
          sort_order: 0,
        },
      ],
      store_settings: [
        {
          id: "s1",
          store_id: storeId,
          show_products: true,
          show_featured_products: true,
          show_categories: true,
          show_hero: false,
          hide_products_without_images: false,
        },
      ],
      combos: [],
      banners: [],
    };
    const data = rows[table] || [];
    const single = route.request().headers().accept?.includes("object");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(single ? data[0] || null : data),
    });
  });
  await page.goto("http://storefront.test:3200/tienda", {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("button", { name: "Reintentar carga", exact: true })
    .waitFor();
  assert.ok(
    refreshRequests > 0,
    "expired admin session refresh is still pending",
  );
  failProducts = false;
  await page
    .getByRole("button", { name: "Reintentar carga", exact: true })
    .click();
  await page.getByText("Producto de prueba", { exact: true }).first().waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Reintentar carga", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("sb-test-auth-token")).refresh_token,
    ),
    "fixture",
  );
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page
        .getByText("Producto de prueba", { exact: true })
        .first()
        .isVisible(),
    );
  }
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "expired admin refresh pending while catalog loads",
        "public API error and retry recover products",
        "session retained",
        "mobile and desktop",
      ],
    }),
  );
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
