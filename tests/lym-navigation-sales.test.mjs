import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
function load(path, deps = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require: (name) => (name in deps ? deps[name] : require(name)),
    URL,
    URLSearchParams,
    console,
  });
  return module.exports;
}
const access = load("lib/admin/access.ts");
const permissions = load("lib/shipping/permissions.ts");
const navigation = load("lib/admin/navigation-access.ts", {
  "@/lib/admin/access": access,
  "@/lib/shipping/permissions": permissions,
});
const nav = load("lib/admin/nav-config.ts", {
  "@/lib/admin/navigation-access": navigation,
});
const store = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "LYM",
  slug: "lym",
  module_store_enabled: true,
  module_shipping_enabled: true,
  module_menu_enabled: true,
  module_reservas_enabled: true,
};
const actor = "20000000-0000-4000-8000-000000000001";
const membership = (role, overrides = {}) => ({
  id: "membership",
  store_id: store.id,
  user_id: actor,
  role,
  active: true,
  stores: store,
  ...overrides,
});
function paths(role, s = store, extra = {}) {
  return Array.from(
    nav
      .getVisibleAdminSections(s, false, membership(role, extra))
      .flatMap((section) => section.links.map((link) => link.href)),
  );
}

test("limited roles retain only their assigned routes in the same navigation model", () => {
  assert.deepEqual(paths("LYM_SALES"), [
    "/admin/orders",
    "/admin/products",
    "/admin/inventory",
  ]);
  assert.deepEqual(paths("ASSIGNER"), ["/admin/shipping/shipments"]);
  assert.deepEqual(paths("SHIPPING_CATALOG"), [
    "/admin/products",
    "/admin/inventory",
    "/admin/shipping/shipments",
  ]);
  for (const role of ["LYM_SALES", "ASSIGNER", "SHIPPING_CATALOG"]) {
    for (const path of paths(role))
      assert(access.isAssignmentOnlyPath(path, role));
    assert(!paths(role).includes("/admin/settings"));
    assert(!paths(role).includes("/admin/marketing/gestores"));
  }
  assert.deepEqual(
    paths("SHIPPING_CATALOG", { ...store, module_store_enabled: false }),
    ["/admin/shipping/shipments"],
  );
  assert.deepEqual(
    paths("ASSIGNER", { ...store, module_shipping_enabled: false }),
    [],
  );
});
test("owner/admin keep their sections, inactive sessions see none and shipping overrides are respected", () => {
  for (const role of ["OWNER", "ADMIN"]) {
    assert(paths(role).includes("/admin/marketing/gestores"));
    assert(paths(role).includes("/admin/orders"));
  }
  assert.deepEqual(paths("LYM_SALES", store, { active: false }), []);
  assert.equal(nav.getVisibleAdminSections(store, false, null).length, 0);
  assert(
    nav
      .getVisibleAdminSections(store, true, null)
      .flatMap((g) => g.links)
      .some((l) => l.href === "/admin/settings"),
  );
  assert(!paths("DRIVER").includes("/admin/shipping/settings"));
  assert(!paths("VIEWER").includes("/admin/marketing/gestores"));
  assert(
    !paths("OPERATIONS", store, {
      permissions: { "shipping.view": false },
    }).includes("/admin/shipping/trips"),
  );
  assert(
    paths("OPERATIONS", store, {
      permissions: { "shipping.settings": true },
    }).includes("/admin/shipping/settings"),
  );
  assert(
    !navigation.canAccessAdminPath(
      "/admin/products/new",
      membership("ASSIGNER"),
    ),
  );
  assert(
    navigation.canAccessAdminPath(
      "/admin/products/new",
      membership("LYM_SALES"),
    ),
  );
});
function renderNavigation(role) {
  const m = membership(role);
  const calls = { stock: [], menu: [], reservations: [] };
  const deps = {
    "@/lib/admin/nav-config": nav,
    "@/lib/admin/navigation-access": navigation,
    "@/hooks/useStore": {
      useStore: () => ({ store, clearCurrentStore: () => {} }),
    },
    "@/hooks/useAdminAccess": {
      useAdminAccess: () => ({
        access: { storeMembership: m },
        store,
        isSuperAdmin: false,
        loading: false,
      }),
    },
    "@/hooks/useAdminProfile": {
      useAdminProfile: () => ({
        profile: {
          fullName: "Marlen",
          email: "marlen@example.test",
          avatarUrl: null,
        },
      }),
    },
    "@/hooks/useLowStockCount": {
      useLowStockCount: (id) => {
        calls.stock.push(id);
        return 0;
      },
    },
    "@/hooks/usePendingMenuOrdersCount": {
      usePendingMenuOrdersCount: (id) => {
        calls.menu.push(id);
        return 0;
      },
    },
    "@/hooks/usePendingReservationsCount": {
      usePendingReservationsCount: (id) => {
        calls.reservations.push(id);
        return 0;
      },
    },
    "@/lib/admin/theme": load("lib/admin/theme.ts"),
    "@/components/admin/LogoutButton": {
      __esModule: true,
      default: () => React.createElement("button", null, "Cerrar sesión"),
    },
    "@/components/admin/StoreSwitcher": {
      __esModule: true,
      default: () => null,
    },
    "@/components/admin/remittances/RemittanceNotifications": {
      __esModule: true,
      default: () => {
        throw Error("Forbidden notification mounted");
      },
    },
    "next/navigation": {
      usePathname: () =>
        role === "LYM_SALES" ? "/admin/orders" : "/admin/shipping/shipments",
    },
    "next/link": {
      __esModule: true,
      default: ({ children, ...props }) =>
        React.createElement("a", props, children),
    },
  };
  deps["./AdminNavAccordion"] = load(
    "components/admin/nav/AdminNavAccordion.tsx",
    deps,
  );
  deps["./RestaurantAdminNav"] = { __esModule: true, default: () => null };
  const side = load("components/admin/nav/StoreAdminNav.tsx", deps).default;
  const mobile = load(
    "components/admin/nav/StoreAdminMobileMenu.tsx",
    deps,
  ).default;
  const bottom = load(
    "components/admin/MobileAdminBottomNav.tsx",
    deps,
  ).default;
  deps["@/components/admin/nav/StoreAdminNav"] = {
    __esModule: true,
    default: side,
  };
  deps["@/components/admin/nav/StoreAdminMobileMenu"] = {
    __esModule: true,
    default: mobile,
  };
  deps["@/components/admin/MobileAdminBottomNav"] = {
    __esModule: true,
    default: bottom,
  };
  const shell = load(
    "components/admin/layout/StoreAdminShell.tsx",
    deps,
  ).default;
  return {
    shell: renderToStaticMarkup(
      React.createElement(
        shell,
        null,
        React.createElement("p", null, "Contenido de la administración"),
      ),
    ),
    drawer: renderToStaticMarkup(
      React.createElement(mobile, { open: true, onClose: () => {} }),
    ),
    bottom: renderToStaticMarkup(React.createElement(bottom)),
    calls,
  };
}
test("desktop sidebar, mobile drawer and bottom bar share the same role restriction without replacing the admin shell", () => {
  for (const role of ["LYM_SALES", "ASSIGNER", "SHIPPING_CATALOG"]) {
    const result = renderNavigation(role);
    assert(result.shell.includes("w-72"));
    assert(result.shell.includes("xl:ml-72"));
    assert(result.shell.includes("Contenido de la administración"));
    for (const html of [result.shell, result.drawer, result.bottom]) {
      assert(!html.includes('href="/admin/settings"'));
      assert(!html.includes('href="/admin/marketing/gestores"'));
      assert(!html.includes('href="/admin/saas"'));
      assert(!html.includes('href="/admin"'));
      if (role === "LYM_SALES") {
        assert(html.includes('href="/admin/orders"'));
        assert(!html.includes('href="/admin/shipping"'));
      } else assert(html.includes('href="/admin/shipping/shipments"'));
    }
    if (role === "ASSIGNER") {
      assert(!result.shell.includes("Agregar producto"));
      assert(result.calls.stock.every((id) => id === null));
    } else assert(result.shell.includes("Agregar producto"));
    assert(result.calls.menu.every((id) => id === null));
    assert(result.calls.reservations.every((id) => id === null));
  }
});

