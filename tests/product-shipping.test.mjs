import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
function load(path, deps = {}) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: (n) => {
        if (!(n in deps)) throw Error(n);
        return deps[n];
      },
      console,
      Error,
    },
  );
  return module.exports;
}
const weight = load("lib/shipping/product-weight.ts");
const pricing = load("lib/storefront/product-quantity-pricing.ts");
const baseRate = {
  id: "rate-a",
  store_id: "a",
  service_type_id: "service-a",
  scope_type: "province",
  province_id: "province-a",
  country_id: null,
  municipality_id: null,
  location_id: null,
  transport_mode: "sea",
  rate_per_lb: 3,
  minimum_weight_lb: 10,
  maximum_weight_lb: 100,
  minimum_charge: 0,
  fixed_fee: 2,
  is_active: true,
};
function fixture() {
  return {
    stores: [{ id: "a", module_shipping_enabled: true, is_active: true }],
    products: [
      {
        id: "p",
        store_id: "a",
        name: "Aceite",
        weight: 1,
        weight_unit: "kg",
        is_active: true,
        deleted_at: null,
      },
      {
        id: "q",
        store_id: "a",
        name: "Atún",
        weight: 453.59237,
        weight_unit: "g",
        is_active: true,
        deleted_at: null,
      },
    ],
    combos: [
      {
        id: "c",
        store_id: "a",
        is_active: true,
        deleted_at: null,
        combo_items: [
          { product_id: "p", quantity: 2 },
          { product_id: "q", quantity: 3 },
        ],
      },
    ],
    shipping_rates: [{ ...baseRate }],
    shipping_service_types: [
      {
        id: "service-a",
        store_id: "a",
        name: "Miscelánea",
        code: "misc",
        billing_mode: "per_lb",
        is_active: true,
      },
    ],
    shipping_provinces: [
      {
        id: "province-a",
        store_id: "a",
        name: "Habana",
        country_id: "country-a",
        is_active: true,
      },
    ],
    shipping_countries: [
      { id: "country-a", store_id: "a", name: "Cuba", is_active: true },
    ],
  };
}
function api(data) {
  const calls = [];
  const db = {
    from(table) {
      const filters = [];
      calls.push({ table, filters });
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push((r) => r[k] === v);
          return q;
        },
        is(k, v) {
          filters.push((r) => r[k] === v);
          return q;
        },
        in(k, values) {
          filters.push((r) => values.includes(r[k]));
          return q;
        },
        maybeSingle() {
          return Promise.resolve({
            data:
              (data[table] || []).filter((r) =>
                filters.every((f) => f(r)),
              )[0] || null,
            error: null,
          });
        },
        then(resolve, reject) {
          return Promise.resolve({
            data: (data[table] || []).filter((r) => filters.every((f) => f(r))),
            error: null,
          }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  return load("lib/shipping/cart-shipping.ts", {
    "server-only": {},
    "@/lib/supabase-admin": { supabaseAdmin: db },
    "./product-weight": weight,
    "./alvarez-policy": {
      ALVAREZ_STORE_ID: "alvarez",
      alvarezShippingPolicy: () => ({ minimumWeight: 5 }),
    },
  });
}
const item = (id, quantity = 1) => ({
  item_type: "product",
  product_id: id,
  quantity,
});
test("grams, pounds and kilograms convert exactly without rounding each item", () => {
  assert.equal(weight.weightInPounds(453.59237, "g"), 1);
  assert.equal(weight.weightInPounds(0.45359237, "kg"), 1);
  assert.equal(weight.weightInPounds(2.5, "lb"), 2.5);
  for (const [n, u] of [
    [null, "lb"],
    [0, "g"],
    [-1, "kg"],
    [Infinity, "lb"],
    [1, "oz"],
  ])
    assert.throws(() => weight.weightInPounds(n, u));
});
test("minimum billing, minimum charge, threshold and max weight apply", () => {
  assert.equal(weight.shippingCharge(baseRate, 2).amount, 32);
  assert.equal(
    weight.shippingCharge({ ...baseRate, minimum_charge: 50 }, 2).amount,
    50,
  );
  assert.equal(
    weight.shippingCharge(
      { ...baseRate, weight_threshold_lb: 20, rate_at_or_above_threshold: 2 },
      20,
    ).amount,
    42,
  );
  assert.throws(() => weight.shippingCharge(baseRate, 101), /máximo/);
});
test("server weights include product quantities and combo components; client prices and weights are ignored", async () => {
  const { quoteCartShipping } = api(fixture());
  const r = await quoteCartShipping(
    "a",
    [
      { ...item("p", 2), weight: 0, price: 0 },
      { item_type: "combo", combo_id: "c", quantity: 2 },
    ],
    { rate_id: "rate-a", amount: 0 },
  );
  assert.ok(Math.abs(r.weight_lb - (6 / 0.45359237 + 6)) < 0.000001);
  assert.equal(r.amount, Number(((6 / 0.45359237 + 6) * 3 + 2).toFixed(2)));
  assert.equal(r.destination, "Cuba / Habana");
});
test("missing weight prevents quoting; cross-tenant products, tariffs and unavailable services fail closed", async () => {
  let data = fixture();
  data.products[0].weight = null;
  await assert.rejects(
    api(data).quoteCartShipping("a", [item("p")], { rate_id: "rate-a" }),
    /Aceite.*peso/,
  );
  data = fixture();
  data.products[0].store_id = "b";
  await assert.rejects(
    api(data).quoteCartShipping("a", [item("p")], { rate_id: "rate-a" }),
    /disponible/,
  );
  data = fixture();
  data.shipping_rates[0].store_id = "b";
  await assert.rejects(
    api(data).quoteCartShipping("a", [item("p")], { rate_id: "rate-a" }),
    /tarifa/,
  );
  data = fixture();
  data.shipping_service_types[0].is_active = false;
  await assert.rejects(
    api(data).quoteCartShipping("a", [item("p")], { rate_id: "rate-a" }),
    /servicio/,
  );
  data = fixture();
  data.shipping_countries[0].is_active = false;
  await assert.rejects(
    api(data).quoteCartShipping("a", [item("p")], { rate_id: "rate-a" }),
    /destino/,
  );
});
test("disabled shipping and invalid quantities cannot produce a quote", async () => {
  const data = fixture();
  data.stores[0].module_shipping_enabled = false;
  await assert.rejects(
    api(data).quoteCartShipping("a", [item("p")], { rate_id: "rate-a" }),
    /módulo/,
  );
  for (const qty of [0, -1, 1.2, 100001])
    await assert.rejects(
      api(fixture()).quoteCartShipping("a", [item("p", qty)], {
        rate_id: "rate-a",
      }),
      /Cantidad/,
    );
});
test("product percentage exemption preserves quantity pricing and other product fees", () => {
  const exempt = { platform_fee_exempt: true };
  assert.equal(
    pricing.getUnitPriceForQuantity(
      500,
      1,
      [],
      exempt.platform_fee_exempt ? 0 : 2.5,
    ),
    500,
  );
  assert.equal(
    pricing.getUnitPriceForQuantity(
      500,
      2,
      [{ min_quantity: 2, unit_price: 450 }],
      0,
    ),
    450,
  );
  assert.equal(pricing.getUnitPriceForQuantity(10, 1, [], 2.5), 10.25);
});
test("migration preserves old products and enforces units and positive weights in Postgres", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create table products(id int);create table orders(id int);insert into products values(1)",
    );
    await db.exec(
      fs.readFileSync(
        "supabase/migrations/20261108160017_product_weight_checkout_shipping.sql",
        "utf8",
      ),
    );
    const row = (await db.query("select * from products")).rows[0];
    assert.equal(row.weight, null);
    assert.equal(row.weight_unit, "lb");
    assert.equal(row.platform_fee_exempt, false);
    await assert.rejects(db.exec("update products set weight=-1"));
    await assert.rejects(db.exec("update products set weight_unit='oz'"));
    await db.exec(
      "update products set weight=0.4,weight_unit='lb',platform_fee_exempt=true",
    );
  } finally {
    await db.close();
  }
});
function orderHarness({ shipping = true } = {}) {
  const data = fixture();
  data.stores[0] = {
    ...data.stores[0],
    name: "Store",
    slug: "store-a",
    module_store_enabled: true,
    platform_fee_enabled: true,
    platform_fee_percent: 2.5,
  };
  data.products[0] = {
    ...data.products[0],
    price: 500,
    stock: 20,
    combo_only: false,
    platform_fee_exempt: true,
    delivery_included: true,
  };
  data.products[1] = {
    ...data.products[1],
    price: 10,
    stock: 20,
    combo_only: false,
    platform_fee_exempt: false,
    delivery_included: true,
  };
  data.checkout_settings = [
    {
      store_id: "a",
      blocks: { customer: false },
      delivery_address_mode: "zone",
    },
  ];
  data.categories = [];
  data.product_price_tiers = [];
  data.delivery_zones = [
    {
      id: "zone",
      store_id: "a",
      province: "Habana",
      municipality: "Habana",
      is_active: true,
      delivery_fee: 15,
    },
  ];
  const writes = [];
  const db = {
    rpc: async () => ({ data: { success: true }, error: null }),
    from(table) {
      let filters = [],
        op = "select",
        payload;
      const result = () => {
        if (op === "insert") {
          writes.push({ table, payload });
          return {
            data:
              table === "orders"
                ? { id: "order-id", order_number: "123" }
                : payload,
            error: null,
          };
        }
        if (op === "update") return { data: null, error: null };
        const rows = (data[table] || []).filter((r) =>
          filters.every((f) => f(r)),
        );
        return { data: rows, error: null };
      };
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push((r) => r[k] === v);
          return q;
        },
        is(k, v) {
          filters.push((r) => r[k] === v);
          return q;
        },
        in(k, v) {
          filters.push((r) => v.includes(r[k]));
          return q;
        },
        order() {
          return q;
        },
        insert(p) {
          op = "insert";
          payload = p;
          return q;
        },
        update() {
          op = "update";
          return q;
        },
        maybeSingle() {
          const r = result();
          return Promise.resolve({
            ...r,
            data: Array.isArray(r.data) ? r.data[0] || null : r.data,
          });
        },
        single() {
          return q.maybeSingle();
        },
        then(resolve, reject) {
          return Promise.resolve(result()).then(resolve, reject);
        },
      };
      return q;
    },
  };
  const cartApi = load("lib/shipping/cart-shipping.ts", {
    "server-only": {},
    "@/lib/supabase-admin": { supabaseAdmin: db },
    "./product-weight": weight,
    "./alvarez-policy": {
      ALVAREZ_STORE_ID: "alvarez",
      alvarezShippingPolicy: () => ({ minimumWeight: 5 }),
    },
  });
  const route = load("app/api/checkout/create-order/route.ts", {
    "next/server": { after: () => {}, NextResponse: { json: Response.json } },
    crypto: { randomUUID: () => "device-id" },
    "@/lib/shareapp/server": { attributeOrder: async () => {} },
    "@/lib/supabase-admin": { supabaseAdmin: db },
    "@/lib/checkout/customer": {
      saveCheckoutCustomer: async () => ({
        data: { id: "customer-id" },
        error: null,
      }),
    },
    "@/lib/shipping/cart-shipping": cartApi,
    "@/lib/storefront/product-quantity-pricing": pricing,
    "@/lib/notifications/order-notification": {},
    "@/lib/notifications/customer-order-email": {},
    "@/lib/config/features": { getPlatformOrderFixedFee: () => 0.5 },
    "@/lib/checkout/distance-delivery": {},
  });
  const body = {
    storeId: "a",
    form: {
      recipient_name: "Destinatario",
      recipient_phone: "123",
      exact_address: "Calle 1",
      province: "Habana",
      municipality: "Habana",
    },
    zoneId: "zone",
    items: [
      { ...item("p"), price: 0, platform_fee_exempt: false },
      { ...item("q"), price: 0, platform_fee_exempt: true },
    ],
    ...(shipping
      ? { productShipping: { rate_id: "rate-a", amount: 0, weight_lb: 0 } }
      : {}),
  };
  return {
    data,
    writes,
    post: () =>
      route.POST(
        new Request("https://store.test/api/checkout/create-order", {
          method: "POST",
          headers: { host: "store.test", "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      ),
  };
}
test("actual checkout charges authoritative mixed prices plus weight shipping; included local delivery never waives freight", async () => {
  const h = orderHarness();
  const response = await h.post();
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  assert.equal(result.order.subtotal, 510.25);
  assert.equal(result.order.delivery_fee, 32);
  assert.equal(result.order.total, 542.25);
  assert.equal(result.order.platform_fee_amount, 0.75);
  const order = h.writes.find((x) => x.table === "orders").payload;
  assert.equal(order.shipping_details.shipping_rate_id, "rate-a");
  assert.equal(order.zone_name, "Cuba / Habana");
  const lines = h.writes.find((x) => x.table === "order_items").payload;
  assert.equal(lines[0].price, 500);
  assert.equal(lines[0].platform_fee_amount, 0);
  assert.equal(lines[1].price, 10.25);
  assert.equal(lines[1].platform_fee_amount, 0.25);
});
test("ordinary checkout remains available and keeps its preexisting delivery-included rule", async () => {
  const h = orderHarness({ shipping: false });
  const response = await h.post();
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  assert.equal(result.order.delivery_fee, 0);
  assert.equal(result.order.total, 510.25);
  assert.equal(result.order.shipping_details, null);
});
test("missing shipping weight aborts before creating an order or reserving stock", async () => {
  const h = orderHarness();
  h.data.products[0].weight = null;
  const response = await h.post();
  assert.equal(response.status, 422);
  assert.match((await response.json()).message, /peso/);
  assert.equal(h.writes.length, 0);
});
