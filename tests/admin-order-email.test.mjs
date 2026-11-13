import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function load(path, context = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(source(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(outputText, { exports, ...context });
  return exports;
}

const emailPath = "lib/notifications/order-email.ts";
const { renderNewOrderEmail } = load(emailPath);
const single = {
  storeName: "Tienda <Uno>",
  orderNumber: "ORD-1",
  customerName: "Ana & Luis",
  customerPhone: "3055550100",
  deliveryLabel: "Entrega local",
  destination: "Miami",
  items: [{ product_name: "Aceite <vegetal>", item_type: "product", quantity: 2, unit_price: 8.5, subtotal: 17 }],
  subtotal: 17,
  deliveryFee: 0,
  discountAmount: 0,
  total: 17,
};

test("single line, free local delivery and escaped text", () => {
  const html = renderNewOrderEmail(single);
  for (const value of ["Tienda &lt;Uno&gt;", "Ana &amp; Luis", "Aceite &lt;vegetal&gt;",
    "Productos diferentes: 1 · Unidades totales: 2", "Entrega local", "Miami", "$8.50", "$0.00", "$17.00"]) {
    assert.ok(html.includes(value), value);
  }
  assert.doesNotMatch(html, /Descuento|Correo electrónico/);
});

test("combo, applied quantity price, shipping and coupon use persisted amounts", () => {
  const html = renderNewOrderEmail({
    ...single,
    items: [...single.items, { product_name: "Paquete familiar", item_type: "combo", quantity: 3, unit_price: 12, subtotal: 36 }],
    customerEmail: "ana@example.test",
    deliveryLabel: "Envío a Cuba",
    destination: "Municipio, Provincia, Cuba",
    subtotal: 53,
    deliveryFee: 5,
    discountAmount: 2.5,
    total: 55.5,
  });
  for (const value of ["Combo", "Paquete familiar", "Productos diferentes: 2 · Unidades totales: 5",
    "ana@example.test", "Envío a Cuba", "Municipio, Provincia, Cuba", "$12.00", "$36.00",
    "$53.00", "$5.00", "-$2.50", "$55.50"]) {
    assert.ok(html.includes(value), value);
  }
  assert.throws(() => renderNewOrderEmail({ ...single, total: Infinity }), /Importe inválido/);
});

function notifier(storeEmails, platformEmail, fail = false) {
  const messages = [];
  const errors = [];
  const env = {
    RESEND_API_KEY: "test-key",
    RESEND_FROM_EMAIL: "from@example.test",
    PLATFORM_NOTIFICATION_EMAIL: platformEmail,
  };
  const logger = { error: (...args) => errors.push(args) };
  const email = load(emailPath, {
    process: { env },
    console: logger,
    fetch: async (url, options) => {
      assert.equal(url, "https://api.resend.com/emails");
      messages.push(JSON.parse(options.body));
      return new Response(null, { status: fail ? 503 : 200 });
    },
  });
  const supabaseAdmin = {
    from(table) {
      assert.equal(table, "store_settings");
      return {
        select(column) {
          assert.equal(column, "order_notification_email");
          return {
            eq(key, storeId) {
              assert.equal(key, "store_id");
              return {
                maybeSingle: async () => ({ data: { order_notification_email: storeEmails[storeId] } }),
              };
            },
          };
        },
      };
    },
  };
  const { sendNewOrderNotification } = load("lib/notifications/order-notification.ts", {
    require: (name) => name === "@/lib/supabase-admin" ? { supabaseAdmin } : email,
    process: { env },
    console: logger,
  });
  return { sendNewOrderNotification, messages, errors };
}

test("settings are scoped to each store and recipients are deduplicated", async () => {
  const { sendNewOrderNotification, messages, errors } = notifier({
    one: " one@example.test ",
    two: "PLATFORM@example.test",
  }, "platform@example.test");
  await sendNewOrderNotification({ ...single, storeId: "one" });
  await sendNewOrderNotification({ ...single, storeId: "two", storeName: "Tienda Dos" });
  assert.deepEqual(messages.map(({ to }) => to), [
    ["one@example.test", "platform@example.test"], ["platform@example.test"],
  ]);
  assert.match(messages[0].html, /Tienda &lt;Uno&gt;/);
  assert.match(messages[1].html, /Tienda Dos/);
  assert.doesNotMatch(messages[1].html, /Tienda &lt;Uno&gt;/);
  assert.deepEqual(errors, []);
});

test("missing store email uses the configured platform address, or skips delivery", async () => {
  const platformOnly = notifier({}, "platform@example.test");
  await platformOnly.sendNewOrderNotification({ ...single, storeId: "one" });
  assert.deepEqual(platformOnly.messages[0].to, ["platform@example.test"]);

  const unconfigured = notifier({});
  await unconfigured.sendNewOrderNotification({ ...single, storeId: "one" });
  assert.equal(unconfigured.messages.length, 0);
});

test("Resend HTTP failure is logged and the notification resolves", async () => {
  const { sendNewOrderNotification, messages, errors } = notifier({ one: "one@example.test" }, undefined, true);
  await sendNewOrderNotification({ ...single, storeId: "one" });
  assert.equal(messages.length, 1);
  assert.equal(errors.length, 1);
  assert.equal(errors[0][1], 503);
});
