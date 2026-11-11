import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path) {
  const exports = {};
  const source = readFileSync(path, 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports });
  return exports;
}

const { customsChargesTotal, normalizeCustomsCharges } = load('lib/shipping/customs-charges.ts');
const { shipmentInvoiceTotals } = load('lib/shipping/invoice-totals.ts');

test('customs charges add to weight and configured fees once', () => {
  const charges = normalizeCustomsCharges([{ description: ' PlayStation ', amount: 25 }]);
  assert.equal(charges[0].description, 'PlayStation');
  const invoice = shipmentInvoiceTotals({
    contains_package: true, weight_subtotal: 30, contains_money: false,
    money_total: 0, extra_fees_total: 2.5 + customsChargesTotal(charges),
    discount_amount: 0, amount_paid: 10,
  });
  assert.equal(invoice.total, 57.5);
  assert.equal(invoice.balance, 47.5);
});

test('customs charges require a named article and positive USD cents', () => {
  for (const charge of [{ description: '', amount: 25 }, { description: 'Item', amount: 0 }, { description: 'Item', amount: 1.005 }]) {
    assert.throws(() => normalizeCustomsCharges([charge]), /cargo aduanal/);
  }
});