const model = load("lib/lym/sales-report.ts");
const sellers = [
  { key: "member:pedro", name: "Pedro", role: "Gestor", active: true },
  { key: "user:marlen", name: "Marlen", role: "Tienda física", active: true },
  {
    key: "user:jefa",
    name: "Administradora",
    role: "Jefa / Administración",
    active: true,
  },
  { key: "member:nueva", name: "Nueva gestora", role: "Gestor", active: true },
];
const report = {
  rows: [
    {
      seller_key: "member:pedro",
      seller_name: "Pedro",
      pending: 1,
      confirmed: 2,
      units: 4,
      amount: 100,
    },
    {
      seller_key: "user:marlen",
      seller_name: "Marlen",
      pending: 2,
      confirmed: 3,
      units: 5,
      amount: 90,
    },
    {
      seller_key: "user:jefa",
      seller_name: "Jefa",
      pending: 0,
      confirmed: 1,
      units: 1,
      amount: 25,
    },
    {
      seller_key: "unassigned",
      seller_name: "Sin atribuir",
      pending: 1,
      confirmed: 0,
      units: 0,
      amount: 0,
    },
  ],
  orders: [
    {
      id: "sale-pedro",
      order_number: "LYM-PEDRO",
      seller_key: "member:pedro",
      state: "confirmed",
      origin: "manual",
      date: "2026-11-17T15:00:00Z",
      total: 50,
      created_by: "user:marlen",
    },
    {
      id: "sale-marlen",
      order_number: "LYM-MARLEN",
      seller_key: "user:marlen",
      state: "confirmed",
      origin: "web",
      date: "2026-11-17T15:00:00Z",
      total: 30,
    },
  ],
  legacy_count: 0,
  timezone: "America/Havana",
};
test("sales report preserves commercial attribution, inactive people, zero sales and separate staff/gestor keys", () => {
  const rows = model.salesPeopleRows(sellers, report.rows);
  assert.equal(rows.find((r) => r.key === "member:pedro").confirmed, 2);
  assert.equal(rows.find((r) => r.key === "user:marlen").confirmed, 3);
  assert.equal(rows.find((r) => r.key === "member:nueva").confirmed, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(model.salesTotals(rows))), {
    pending: 4,
    confirmed: 6,
    units: 10,
    amount: 215,
  });
  const historic = model.salesPeopleRows(
    [
      {
        key: "member:inactive",
        name: "Gestora pausada",
        role: "Gestor",
        active: false,
      },
    ],
    [
      {
        seller_key: "member:inactive",
        seller_name: "Anterior",
        confirmed: 2,
        pending: 0,
        units: 3,
        amount: 60,
      },
      {
        seller_key: "member:removed",
        seller_name: "Histórico",
        confirmed: 1,
        pending: 0,
        units: 1,
        amount: 10,
      },
    ],
  );
  assert.equal(historic.find((r) => r.key === "member:inactive").active, false);
  assert.equal(
    historic.find((r) => r.key === "member:removed").name,
    "Histórico",
  );
  assert.equal(
    model.currentSalesMonth(new Date("2026-12-01T03:30:00Z")),
    "2026-11",
  );
});
function renderSales(person = "") {
  const overrides = {
    0: "2026-11",
    1: { sellers, report },
    2: false,
    5: person,
  };
  let i = 0;
  const hooks = {
    ...React,
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useState: (initial) => {
      const index = i++;
      return [
        index in overrides
          ? overrides[index]
          : typeof initial === "function"
            ? initial()
            : initial,
        () => {},
      ];
    },
  };
  const { default: Component } = load("components/lym/LymSalesReport.tsx", {
    react: hooks,
    "@/lib/lym/client": { lymFetch: async () => {} },
    "@/lib/lym/sales-report": model,
  });
  return renderToStaticMarkup(
    React.createElement(Component, { storeId: store.id }),
  );
}
test("monthly sales view renders each responsible person and filters order detail by seller rather than processor", () => {
  const html = renderSales();
  for (const text of [
    "Ventas por persona",
    "Pedro",
    "Marlen",
    "Administradora",
    "Nueva gestora",
    "Sin atribuir",
    "Ventas confirmadas",
    "Solicitudes pendientes",
    "$215.00",
    "Manual",
    "Web",
    "2026-11",
    "Mes y año",
  ])
    assert(html.includes(text), text);
  const pedro = renderSales("member:pedro");
  assert(pedro.includes("LYM-PEDRO"));
  assert(!pedro.includes("LYM-MARLEN"));
  assert(pedro.includes("/admin/orders?orderId=sale-pedro"));
  assert(pedro.includes("Total del filtro"));
});

