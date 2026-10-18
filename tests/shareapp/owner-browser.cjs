const { chromium } = require(
  process.env.SHAREAPP_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const storeId = "11111111-1111-4111-8111-111111111111",
    userId = "22222222-2222-4222-8222-222222222222";
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const token = `${enc({ alg: "HS256" })}.${enc({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`;
  await page.addInitScript(
    ({ token, userId }) => {
      localStorage.setItem(
        "sb-test-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "fixture",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: "bearer",
          user: {
            id: userId,
            email: "owner@tienda.test",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: "2026-01-01",
          },
        }),
      );
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: async (value) => (window.__copied = value) },
        configurable: true,
      });
    },
    { token, userId },
  );
  const store = {
    id: storeId,
    name: "Tienda de ejemplo",
    slug: "demo",
    is_active: true,
    module_store_enabled: true,
    primary_color: "#6551db",
    secondary_color: "#151d35",
  };
  await page.route("https://test.supabase.co/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path.endsWith("/user"))
      data = {
        id: userId,
        email: "owner@tienda.test",
        user_metadata: { full_name: "Dueño de tienda" },
      };
    if (path.endsWith("/profiles"))
      data = {
        id: userId,
        email: "owner@tienda.test",
        full_name: "Dueño de tienda",
        role: "store_owner",
        active: true,
      };
    if (path.endsWith("/store_users"))
      data = {
        id: "membership",
        store_id: storeId,
        user_id: userId,
        role: "OWNER",
        active: true,
        permissions: {},
        stores: store,
      };
    if (path.endsWith("/stores")) data = store;
    const single = route.request().headers().accept?.includes("object");
    if (!Array.isArray(data) && !single && !path.endsWith("/user"))
      data = [data];
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  let settings = { enabled: true, attribution_days: 7 };
  const members = [
    {
      id: "m1",
      display_name: "Ana Martínez",
      email: "ana@tienda.test",
      active: true,
      user_id: "u1",
      password_pending: false,
    },
    {
      id: "m2",
      display_name: "Diego Pérez",
      email: "diego@tienda.test",
      active: true,
      user_id: "u2",
      password_pending: true,
    },
    {
      id: "m3",
      display_name: "Sofía Ramos",
      email: "sofia@tienda.test",
      active: false,
      user_id: "u3",
      password_pending: false,
    },
  ];
  const rows = [
    {
      member_id: "m1",
      display_name: "Ana Martínez",
      visits: 124,
      product_views: 87,
      orders: 12,
      paid_orders: 9,
      paid_total: 385.5,
    },
    {
      member_id: "m2",
      display_name: "Diego Pérez",
      visits: 21,
      product_views: 16,
      orders: 3,
      paid_orders: 1,
      paid_total: 42,
    },
    {
      member_id: "m3",
      display_name: "Sofía Ramos",
      visits: 9,
      product_views: 4,
      orders: 0,
      paid_orders: 0,
      paid_total: 0,
    },
  ];
  const writes = [];
  await page.route("**/api/shareapp/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname.split("/").pop();
    let data;
    if (req.method() !== "GET") writes.push({ path, body: req.postDataJSON() });
    if (path === "members") {
      if (req.method() === "PATCH") {
        const body = req.postDataJSON();
        if (body.memberId)
          members.find((m) => m.id === body.memberId).active = body.active;
        else
          settings = {
            enabled: body.enabled,
            attribution_days: body.attributionDays,
          };
      }
      data = { members, settings };
    } else if (path === "results") data = { results: rows };
    else if (path === "accounts") {
      const body = req.postDataJSON();
      if (!body.memberId)
        members.push({
          id: "m4",
          display_name: body.displayName,
          email: body.email,
          active: true,
          user_id: "u4",
          password_pending: true,
        });
      data = {
        email: body.email,
        activationUrl: "https://example.com/gestores/activar?token=fixture",
      };
    } else data = {};
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto("http://127.0.0.1:3200/admin/marketing/gestores", {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("heading", { name: "Rendimiento general", exact: true })
    .waitFor();
  await page.locator("#panel-resumen").getByText("Ana Martínez", { exact: true }).waitFor();
  assert.ok(await page.getByText("$427.50", { exact: true }).isVisible());
  await page.screenshot({
    path: "/tmp/shareapp-owner-desktop.png",
    fullPage: true,
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `summary overflow ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.screenshot({
    path: "/tmp/shareapp-owner-mobile.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Equipo", exact: false }).click();
  await page.getByLabel("Buscar gestor", { exact: true }).fill("Sofía");
  await page.getByRole("button", { name: "Activar", exact: true }).click();
  await page.getByRole("status").getByText("Cambios guardados.").waitFor();
  assert.equal(members[2].active, true);
  await page.getByLabel("Buscar gestor", { exact: true }).fill("");
  await page.getByLabel("Estado de gestores").selectOption("pendientes");
  assert.ok(
    await page
      .getByRole("heading", { name: "Diego Pérez", exact: true })
      .isVisible(),
  );
  assert.equal(
    await page
      .getByRole("heading", { name: "Ana Martínez", exact: true })
      .count(),
    0,
  );
  await page.getByLabel("Estado de gestores").selectOption("todos");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Lucía Torres");
  await page
    .getByLabel("Correo del gestor", { exact: true })
    .fill("lucia@tienda.test");
  await page
    .getByRole("button", { name: "Crear cuenta de gestor", exact: true })
    .click();
  await page.getByText("Cuenta preparada:", { exact: false }).waitFor();
  assert.ok(
    writes.some(
      (w) =>
        w.path === "accounts" &&
        w.body.storeId === storeId &&
        w.body.displayName === "Lucía Torres",
    ),
  );
  await page
    .getByRole("button", { name: "Cerrar formulario", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "/tmp/shareapp-owner-team.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Configuración", exact: true }).click();
  await page.getByLabel("Plazo de atribución en días").fill("14");
  await page
    .getByRole("button", { name: "Guardar configuración", exact: true })
    .click();
  await page.getByRole("status").getByText("Cambios guardados.").waitFor();
  assert.equal(settings.attribution_days, 14);
  await page.screenshot({
    path: "/tmp/shareapp-owner-settings.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Resumen", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.getByRole("tab", { name: "Equipo", exact: false }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "team overflow 320",
  );
  await page.getByRole("tab", { name: "Configuración", exact: true }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "settings overflow 320",
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "summary real fixture totals",
        "320/390/768/1440 responsive",
        "team search/filter and activation",
        "create account scoped to store",
        "save attribution settings",
        "no page errors",
      ],
    }),
  );
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
