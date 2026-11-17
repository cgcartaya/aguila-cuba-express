import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(file, deps = {}) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: (n) => (n in deps ? deps[n] : require(n)),
      console,
      Response,
      Buffer,
      process,
      URL,
      Intl,
      Date,
      setTimeout,
    },
  );
  return module.exports;
}
const model = load("lib/saas-billing/model.ts");
const actor = "00000000-0000-4000-8000-000000000001",
  tenant = "00000000-0000-4000-8000-000000000002",
  other = "00000000-0000-4000-8000-000000000003",
  owner = "00000000-0000-4000-8000-000000000004";
const create = () => ({
  store_id: tenant,
  request_id: randomUUID(),
  issued_on: "2026-11-01",
  due_on: "2026-11-10",
  period: "Noviembre 2026",
  client_name: "Carlos",
  phone: "+13055551234",
  email: "",
  description: "Suscripción mensual",
  subtotal: 40,
  discount: 0,
  adjustment: 0,
  tax: 0,
  draft: false,
});
const example = {
  ...create(),
  id: randomUUID(),
  number: "PERLA-2026-0001",
  status: "pending",
  store_name: "Tienda uno",
  total: 40,
  paid: 10,
  issuer: { name: "Perla Marketplace" },
};
const bootstrap = `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key);create table profiles(id uuid primary key,role text,active boolean);
 create table stores(id uuid primary key,name text,is_active boolean,monthly_price numeric,last_payment_date date,next_payment_date date,payment_status text);
 insert into auth.users values('${actor}'),('${owner}');insert into profiles values('${actor}','super_admin',true),('${owner}','store_owner',true);
 insert into stores values('${tenant}','Tienda uno',true,40,null,'2026-12-01','pending'),('${other}','Tienda dos',true,60,null,'2026-12-10','pending');`;
