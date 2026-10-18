const { chromium } = require(
  process.env.SHAREAPP_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.SHAREAPP_BASE_URL || "http://127.0.0.1:3200";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  async function screenshot(name) {
    if (process.env.SHAREAPP_SCREENSHOTS) {
      fs.mkdirSync(process.env.SHAREAPP_SCREENSHOTS, { recursive: true });
      await page.screenshot({
        path: require("node:path").join(process.env.SHAREAPP_SCREENSHOTS, name),
        fullPage: true,
      });
    }
  }
  await page.goto(`${base}/gestores`, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Entrar a ShareAPP", exact: true })
    .waitFor();
  await screenshot("login-desktop.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot("login-mobile.png");
  const loginButton = await page
    .getByRole("button", { name: "Entrar a ShareAPP", exact: true })
    .boundingBox();
  assert.ok(loginButton.y + loginButton.height < 844, "login fits on mobile");
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const userId = "22222222-2222-4222-8222-222222222222";
  const storeId = "11111111-1111-4111-8111-111111111111";
  const jwt = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`;
  await page.addInitScript(
    ({ jwt, userId }) => {
      if (sessionStorage.getItem("fixture-auth-initialized")) return;
      sessionStorage.setItem("fixture-auth-initialized", "yes");
      localStorage.setItem(
        "perla-shareapp-auth-v1",
        JSON.stringify({
          access_token: jwt,
          refresh_token: "fixture",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: "bearer",
          user: {
            id: userId,
            email: "ana@example.com",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        }),
      );
    },
    { jwt, userId },
  );
  await page.addInitScript(() => {
    window.__shared = [];
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data) => {
        window.__shared.push({
          url: data.url,
          text: data.text,
          files: data.files?.map((f) => ({
            name: f.name,
            type: f.type,
            size: f.size,
          })),
        });
      },
    });
  });
  const fixturePhoto = await require("sharp")({
    create: { width: 160, height: 160, channels: 3, background: "#6252d8" },
  })
    .jpeg()
    .toBuffer();
  await page.route("**/r/*/image", (route) =>
    route.fulfill({ body: fixturePhoto, contentType: "image/jpeg" }),
  );
  let posts = [];
  await page.route("**/api/shareapp/**", async (route) => {
    const r = route.request();
    const url = new URL(r.url());
    const path = url.pathname.split("/").pop();
    let data;
    if (path === "me")
      data = {
        id: userId,
        fullName: "Ana Martínez",
        email: "ana@example.com",
        passwordPending: false,
      };
    else if (path === "stores")
      data = {
        memberships: [
          {
            id: "m1",
            store_id: storeId,
            display_name: "Ana",
            stores: { name: "Águila Express USA" },
          },
          {
            id: "m2",
            store_id: "44444444-4444-4444-8444-444444444444",
            display_name: "Ana",
            stores: { name: "Segunda tienda" },
          },
        ],
      };
    else if (path === "catalog")
      data = {
        items: [
          {
            id: "55555555-5555-4555-8555-555555555555",
            name: "Arroz importado · Bolsa de 5 libras",
            price: 7.5,
            description: "Arroz de grano largo para toda la familia.",
            stock: 12,
            image_url: "/shareapp/mark.svg",
            category: "Alimentos",
          },
          {
            id: "66666666-6666-4666-8666-666666666666",
            name: "Leche en polvo · Bolsa de 400 g",
            price: 6.5,
            stock: 28,
            image_url: null,
            category: "Lácteos",
          },
          {
            id: "77777777-7777-4777-8777-777777777777",
            name: "Cerveza Cristal · 12 latas",
            price: 13,
            stock: 0,
            image_url: null,
            category: "Bebidas",
          },
        ],
        hasMore: false,
      };
    else if (path === "results")
      data = {
        results: [
          {
            member_id: "m1",
            display_name: "Ana",
            visits: 42,
            product_views: 36,
            orders: 5,
            paid_orders: 3,
            paid_total: 85.5,
          },
        ],
      };
    else if (path === "links" && r.method() === "GET")
      data = { publications: posts, hasMore: false };
    else if (path === "links" && r.method() === "POST") {
      const b = r.postDataJSON();
      data = {
        ...b,
        id: "88888888-8888-4888-8888-888888888888",
        item_id: b.itemId,
        url: "https://example.com/r/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      posts.unshift(data);
    } else if (path === "links" && r.method() === "PATCH") {
      const b = r.postDataJSON();
      posts = posts.map((p) => (p.id === b.id ? { ...p, ...b } : p));
      data = posts.find((p) => p.id === b.id);
    } else data = { ok: true };
    await route.fulfill({ json: data });
  });
  await page.reload({ waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Crear publicación", exact: true })
    .first()
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Crear publicación", exact: true })
      .last()
      .isDisabled(),
    true,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await screenshot("catalog-mobile.png");
  await page
    .getByRole("button", { name: "Crear publicación", exact: true })
    .first()
    .click();
  await page
    .getByRole("heading", { name: "Nueva publicación", exact: true })
    .waitFor();
  const draftEditor = page.getByRole("region", {
    name: "Editor de publicación",
  });
  await draftEditor.getByRole("img", { name: /Foto de Arroz/ }).waitFor();
  assert.equal(
    new URL(
      await draftEditor
        .getByRole("img", { name: /Foto de Arroz/ })
        .getAttribute("src"),
      base,
    ).pathname,
    "/shareapp/mark.svg",
  );
  assert.equal(
    await draftEditor
      .getByRole("button", { name: "Compartir publicación", exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("textbox", { name: "Texto de la publicación" })
    .fill("Arroz de calidad para tu hogar. Consulta disponibilidad y entrega.");
  await page
    .getByRole("button", { name: "Guardar publicación", exact: true })
    .click();
  await page
    .getByText(
      "Publicación guardada. Comparte tu enlace o la imagen con texto.",
    )
    .waitFor();
  assert.equal(posts.length, 1);
  await page
    .locator("article")
    .getByRole("img", { name: /Foto de Arroz/ })
    .waitFor();
  assert.ok(
    (
      await page
        .locator("article")
        .getByRole("img", { name: /Foto de Arroz/ })
        .getAttribute("src")
    ).includes("/r/" + "a".repeat(48) + "/image"),
  );
  assert.ok(posts[0].body.includes("Arroz de calidad"));
  const editor = page.getByRole("region", { name: "Editor de publicación" });
  await editor
    .getByRole("button", { name: "Compartir publicación", exact: true })
    .click();
  let shared = await page.evaluate(() => window.__shared);
  assert.equal(shared.length, 1);
  assert.equal(shared[0].url, posts[0].url);
  assert.equal(shared[0].files, undefined);
  assert.ok(!shared[0].text.includes(posts[0].url));
  await page
    .getByText("Compartir foto en Instagram, estados o historias", {
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Enviar foto adjunta", exact: true })
    .click();
  shared = await page.evaluate(() => window.__shared);
  assert.equal(shared[1].files[0].type, "image/jpeg");
  assert.ok(shared[1].text.includes(posts[0].url));
  await screenshot("publications-mobile.png");
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `photo editor width ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("textbox", { name: "Texto de la publicación" })
    .fill("Borrador conservado entre secciones.");
  await page.getByRole("button", { name: "Mi cuenta", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Actualizar aplicación", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByText("Guarda los cambios de tu publicación", { exact: false })
    .waitFor();
  await page.getByRole("button", { name: "Resultados", exact: true }).click();
  await page
    .getByRole("button", { name: "Publicaciones", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Texto de la publicación" })
      .inputValue(),
    "Borrador conservado entre secciones.",
  );
  assert.equal(
    await page
      .getByRole("region", { name: "Editor de publicación" })
      .getByRole("button", { name: "Compartir publicación", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByRole("button", { name: "Guardar publicación", exact: true })
    .click();
  await page.getByRole("button", { name: "Resultados", exact: true }).click();
  await page.getByText("85.50", { exact: true }).waitFor();
  await screenshot("results-mobile.png");
  await page.getByRole("button", { name: "Mi cuenta", exact: true }).click();
  await page
    .getByRole("heading", { name: "Ana Martínez", exact: true })
    .waitFor();
  assert.ok(
    await page.getByText("ana@example.com", { exact: true }).last().isVisible(),
  );
  await page
    .getByText("Instalar ShareAPP en mi dispositivo", { exact: true })
    .click();
  await page
    .getByText("Añadir a pantalla de inicio", { exact: false })
    .waitFor();
  const update = page.getByRole("button", {
    name: "Actualizar aplicación",
    exact: true,
  });
  assert.equal(await update.isEnabled(), true);
  await page
    .getByRole("button", { name: "Cambiar contraseña", exact: true })
    .click();
  assert.equal(await update.isDisabled(), true);
  await page
    .getByRole("button", { name: "Cancelar cambio", exact: true })
    .click();
  await context.setOffline(true);
  assert.equal(await update.isDisabled(), true);
  await context.setOffline(false);
  await page.evaluate(() =>
    localStorage.setItem("refresh-preservation-check", "keep"),
  );
  const beforeReload = await page.evaluate(() => ({
    auth: localStorage.getItem("perla-shareapp-auth-v1"),
    url: location.href,
  }));
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    update.click(),
  ]);
  await page
    .getByRole("heading", { name: "Ana Martínez", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("refresh-preservation-check"),
    ),
    "keep",
  );
  assert.equal(page.url(), beforeReload.url);
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("perla-shareapp-auth-v1"))
          .refresh_token,
    ),
    JSON.parse(beforeReload.auth).refresh_token,
  );
  await screenshot("account-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Catálogo", exact: true }).click();
  await page
    .getByRole("button", { name: "Crear publicación", exact: true })
    .first()
    .waitFor();
  await screenshot("catalog-desktop.png");
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `width ${width}`,
    );
  }
  const manifest = await (
    await page.request.get(`${base}/gestores/manifest.webmanifest`)
  ).json();
  assert.equal(manifest.scope, "/gestores");
  assert.ok(manifest.start_url.startsWith(manifest.scope));
  console.log(
    "Worker status",
    await page.evaluate(async () => {
      try {
        const r = await navigator.serviceWorker.register("/gestores/sw.js", {
          scope: "/gestores",
        });
        return {
          scope: r.scope,
          active: r.active?.state,
          installing: r.installing?.state,
          waiting: r.waiting?.state,
        };
      } catch (e) {
        return { error: String(e) };
      }
    }),
  );
  await page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(Error("Worker not ready")), 8000),
      ),
    ]),
  );
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  assert.ok(
    await page.evaluate(async () =>
      Boolean(await caches.match("/shareapp/offline.html")),
    ),
  );
  await context.serviceWorkers()[0].evaluate(() => {
    self.fetch = () =>
      Promise.reject(new TypeError("Simulated network failure"));
  });
  await context.setOffline(true);
  await page.goto(`${base}/gestores?offline-check=1`, {
    waitUntil: "domcontentloaded",
  });
  await screenshot("offline.png");
  await page
    .getByRole("heading", { name: "Volvemos cuando tengas conexión." })
    .waitFor();
  assert.equal(
    await page.getByText("Ana Martínez", { exact: true }).count(),
    0,
  );
  await context.setOffline(false);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "login desktop/mobile",
        "catalog and out-of-stock",
        "saved publication",
        "results",
        "account and install guide",
        "app reload preserves URL/session/storage; blocked for unsaved draft, password form and offline",
        "no horizontal overflow",
        "manifest and scoped worker",
        "offline fallback contains no account data",
      ],
      pageErrors: errors,
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
