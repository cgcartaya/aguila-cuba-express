import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';
function load(path, dependencies = {}) {
  const compiled = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { module: compiled, exports: compiled.exports, require: name => dependencies[name], crypto: webcrypto });
  return compiled.exports;
}
const totalsModule = load('lib/shipping/invoice-totals.ts');
const calculate = totalsModule.shipmentInvoiceTotals;
const input = { recipient_name: 'Prueba', recipient_address: '', recipient_phone: '5550100', sender_name: 'Prueba', sender_phone: '5550101', notes: '', contains_package: true, weight_subtotal: 60, contains_money: false, money_total: 0, extra_fees_total: 0, discount_amount: 10, discount_reason: 'Oferta al cliente', amount_paid: 20, selected_fees: [] };
test('the rebate reduces the final bill once, including mixed shipments and fees', () => {
  const result = calculate({ ...input, contains_money: true, money_total: 30, extra_fees_total: 5 });
  assert.equal(result.subtotal, 95);
  assert.equal(result.discount, 10);
  assert.equal(result.total, 85);
  assert.equal(result.paid, 20);
  assert.equal(result.balance, 65);
});
test('supports zero rebate, full rebate, and cents without negative balances', () => {
  assert.equal(calculate({ ...input, discount_amount: 0 }).total, 60);
  assert.equal(calculate({ ...input, discount_amount: 60 }).total, 0);
  assert.equal(calculate({ ...input, discount_amount: 60 }).balance, 0);
  const cents = calculate({ ...input, weight_subtotal: 0.1, extra_fees_total: 0.2, discount_amount: 0.05, amount_paid: 0.1 });
  assert.equal(cents.total, 0.25);
  assert.equal(cents.balance, 0.15);
});
test('rejects negative, non-finite and excessive discounts', () => {
  for (const amount of [-1, NaN, Infinity, 60.01]) {
    assert.throws(() => calculate({ ...input, discount_amount: amount }), /rebaja/);
  }
});
function database() {
  const writes = [];
  return { writes, async rpc(name, args) {
    assert.equal(name, 'create_numbered_shipment');
    return { data: { id: args.p_id, order_number: 1, trip_id: null, ...args.p_payload }, error: null };
  }, from(table) {
    let data;
    const builder = {
      update(value) { data = value; writes.push({ table, update: value }); return this; },
      insert(value) { writes.push({ table, insert: value }); return this; },
      delete() { return this; }, eq() { return this; }, select() { return this; },
      single() { return Promise.resolve({ data: { id: 'shipment', order_number: 1, trip_id: null, ...data }, error: null }); },
      then(resolve) { return Promise.resolve({ data: null, error: null }).then(resolve); },
    };
    return builder;
  } };
}
for (const action of ['createShipment', 'updateShipment']) {
  test(`${action} persists the rebate, total, balance and invoice line`, async () => {
    const db = database();
    const service = load('lib/services/shipping.ts', { '@/lib/supabase': { supabase: db }, '@/lib/shipping/invoice-totals': totalsModule });
    const result = action === 'createShipment' ? await service[action]('agency', input) : await service[action]('agency', 'shipment', input);
    assert.equal(result.error, null);
    const saved = db.writes.find(row => row.table === 'shipments').update;
    assert.equal(saved.discount_amount, 10);
    assert.equal(saved.discount_reason, 'Oferta al cliente');
    assert.equal(saved.service_price, 50);
    assert.equal(saved.balance_due, 30);
    const lines = db.writes.find(row => row.table === 'shipment_items').insert;
    assert.equal(lines.find(row => row.item_type === 'DISCOUNT').total, -10);
    assert.equal(lines.reduce((total, row) => total + row.total, 0), 50);
  });
  test(`${action} rejects excessive rebates before writing`, async () => {
    const db = database();
    const service = load('lib/services/shipping.ts', { '@/lib/supabase': { supabase: db }, '@/lib/shipping/invoice-totals': totalsModule });
    const bad = { ...input, discount_amount: 61 };
    await assert.rejects(action === 'createShipment' ? service[action]('agency', bad) : service[action]('agency', 'shipment', bad), /rebaja/);
    assert.equal(db.writes.length, 0);
  });
}