test("transactional billing: historical snapshots, sequences, idempotent partial payments, isolation, archive and privileges", async () => {
  const db = new PGlite();
  try {
    await db.exec(bootstrap);
    await db.exec(
      fs.readFileSync(
        "supabase/migrations/20261117190000_saas_subscription_billing.sql",
        "utf8",
      ),
    );
    const command = async (action, data, who = actor) =>
      (
        await db.query("select saas_billing_command($1,$2,$3) result", [
          who,
          action,
          data,
        ])
      ).rows[0].result;
    await assert.rejects(command("create", create(), owner), /Acceso SaaS/);
    const request = create(),
      i = await command("create", request);
    assert.equal(i.number, "PERLA-2026-0001");
    assert.equal(Number(i.total), 40);
    assert.equal((await command("create", request)).id, i.id);
    await assert.rejects(
      command("create", { ...request, store_id: other }),
      /otra tienda/,
    );
    await db.exec(`update stores set monthly_price=90 where id='${tenant}'`);
    assert.equal(
      Number(
        (
          await db.query(
            "select subtotal from saas_subscription_invoices where id=$1",
            [i.id],
          )
        ).rows[0].subtotal,
      ),
      40,
    );
    await assert.rejects(
      db.query(
        "update saas_subscription_invoices set subtotal=10 where id=$1",
        [i.id],
      ),
      /no puede modificarse/,
    );
    const pay = {
      invoice_id: i.id,
      request_id: randomUUID(),
      paid_on: "2026-11-17",
      amount: 15,
      method: "Zelle",
      reference: "receipt-1",
      notes: "",
    };
    assert.equal(Number((await command("pay", pay)).paid), 15);
    assert.equal(Number((await command("pay", pay)).paid), 15);
    await assert.rejects(
      command("pay", { ...pay, request_id: randomUUID() }),
      /duplicate key/,
    );
    await assert.rejects(
      command("pay", { ...pay, request_id: randomUUID(), amount: 26 }),
      /superior al saldo/,
    );
    await assert.rejects(
      command("void", { invoice_id: i.id, reason: "Error" }),
      /con pagos/,
    );
    assert.equal(
      (
        await command("pay", {
          ...pay,
          request_id: randomUUID(),
          amount: 25,
          reference: "receipt-2",
        })
      ).status,
      "paid",
    );
    const store = (await db.query("select * from stores where id=$1", [tenant]))
      .rows[0];
    assert.equal(store.is_active, true);
    assert.equal(
      store.next_payment_date.toISOString().slice(0, 10),
      "2026-12-01",
    );
    assert.equal(
      store.last_payment_date.toISOString().slice(0, 10),
      "2026-11-17",
    );
    const draft = await command("create", { ...create(), draft: true });
    assert.equal(draft.number, null);
    const issued = await command("issue", { invoice_id: draft.id });
    assert.equal(issued.number, "PERLA-2026-0002");
    await command("share", { invoice_id: draft.id, token_hash: "secret-hash" });
    await command("void", {
      invoice_id: draft.id,
      reason: "Importe incorrecto",
    });
    assert.ok(
      (await db.query("select revoked_at from saas_invoice_links")).rows[0]
        .revoked_at,
    );
    const simultaneous = await Promise.all(
      Array.from({ length: 5 }, () => command("create", create())),
    );
    assert.equal(new Set(simultaneous.map((i) => i.number)).size, 5);
    assert.equal(simultaneous[0].number, "PERLA-2026-0003");
    await assert.rejects(
      command("archive", { store_id: tenant, confirmation: "incorrecto" }),
      /nombre exacto/,
    );
    await command("archive", { store_id: tenant, confirmation: "Tienda uno" });
    assert.equal(
      (await db.query("select is_active from stores where id=$1", [tenant]))
        .rows[0].is_active,
      false,
    );
    assert.equal(
      (await db.query("select is_active from stores where id=$1", [other]))
        .rows[0].is_active,
      true,
    );
    await assert.rejects(
      db.query("update stores set is_active=true where id=$1", [tenant]),
      /Restaura/,
    );
    await assert.rejects(command("create", create()), /archivada/);
    await command("restore", { store_id: tenant });
    assert.equal(
      (await db.query("select is_active from stores where id=$1", [tenant]))
        .rows[0].is_active,
      true,
    );
    await command("suspend", { store_id: tenant });
    await command("archive", { store_id: tenant, confirmation: "Tienda uno" });
    await command("restore", { store_id: tenant });
    assert.equal(
      (await db.query("select is_active from stores where id=$1", [tenant]))
        .rows[0].is_active,
      false,
    );
    await command("reactivate", { store_id: tenant });
    await assert.rejects(
      db.query("delete from stores where id=$1", [tenant]),
      /foreign key/,
    );
    await assert.rejects(
      db.query("delete from saas_subscription_invoices where id=$1", [i.id]),
      /se conserva/,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from saas_subscription_invoices"),
      /permission denied/,
    );
    await assert.rejects(command("create", create()), /permission denied/);
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select * from saas_invoice_links"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("monetary inputs, dates, phone and overdue reminders are validated", () => {
  assert.equal(model.balance(example), 30);
  assert.equal(model.invoiceState(example, "2026-11-17"), "overdue");
  assert.equal(
    model.invoiceState({ ...example, status: "paid" }, "2026-11-17"),
    "paid",
  );
  for (const subtotal of [-1, NaN, Infinity, 0.001])
    assert.equal(
      model.commandSchema.safeParse({ action: "create", ...create(), subtotal })
        .success,
      false,
    );
  assert.equal(
    model.commandSchema.safeParse({
      action: "create",
      ...create(),
      due_on: "2026-02-30",
    }).success,
    false,
  );
  for (const phone of ["3055551234", "+0123456789", "+1", "javascript:1234567"])
    assert.throws(() => model.whatsappPhone(phone));
  assert.equal(model.whatsappPhone("+1 (305) 555-1234"), "13055551234");
  const message = model.whatsappMessage(
    example,
    "https://perlamarketplace.com/private-link",
  );
  assert.match(message, /saldo pendiente/);
  assert.match(message, /\$30.00/);
  assert.match(message, /30 días/);
  assert.match(message, /Vencimiento original/);
});
test("only verified active SaaS admins reach server reads and writes", async () => {
  for (const [role, active] of [
    ["store_owner", true],
    ["super_admin", false],
  ]) {
    const db = {
      auth: { getUser: async () => ({ data: { user: { id: actor } } }) },
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: { role, active } }),
        };
      },
    };
    const server = load("lib/saas-billing/server.ts", {
      "server-only": {},
      "@/lib/supabase-admin": { supabaseAdmin: db },
    });
    assert.equal(
      await server.saasActor({
        headers: new Headers({ authorization: "Bearer token" }),
      }),
      null,
    );
    assert.equal(await server.saasActor({ headers: new Headers() }), null);
  }
});
test("route denies tenant access and does not run accounting commands", async () => {
  const routes = load("app/api/saas/subscriptions/route.ts", {
    "@/lib/saas-billing/server": {
      saasActor: async () => null,
      json: (data, status) => ({ data, status }),
    },
    "@/lib/saas-billing/model": model,
    "@/lib/saas-billing/pdf": {},
  });
  assert.equal((await routes.GET({})).status, 403);
  assert.equal((await routes.POST({})).status, 403);
});
test("letter PDF includes historical total and client without internal payment references", async () => {
  const { invoicePdf } = load("lib/saas-billing/pdf.ts", {
    "server-only": {},
    "./model": model,
  });
  const pdf = await invoicePdf(example);
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.match(pdf.toString("latin1"), /MediaBox \[0 0 612\. 792\.\]/);
  assert.match(pdf.toString("latin1"), /PERLA-2026-0001/);
  assert.match(pdf.toString("latin1"), /Tienda uno/);
  assert.match(pdf.toString("latin1"), /40.00/);
  assert.match(pdf.toString("latin1"), /30.00/);
});
test("possession links reject malformed, expired or revoked tokens and expose only one authorized PDF", async () => {
  for (const state of ["missing", "void", "valid"]) {
    const db = {
      from(table) {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          is() {
            return this;
          },
          gt() {
            return this;
          },
          in() {
            return this;
          },
          maybeSingle: async () => ({
            data:
              table === "saas_invoice_links"
                ? state === "missing"
                  ? null
                  : { invoice_id: example.id }
                : state === "void"
                  ? null
                  : example,
          }),
        };
      },
    };
    const route = load("app/api/saas/subscriptions/share/[token]/route.ts", {
      "@/lib/saas-billing/server": { db },
      "@/lib/saas-billing/pdf": {
        invoicePdf: async () => Buffer.from("%PDF-test"),
      },
    });
    assert.equal(
      (await route.GET({}, { params: Promise.resolve({ token: "invalid" }) }))
        .status,
      404,
    );
    const response = await route.GET(
      {},
      { params: Promise.resolve({ token: "a".repeat(64) }) },
    );
    assert.equal(response.status, state === "valid" ? 200 : 404);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
    if (state === "valid") {
      assert.equal(await response.text(), "%PDF-test");
      assert.match(response.headers.get("X-Robots-Tag"), /noindex/);
    }
  }
});
test("search, lifecycle filters and billing totals retain their distinct meanings", () => {
  const dependencies = {
    "@/lib/saas-billing/client": {},
    "@/lib/saas-billing/model": model,
    "./EconomyModuleToggle": {},
    "./ClientShowcaseToggle": {},
    "./BillingDialog": {},
  };
  const { filterStores } = load(
    "components/admin/saas/StoreManagement.tsx",
    dependencies,
  );
  const a = {
      id: tenant,
      name: "Tienda uno",
      client_name: "Carlos",
      domain: "uno.com",
      monthly_price: 40,
      is_active: true,
      payment_status: "pending",
    },
    b = {
      id: other,
      name: "Tienda dos",
      client_name: "Ana",
      monthly_price: 60,
      is_active: false,
      payment_status: "paid",
    };
  assert.equal(filterStores([a, b], [], "CARLOS", "all", "name")[0].id, tenant);
  assert.equal(filterStores([a, b], [], "uno.com", "active", "name").length, 1);
  assert.equal(
    filterStores(
      [a, b],
      [{ store_id: other, state: "archived" }],
      "",
      "all",
      "name",
    ).length,
    1,
  );
  assert.equal(
    filterStores(
      [a, b],
      [{ store_id: other, state: "suspended" }],
      "",
      "suspended",
      "name",
    )[0].id,
    other,
  );
  const { invoiceTotals } = load(
    "components/admin/saas/SubscriptionBilling.tsx",
    { ...dependencies, "./StoreManagement": {} },
  );
  const totals = invoiceTotals(
    [
      example,
      { ...example, id: other, status: "void", total: 90 },
      { ...example, id: tenant, status: "draft", total: 100 },
    ],
    "2026-11",
  );
  assert.equal(totals.billed, 40);
  assert.equal(totals.pending, 30);
  assert.equal(totals.overdue, 30);
});