const { NextResponse } = require("next/server");
function apiDatabase({
  role = "OWNER",
  slug = "lym",
  active = true,
  operational = false,
} = {}) {
  const calls = [];
  return {
    calls,
    auth: {
      getUser: async (token) => ({
        data: { user: token === "valid" ? { id: actor } : null },
      }),
    },
    rpc: async (name, args) => {
      calls.push({ rpc: name, args });
      return { data: report };
    },
    from(table) {
      if (!operational && ["orders", "products"].includes(table))
        throw Error("Read-only sales view must not fetch operational tables");
      const rows =
        table === "shareapp_members"
          ? [{ id: "pedro", display_name: "Pedro", active: true }]
          : table === "store_users"
            ? [
                { user_id: actor, role: "OWNER", active: true },
                { user_id: "marlen", role: "LYM_SALES", active: true },
              ]
            : table === "profiles"
              ? [
                  { id: actor, full_name: "Administradora", active: true },
                  { id: "marlen", full_name: "Marlen", active: true },
                ]
              : [];
      let single =
        table === "profiles"
          ? { role: "store_owner", active }
          : table === "stores"
            ? { ...store, slug, is_active: true }
            : table === "store_users"
              ? { role, active }
              : null;
      const b = {
        select() {
          return b;
        },
        eq(k, v) {
          calls.push({ table, k, v });
          if (table === "stores" && k === "slug" && v !== slug) single = null;
          return b;
        },
        in() {
          return b;
        },
        order() {
          return b;
        },
        is(k, v) {
          calls.push({ table, k, v });
          return b;
        },
        not() {
          return b;
        },
        range() {
          return b;
        },
        limit() {
          return b;
        },
        maybeSingle: async () => ({ data: single }),
        then(resolve, reject) {
          return Promise.resolve({ data: rows }).then(resolve, reject);
        },
      };
      return b;
    },
  };
}
function routeFor(db) {
  const service = load("lib/lym/server.ts", {
    "@/lib/supabase-admin": { supabaseAdmin: db },
    "next/server": { NextResponse },
  });
  return load("app/api/admin/lym/route.ts", { "@/lib/lym/server": service });
}
test("orders query skips monthly report and scopes delivery filters to confirmed sales", async () => {
  for (const status of ["", "in_transit", "delivered"]) {
    const db = apiDatabase({ operational: true });
    const response = await routeFor(db).GET(
      new Request(
        `https://lym.perlamarketplace.com/api/admin/lym?storeId=${store.id}&state=${status}`,
        { headers: { Authorization: "Bearer valid" } },
      ),
    );
    assert.equal(response.status, 200);
    assert(!db.calls.some((c) => c.rpc === "lym_monthly_report"));
    assert(
      db.calls.some(
        (c) => c.table === "orders" && c.k === "store_id" && c.v === store.id,
      ),
    );
    if (status) {
      assert(
        db.calls.some(
          (c) =>
            c.table === "orders" &&
            c.k === "lym_sale_state" &&
            c.v === "confirmed",
        ),
      );
      assert(
        db.calls.some(
          (c) => c.table === "orders" && c.k === "status" && c.v === status,
        ),
      );
    }
  }
});
const request = (extra = "", token = "valid") =>
  new Request(
    `https://lym.perlamarketplace.com/api/admin/lym?view=sales&storeId=${store.id}&year=2026&month=11${extra}`,
    { headers: token ? { authorization: `Bearer ${token}` } : {} },
  );
