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
  billing_month: "2026-11-01",
  quote_revision: "a".repeat(32),
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
  subscription_amount: 25,
  order_commission: 10,
  shipping_commission: 5,
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
  for (const discount of [-1, NaN, Infinity, 0.001])
    assert.equal(
      model.commandSchema.safeParse({ action: "create", ...create(), discount })
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
  assert.match(pdf.toString("latin1"), /Comisi.n de pedidos/);
  assert.match(pdf.toString("latin1"), /Comisi.n de env.os/);
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
  const selected = invoiceTotals(
    [example, { ...example, id: other, store_id: other, total: 90, paid: 30 }],
    "2026-11",
    tenant,
    [
      { invoice_id: example.id, paid_on: "2026-11-10", amount: 10 },
      { invoice_id: other, paid_on: "2026-11-10", amount: 30 },
    ],
  );
  assert.equal(selected.billed, 40);
  assert.equal(selected.collected, 10);
  assert.equal(selected.pending, 30);
});

test("mixed invoices allocate each charge once and respect legacy settlement cutoffs", async () => {
  const db = new PGlite();
  const month = "2025-11-01";
  const execMigration = (file) =>
    db.exec(fs.readFileSync(`supabase/migrations/${file}`, "utf8"));
  const command = async (action, data) =>
    (
      await db.query("select saas_billing_command($1,$2,$3) as result", [
        actor,
        action,
        data,
      ])
    ).rows[0].result;
  const quote = async (store = tenant) =>
    (
      await db.query("select saas_billing_preview($1,$2,$3) as result", [
        actor,
        store,
        month,
      ])
    ).rows[0].result;
  const cycle = async (store = tenant, period = month) =>
    (
      await db.query("select saas_commission_cycle($1,$2,$3) as result", [
        actor,
        store,
        period,
      ])
    ).rows[0].result;
  const cycleAmount = (rows, kind, state) =>
    rows.find((row) => row.kind === kind && row.state === state)?.amount ?? 0;
  const invoiceRequest = (estimate, store = tenant) => ({
    ...create(),
    store_id: store,
    billing_month: month,
    quote_revision: estimate.revision,
  });
  try {
    await db.exec(bootstrap);
    await db.exec(`
      create schema private;
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      alter table stores add column created_at timestamptz default '2025-01-01';
      create table platform_fee_settlements(store_id uuid, period_end timestamptz);
      create table orders(id uuid default gen_random_uuid(), store_id uuid, source_shipment_id text,
        created_at timestamptz, platform_fee_amount numeric, lym_confirmed_at timestamptz,
        lym_sale_state text, platform_fixed_fee_amount numeric);
      create table shipping_platform_charges(shipment_id text, store_id uuid, created_at timestamptz, amount numeric);
      insert into platform_fee_settlements values ('${tenant}', '2025-11-05 12:00Z');
      insert into orders(store_id,source_shipment_id,created_at,platform_fee_amount) values
        ('${tenant}',null,'2025-11-05 12:00Z',500),
        ('${tenant}',null,'2025-11-06 12:00Z',3.50),
        ('${tenant}','shipment-order','2025-11-06 12:00Z',500),
        ('${other}',null,'2025-11-06 12:00Z',12);
      insert into shipping_platform_charges values
        ('included','${tenant}','2025-12-01 04:59Z',0.40),
        ('next-month','${tenant}','2025-12-01 05:00Z',0.40);
    `);
    await execMigration("20261117190000_saas_subscription_billing.sql");
    await command("create", {
      ...create(),
      store_id: other,
      issued_on: "2025-11-12",
      due_on: "2025-11-15",
      period: "noviembre de 2025",
      subtotal: 60,
    });
    await execMigration("20261117235500_saas_billing_commissions.sql");
    await execMigration(
      "20261118001500_store_order_fees_and_commission_cycles.sql",
    );
    assert.equal(cycleAmount(await cycle(), "order", "unbilled"), 3.5);
    assert.equal(cycleAmount(await cycle(null), "order", "unbilled"), 15.5);
    const estimate = await quote();
    assert.deepEqual(
      [estimate.subscription, estimate.orders, estimate.shipping],
      [40, 3.5, 0.4],
    );
    assert.equal((await quote(other)).subscription, 0);
    assert.equal((await quote(other)).orders, 12);
    assert.equal(estimate.order_rows, undefined);
    const draft = await command("create", {
      ...invoiceRequest(estimate),
      draft: true,
    });
    const requests = [invoiceRequest(estimate), invoiceRequest(estimate)];
    const settled = await Promise.allSettled(
      requests.map((data) => command("create", data)),
    );
    assert.equal(settled[0].status, "fulfilled");
    assert.equal(settled[1].status, "rejected");
    const issued = settled[0].value;
    assert.equal(Number(issued.total), 43.9);
    assert.equal(cycleAmount(await cycle(), "order", "unbilled"), 0);
    assert.equal(cycleAmount(await cycle(), "order", "pending"), 3.5);
    assert.equal(cycleAmount(await cycle(), "shipping", "pending"), 0.4);
    assert.equal((await command("create", requests[0])).id, issued.id);
    assert.equal((await quote()).subtotal, 0);
    await assert.rejects(
      command("issue", { invoice_id: draft.id }),
      /desactualizado/,
    );
    await assert.rejects(
      db.exec(
        `insert into platform_fee_settlements values ('${tenant}', now())`,
      ),
      /Facturación SaaS/,
    );
    await command("void", {
      invoice_id: issued.id,
      reason: "Prueba de corrección",
    });
    assert.equal((await quote()).subtotal, 43.9);
    assert.equal(cycleAmount(await cycle(), "shipping", "pending"), 0);
    assert.equal(cycleAmount(await cycle(), "shipping", "unbilled"), 0.4);
    const replacement = await command("issue", { invoice_id: draft.id });
    assert.equal(Number(replacement.total), 43.9);
    assert.equal((await quote()).subtotal, 0);
    await db.exec(
      `insert into orders(store_id,created_at,platform_fee_amount) values ('${tenant}','2025-11-30 12:00Z',2)`,
    );
    const supplemental = await quote();
    assert.deepEqual(
      [supplemental.subscription, supplemental.orders, supplemental.shipping],
      [0, 2, 0],
    );
    const supplementalInvoice = await command(
      "create",
      invoiceRequest(supplemental),
    );
    const pay = {
      invoice_id: supplementalInvoice.id,
      request_id: randomUUID(),
      paid_on: "2026-11-17",
      amount: 2,
      method: "Zelle",
      reference: "",
      notes: "",
    };
    assert.equal((await command("pay", pay)).status, "paid");
    assert.equal(
      (
        await db.query("select last_payment_date from stores where id=$1", [
          tenant,
        ])
      ).rows[0].last_payment_date,
      null,
    );
    await assert.rejects(
      command("void", {
        invoice_id: supplementalInvoice.id,
        reason: "Ya pagada",
      }),
      /con pagos/,
    );
    assert.equal((await quote()).subtotal, 0);
    assert.equal(cycleAmount(await cycle(), "order", "paid"), 2);
    assert.equal(cycleAmount(await cycle(), "order", "pending"), 3.5);
    await command("pay", {
      ...pay,
      invoice_id: replacement.id,
      request_id: randomUUID(),
      amount: 3,
    });
    assert.equal(cycleAmount(await cycle(), "order", "pending"), 3.5);
    await command("pay", {
      ...pay,
      invoice_id: replacement.id,
      request_id: randomUUID(),
      amount: 40.9,
    });
    const paidCycle = await cycle();
    assert.equal(cycleAmount(paidCycle, "order", "pending"), 0);
    assert.equal(cycleAmount(paidCycle, "shipping", "pending"), 0);
    assert.equal(cycleAmount(paidCycle, "order", "paid"), 5.5);
    assert.equal(cycleAmount(paidCycle, "shipping", "paid"), 0.4);
    assert.equal(
      cycleAmount(await cycle(tenant, "2025-12-01"), "shipping", "unbilled"),
      0.4,
    );

    await db.exec(`grant update,select on stores to authenticated;
      set role authenticated; set request.jwt.claim.sub='${owner}'`);
    await assert.rejects(
      db.exec(
        `update stores set platform_order_fixed_fee=0.75 where id='${tenant}'`,
      ),
      /administrador SaaS/,
    );
    await db.exec(`set request.jwt.claim.sub='${actor}';
      update stores set platform_order_fixed_fee=0 where id='${tenant}';
      reset role;
      insert into orders(store_id,created_at,lym_sale_state) values ('${tenant}',now(),'requested');
      update orders set lym_sale_state='confirmed',platform_fixed_fee_amount=0.30,platform_fee_amount=0.30
        where lym_sale_state='requested';`);
    assert.equal(
      (
        await db.query(
          "select platform_fee_amount from orders where lym_sale_state='confirmed'",
        )
      ).rows[0].platform_fee_amount,
      "0",
    );
  } finally {
    await db.close();
  }
});
