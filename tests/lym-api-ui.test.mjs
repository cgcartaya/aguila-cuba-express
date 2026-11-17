import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { NextRequest, NextResponse } = require("next/server");
function load(path, deps, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) => {
      if (!(name in deps)) throw Error(`Missing ${name}`);
      return deps[name];
    },
    URL,
    URLSearchParams,
    console,
    ...globals,
  });
  return module.exports;
}
const store = "10000000-0000-4000-8000-000000000001",
  actor = "20000000-0000-4000-8000-000000000001";
function database({
  role = "LYM_SALES",
  slug = "lym",
  active = true,
  superAdmin = false,
} = {}) {
  const calls = [];
  return {
    calls,
    auth: {
      getUser: async (token) => ({
        data: { user: token === "valid" ? { id: actor } : null },
      }),
    },
    from(table) {
      let row =
        table === "profiles"
          ? { active, role: superAdmin ? "super_admin" : "store_owner" }
          : table === "stores"
            ? {
                id: store,
                name: "LYM",
                slug,
                is_active: true,
                module_store_enabled: true,
              }
            : table === "store_users"
              ? { role, active }
              : null;
      const b = {
        select() {
          return b;
        },
        eq(key, value) {
          calls.push([table, key, value]);
          if (table === "stores" && key === "slug" && value !== slug)
            row = null;
          return b;
        },
        limit() {
          return b;
        },
        maybeSingle: async () => ({ data: row }),
        then(resolve, reject) {
          return Promise.resolve({
            data:
              table === "store_users"
                ? role === "LYM_SALES"
                  ? [row]
                  : []
                : row,
          }).then(resolve, reject);
        },
      };
      return b;
    },
  };
}
function server(db) {
  return load("lib/lym/server.ts", {
    "@/lib/supabase-admin": { supabaseAdmin: db },
    "next/server": { NextResponse },
  });
}
const req = (token = "valid") =>
  new Request("https://lym.perlamarketplace.com/api/admin/lym", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
test("server requires verified session and active LYM membership with exact role", async () => {
  for (const input of [
    { role: "VIEWER" },
    { role: "DRIVER" },
    { role: "OPERATIONS" },
    { active: false },
    { slug: "other" },
  ])
    await assert.rejects(server(database(input)).lymAccess(req(), store));
  await assert.rejects(server(database()).lymAccess(req(""), store));
  await assert.rejects(server(database()).lymAccess(req("invalid"), store));
  const staff = await server(database()).lymAccess(req(), store);
  assert.equal(staff.actor, actor);
  assert.equal(staff.owner, false);
  const owner = await server(database({ role: "OWNER" })).lymAccess(
    req(),
    store,
  );
  assert.equal(owner.owner, true);
});
test("server ignores supplied actor and forwards only authenticated identity to transactional RPC", async () => {
  const db = database();
  let rpc;
  db.rpc = async (name, args) => {
    rpc = { name, args };
    return { data: { id: "saved" } };
  };
  const service = server(db);
  const route = load("app/api/admin/lym/route.ts", {
    "@/lib/lym/server": service,
  });
  const request = new Request(
    "https://lym.perlamarketplace.com/api/admin/lym",
    {
      method: "POST",
      headers: { Authorization: "Bearer valid" },
      body: JSON.stringify({
        storeId: store,
        action: "confirm",
        actor: "forged",
        orderId: "order",
        version: 2,
      }),
    },
  );
  assert.equal((await route.POST(request)).status, 200);
  assert.equal(rpc.args.p_actor, actor);
  assert.equal(rpc.name, "lym_order_action");
});
test("legacy API boundary denies sales role but preserves other accounts and public requests", async () => {
  for (const [role, expected] of [
    ["LYM_SALES", 403],
    ["OWNER", null],
  ]) {
    const db = database({ role });
    db.rpc = async () => ({ data: role === "LYM_SALES" });
    const module = load(
      "lib/lym/api-boundary.ts",
      {
        "@supabase/supabase-js": { createClient: () => db },
        "next/server": { NextRequest, NextResponse },
      },
      {
        process: {
          env: {
            NEXT_PUBLIC_SUPABASE_URL: "https://test.invalid",
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "test",
          },
        },
      },
    );
    const response = await module.lymApiBoundary(
      new NextRequest(
        "https://example.test/api/admin/shipping/payment-status",
        { headers: { authorization: "Bearer valid" } },
      ),
    );
    assert.equal(response?.status ?? null, expected);
    assert.equal(
      await module.lymApiBoundary(
        new NextRequest("https://example.test/api/admin/lym", {
          headers: { authorization: "Bearer valid" },
        }),
      ),
      null,
    );
    assert.equal(
      await module.lymApiBoundary(
        new NextRequest("https://example.test/api/checkout/create-order"),
      ),
      null,
    );
  }
});
test("public checkout cannot forward browser prices, seller or actor into the request payload", async () => {
  let rpc;
  const db = {
    rpc: async (name, args) => {
      rpc = { name, args };
      return {
        data: { id: "o", order_number: "LYM-1", total: 20, subtotal: 20 },
      };
    },
  };
  const { createLymRequest } = load("lib/lym/checkout.ts", {
    "node:crypto": require("node:crypto"),
    "next/server": { NextResponse },
    "@/lib/supabase-admin": { supabaseAdmin: db },
    "@/lib/shareapp/server": { resolveReceipt: async () => null },
  });
  const response = await createLymRequest(store, {
    form: {
      name: "Ana",
      phone: "123",
      recipient_name: "Rosa",
      recipient_phone: "456",
      exact_address: "Calle",
      seller_key: "forged",
    },
    actor: "forged",
    seller_key: "forged",
    items: [{ product_id: "p", quantity: 2, price: 0.01 }],
  });
  assert.equal(response.status, 200);
  assert.equal(rpc.name, "lym_web_request");
  assert.equal("seller_key" in rpc.args.p_payload, false);
  assert.equal("p_actor" in rpc.args, false);
  assert.equal(rpc.args.p_attribution, null);
});
const order = {
  id: "o",
  order_number: "LYM-TEST",
  total: 25,
  delivery_fee: 5,
  customer_name: "Ana Compradora",
  customer_phone: "111",
  recipient_name: "Rosa Destinataria",
  recipient_phone: "222",
  address: "Calle 123",
  zone_name: "Casa",
  notes: "Referencia",
  created_at: "2026-11-17T15:00:00Z",
  deleted_at: null,
  lym_sale_state: "pending",
  lym_origin: "manual",
  lym_seller_key: `user:${actor}`,
  lym_seller_name: "Trabajadora",
  lym_created_by: actor,
  lym_confirmed_by: null,
  lym_confirmed_at: null,
  lym_version: 1,
  order_items: [
    {
      product_id: "p",
      item_type: "product",
      product_name: "Producto A",
      quantity: 2,
      price: 10,
      subtotal: 20,
    },
  ],
};
function renderOrders({
  selected = order,
  editing = false,
  owner = true,
} = {}) {
  const data = {
    orders: [order],
    count: 1,
    owner,
    actor,
    products: [{ id: "p", name: "Producto A", stock: 5, price: 10 }],
    sellers: [
      {
        key: `user:${actor}`,
        name: "Trabajadora",
        role: "Tienda física",
        active: true,
      },
    ],
    store: { name: "LYM" },
    report: owner
      ? {
          rows: [
            {
              seller_key: `user:${actor}`,
              seller_name: "Trabajadora",
              pending: 1,
              confirmed: 0,
              units: 0,
              amount: 0,
            },
          ],
          orders: [],
          legacy_count: 0,
        }
      : null,
  };
  const overrides = {
    6: data,
    7: false,
    10: selected,
    13: editing,
    15: order.order_items,
    16: {
      customer_name: "Ana Compradora",
      customer_phone: "111",
      recipient_name: "Rosa Destinataria",
      recipient_phone: "222",
      address: "Calle 123",
      delivery_place: "Casa",
      notes: "",
      seller_key: `user:${actor}`,
      delivery_fee: 5,
    },
  };
  let index = 0;
  const hooks = {
    useState(initial) {
      const i = index++;
      return [
        i in overrides
          ? overrides[i]
          : typeof initial === "function"
            ? initial()
            : initial,
        () => {},
      ];
    },
    useRef: (initial) => ({ current: initial }),
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useEffect: () => {},
  };
  const Component = load("components/lym/LymOrders.tsx", {
    react: hooks,
    "react/jsx-runtime": require("react/jsx-runtime"),
    "@/lib/lym/client": { lymFetch: async () => {} },
    "@/lib/lym/print": { printLymReceipt: () => {} },
  }).default;
  return renderToStaticMarkup(
    React.createElement(Component, { storeId: store }),
  );
}
test("pending receipt identifies buyer, recipient, order, prices and pending state; confirmed orders cannot edit in place", () => {
  const html = renderOrders();
  for (const text of [
    "LYM-TEST",
    "Ana Compradora",
    "Rosa Destinataria",
    "Calle 123",
    "Producto A",
    "$25.00",
    "Solicitud pendiente",
    "Confirmar venta y descontar inventario",
    "Imprimir comprobante",
  ])
    assert(html.includes(text), text);
  const confirmed = renderOrders({
    selected: { ...order, lym_sale_state: "confirmed" },
  });
  assert(!confirmed.includes("Confirmar venta y descontar inventario"));
  assert(!confirmed.includes("Revisar productos, cantidades y precios"));
  assert(confirmed.includes("Cancelar / devolución completa"));
});
test("manual form exposes line quantity, price, available stock and responsible; monthly panel is owner-only", () => {
  const html = renderOrders({ editing: true });
  for (const label of [
    "Cantidad Producto A",
    "Precio Producto A",
    "Existencias:",
    "Venta de",
    "Guardar solicitud pendiente",
  ])
    assert(html.includes(label), label);
  assert(!renderOrders({ owner: false }).includes("Ventas del mes"));
  assert(renderOrders().includes("Ventas del mes"));
});
test("printing isolates escaped receipt and requests US Letter with paginated table headers", () => {
  let appended;
  const { printLymReceipt } = load(
    "lib/lym/print.ts",
    {},
    {
      document: {
        getElementById: () => ({ innerHTML: "<p>Ana &lt;script&gt;</p>" }),
        createElement: () => ({ style: {} }),
        body: { appendChild: (frame) => (appended = frame) },
      },
    },
  );
  printLymReceipt();
  assert.match(appended.srcdoc, /size:letter/);
  assert.match(appended.srcdoc, /table-header-group/);
  assert.match(appended.srcdoc, /Ana &lt;script&gt;/);
  assert(!appended.srcdoc.includes("Crear orden manual"));
});

test("payment reminders skip LYM while other stores keep their reminder behavior", async () => {
  for (const [slug, expected] of [
    ["lym", 0],
    ["other", 1],
  ]) {
    let sent = 0;
    const db = {
      from(table) {
        const data =
          table === "orders"
            ? [
                {
                  id: "order",
                  order_number: "TEST",
                  store_id: store,
                  customer_id: "customer",
                  total: 10,
                },
              ]
            : table === "stores"
              ? [{ id: store, slug, name: "Store" }]
              : table === "customers"
                ? [{ id: "customer", email: "test@example.test", name: "Test" }]
                : [];
        const b = {
          select: () => b,
          is: () => b,
          not: () => b,
          eq: () => b,
          lte: () => b,
          gte: () => b,
          limit: () => b,
          in: () => b,
          delete: () => b,
          update: () => b,
          then: (resolve, reject) =>
            Promise.resolve({ data, error: null }).then(resolve, reject),
        };
        return b;
      },
    };
    const source = fs.readFileSync("app/api/cron/reminders/route.ts", "utf8");
    const emailImport = source
      .match(/from "([^\"]+)";/g)
      .map((x) => x.slice(6, -2))
      .find((x) => x.includes("email"));
    const route = load(
      "app/api/cron/reminders/route.ts",
      {
        "next/server": { NextRequest, NextResponse },
        "@/lib/supabase-admin": { supabaseAdmin: db },
        [emailImport]: {
          sendAbandonedCartEmail: async () => ({ sent: false }),
          sendUnpaidOrderEmail: async () => {
            sent++;
            return { sent: true };
          },
        },
      },
      { process: { env: { CRON_SECRET: "test-cron" } } },
    );
    const response = await route.GET(
      new NextRequest("https://example.test/api/cron/reminders", {
        headers: { authorization: "Bearer test-cron" },
      }),
    );
    assert.equal(response.status, 200);
    assert.equal(sent, expected);
  }
});