test("sales-only API is restricted to active LYM owners/admins before executing any report query", async () => {
  for (const input of [
    { role: "LYM_SALES" },
    { role: "VIEWER" },
    { role: "DRIVER" },
    { role: "OWNER", active: false },
    { role: "OWNER", slug: "another-store" },
  ]) {
    const db = apiDatabase(input);
    const response = await routeFor(db).GET(request());
    assert.equal(response.status, 403);
    assert(!db.calls.some((c) => c.rpc));
  }
  const db = apiDatabase();
  assert.equal((await routeFor(db).GET(request("", ""))).status, 401);
  assert(!db.calls.some((c) => c.rpc));
});
test("authorized report forwards verified actor and selected month and returns only aggregate data and people", async () => {
  for (const role of ["OWNER", "ADMIN"]) {
    const db = apiDatabase({ role });
    const response = await routeFor(db).GET(request("&actor=forged"));
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.year, 2026);
    assert.equal(json.month, 11);
    assert.equal(json.sellers.length, 3);
    assert(json.sellers.some((s) => s.name === "Marlen"));
    assert(!("products" in json));
    assert(!("orders" in json));
    const rpc = db.calls.find((c) => c.rpc);
    assert.equal(rpc.rpc, "lym_monthly_report");
    assert.equal(rpc.args.p_actor, actor);
    assert.equal(rpc.args.p_store, store.id);
    assert.equal(rpc.args.p_month, 11);
  }
  const db = apiDatabase();
  assert.equal(
    (
      await routeFor(db).GET(
        new Request(
          `https://example.test/api/admin/lym?view=sales&storeId=${store.id}&month=13`,
          { headers: { authorization: "Bearer valid" } },
        ),
      )
    ).status,
    400,
  );
  assert(!db.calls.some((c) => c.rpc));
});

