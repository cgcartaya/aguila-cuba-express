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
const feeModule = load('lib/shipping/extra-fee-calculation.ts');
const billingModule = load('lib/shipping/package-billing.ts', { '@/lib/shipping/extra-fee-calculation': feeModule });
const packageModule = load('lib/shipping/package-label.ts');
const totalsModule = load('lib/shipping/invoice-totals.ts');
const calculate = totalsModule.shipmentInvoiceTotals;
const input = { recipient_name: 'Prueba', recipient_address: '', recipient_phone: '5550100', sender_name: 'Prueba', sender_phone: '5550101', notes: '', contains_package: true, weight_subtotal: 60, contains_money: false, money_total: 0, extra_fees_total: 0, discount_amount: 10, discount_reason: 'Oferta al cliente', package_contents: [{ description: 'Paquetes de café', quantity: 4 }, { description: 'Jabones', quantity: 2 }], amount_paid: 20, selected_fees: [] };
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
    const service = load('lib/services/shipping.ts', { '@/lib/supabase': { supabase: db }, '@/lib/shipping/invoice-totals': totalsModule, '@/lib/shipping/package-label': packageModule, '@/lib/shipping/extra-fee-calculation': feeModule, '@/lib/shipping/package-billing': billingModule });
    const result = action === 'createShipment' ? await service[action]('agency', input) : await service[action]('agency', 'shipment', input);
    assert.equal(result.error, null);
    const saved = db.writes.find(row => row.table === 'shipments').update;
    assert.equal(saved.discount_amount, 10);
    assert.equal(saved.package_contents[0].quantity, 4);
    assert.equal(saved.package_contents[1].description, 'Jabones');
    assert.equal(saved.discount_reason, 'Oferta al cliente');
    assert.equal(saved.service_price, 50);
    assert.equal(saved.balance_due, 30);
    const lines = db.writes.find(row => row.table === 'shipment_items').insert;
    assert.equal(lines.find(row => row.item_type === 'DISCOUNT').total, -10);
    assert.equal(lines.reduce((total, row) => total + row.total, 0), 50);
  });
  test(`${action} rejects excessive rebates before writing`, async () => {
    const db = database();
    const service = load('lib/services/shipping.ts', { '@/lib/supabase': { supabase: db }, '@/lib/shipping/invoice-totals': totalsModule, '@/lib/shipping/package-label': packageModule, '@/lib/shipping/extra-fee-calculation': feeModule, '@/lib/shipping/package-billing': billingModule });
    const bad = { ...input, discount_amount: 61 };
    await assert.rejects(action === 'createShipment' ? service[action]('agency', bad) : service[action]('agency', 'shipment', bad), /rebaja/);
    assert.equal(db.writes.length, 0);
  });
}

for (const action of ['createShipment', 'updateShipment']) {
  test(`${action} persists quantities and unit prices for extra fees without double charging`, async () => {
    const db = database();
    const service = load('lib/services/shipping.ts', { '@/lib/supabase': { supabase: db }, '@/lib/shipping/invoice-totals': totalsModule, '@/lib/shipping/package-label': packageModule, '@/lib/shipping/extra-fee-calculation': feeModule, '@/lib/shipping/package-billing': billingModule });
    const charged = { ...input, extra_fees_total: 999, selected_fees: [
      { fee_id: 'phone', fee_name: 'Teléfono', calculation_type: 'fixed', configured_amount: 20, calculated_amount: 40, quantity: 2 },
      { fee_id: 'tablet', fee_name: 'Tablet', calculation_type: 'fixed', configured_amount: 10, calculated_amount: 30, quantity: 3 },
    ] };
    const result = action === 'createShipment' ? await service[action]('agency', charged) : await service[action]('agency', 'shipment', charged);
    assert.equal(result.error, null);
    const saved = db.writes.find(row => row.table === 'shipments').update;
    assert.equal(saved.extra_fees_total, 70);
    assert.equal(saved.service_price, 120); // 60 package + 70 fees - 10 discount
    const charges = db.writes.find(row => row.table === 'shipment_items').insert.filter(row => row.item_type === 'EXTRA_FEE');
    assert.equal(charges[0].quantity, 2);
    assert.equal(charges[0].unit_price, 20);
    assert.equal(charges[0].total, 40);
    const storedFees = db.writes.find(row => row.table === 'shipment_extra_fees').insert;
    assert.equal(storedFees[0].quantity, 2);
    assert.equal(storedFees[1].quantity, 3);
  });
}

test('new money-only operations ignore a trip and keep invoice, driver and principal data', async () => {
  const db = database();
  const service = load('lib/services/shipping.ts', { '@/lib/supabase': { supabase: db }, '@/lib/shipping/invoice-totals': totalsModule, '@/lib/shipping/package-label': packageModule, '@/lib/shipping/extra-fee-calculation': feeModule, '@/lib/shipping/package-billing': billingModule });
  const remittance = { ...input, contains_package: false, contains_money: true, trip_id: 'default-trip', money_amount: 100, money_commission: 10, money_total: 110, discount_amount: 0, amount_paid: 110, assigned_staff_id: 'driver', assigned_driver_name: 'Repartidor' };
  const result = await service.createShipment('agency', remittance);
  assert.equal(result.error, null);
  assert.equal(result.data.trip_id, null);
  assert.equal(result.data.order_number, 1);
  assert.equal(result.data.assigned_staff_id, 'driver');
  assert.equal(result.data.money_amount, 100);
  assert.equal(result.data.service_price, 110);
  const lines = db.writes.find(row => row.table === 'shipment_items').insert;
  assert.equal(lines.some(row => row.item_type === 'PACKAGE'), false);
  assert.equal(lines.find(row => row.item_type === 'MONEY').total, 110);
});

for (const action of ['createShipment', 'updateShipment']) {
  test(`${action} bills fee-only parcels without stale weight charges`, async () => {
    const db = database();
    const service = load('lib/services/shipping.ts', { '@/lib/supabase': { supabase: db }, '@/lib/shipping/invoice-totals': totalsModule, '@/lib/shipping/package-label': packageModule, '@/lib/shipping/extra-fee-calculation': feeModule, '@/lib/shipping/package-billing': billingModule });
    const parcel = { ...input, package_billing_mode: 'fees_only', weight_lb: 10, rate_per_lb: 6, weight_subtotal: 60, discount_amount: 0, selected_fees: [{ fee_id:'phone',fee_name:'Teléfono',calculation_type:'fixed',configured_amount:20,quantity:2,calculated_amount:999 }] };
    const result = action === 'createShipment' ? await service[action]('agency', parcel) : await service[action]('agency', 'shipment', parcel);
    assert.equal(result.error, null);
    const saved = db.writes.find(row => row.table === 'shipments').update;
    assert.equal(saved.package_billing_mode,'fees_only');
    assert.equal(saved.contains_package,true);
    assert.equal(saved.weight_lb,0);
    assert.equal(saved.rate_per_lb,0);
    assert.equal(saved.weight_subtotal,0);
    assert.equal(saved.service_price,40);
    const lines=db.writes.find(row=>row.table==='shipment_items').insert;
    assert.equal(lines.some(row=>row.item_type==='PACKAGE'),false);
    assert.equal(lines.find(row=>row.item_type==='EXTRA_FEE').quantity,2);
    assert.equal(lines.find(row=>row.item_type==='EXTRA_FEE').unit_price,20);
  });
}