test("Gestores offers the sales tab only for LYM and keeps its ShareAPP team and campaign tabs", () => {
  const styles = new Proxy({}, { get: (_, key) => String(key) });
  const deps = {
    "next/link": {
      __esModule: true,
      default: ({ children, ...props }) =>
        React.createElement("a", props, children),
    },
    "@/lib/shareapp/client": { shareappApi: async () => ({}) },
    "./CampaignPanel": { __esModule: true, default: () => null },
    "./AccountCreator": { __esModule: true, default: () => null },
    "./owner.module.css": { __esModule: true, default: styles },
    "@/components/lym/LymSalesReport": {
      __esModule: true,
      default: () => React.createElement("p", null, "Ventas"),
    },
  };
  const OwnerPanel = load("components/shareapp/OwnerPanel.tsx", deps).default;
  for (const salesConfirmed of [true, false]) {
    const html = renderToStaticMarkup(
      React.createElement(OwnerPanel, {
        storeId: store.id,
        storeName: "LYM",
        salesConfirmed,
      }),
    );
    assert.equal(html.includes('id="tab-ventas"'), salesConfirmed);
    assert(html.includes('id="tab-equipo"'));
    assert(html.includes('id="tab-campanas"'));
    assert(html.includes('id="tab-configuracion"'));
  }
});

test("Ventas del mes is directly below Orders for LYM owners on desktop and mobile, and hidden for other roles/stores", () => {
  for (const role of ["OWNER", "ADMIN"]) {
    const visible = paths(role);
    assert.equal(visible[visible.indexOf("/admin/orders") + 1], "/admin/sales");
    const rendered = renderNavigation(role);
    for (const html of [rendered.shell, rendered.drawer]) {
      assert(html.includes("Ventas del mes"));
      assert(html.includes('href="/admin/sales"'));
      assert(
        html.indexOf('href="/admin/orders"') <
          html.indexOf('href="/admin/sales"'),
      );
      assert(
        html.indexOf('href="/admin/sales"') <
          html.indexOf('href="/admin/products"'),
      );
    }
  }
  for (const role of [
    "LYM_SALES",
    "ASSIGNER",
    "SHIPPING_CATALOG",
    "VIEWER",
    "BILLER",
  ])
    assert(!paths(role).includes("/admin/sales"));
  assert(
    !paths("OWNER", { ...store, slug: "another-store" }).includes(
      "/admin/sales",
    ),
  );
  assert(
    !nav
      .getVisibleAdminSections({ ...store, slug: "another-store" }, true, null)
      .flatMap((s) => s.links)
      .some((l) => l.href === "/admin/sales"),
  );
});

test("monthly sales page reuses the protected report only for authorized LYM administrators", () => {
  function renderPage({
    role = "OWNER",
    slug = "lym",
    superAdmin = false,
    loading = false,
    moduleEnabled = true,
  } = {}) {
    const selected = { ...store, slug, module_store_enabled: moduleEnabled };
    const Page = load("app/admin/(store)/sales/page.tsx", {
      "next/link": {
        __esModule: true,
        default: ({ children, ...props }) =>
          React.createElement("a", props, children),
      },
      "@/hooks/useAdminAccess": {
        useAdminAccess: () => ({
          access: { storeMembership: membership(role) },
          store: selected,
          isSuperAdmin: superAdmin,
          loading,
        }),
      },
      "@/hooks/useStore": {
        useStore: () => ({ store: selected, loading: false }),
      },
      "@/components/admin/ui/AdminPageHeader": {
        __esModule: true,
        default: ({ title }) => React.createElement("h1", null, title),
      },
      "@/components/lym/LymSalesReport": {
        __esModule: true,
        default: ({ storeId }) =>
          React.createElement(
            "div",
            { "data-sales-report": storeId },
            "Reporte mensual",
          ),
      },
    }).default;
    return renderToStaticMarkup(React.createElement(Page));
  }
  for (const role of ["OWNER", "ADMIN"])
    assert(renderPage({ role }).includes("data-sales-report="));
  assert(
    renderPage({ superAdmin: true, role: "VIEWER" }).includes(
      "data-sales-report=",
    ),
  );
  for (const input of [
    { role: "LYM_SALES" },
    { role: "VIEWER" },
    { slug: "another-store" },
    { loading: true },
    { moduleEnabled: false },
  ])
    assert(!renderPage(input).includes("data-sales-report="));
});
