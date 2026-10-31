import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const compiled = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/shipping/extra-fee-calculation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: compiled, exports: compiled.exports });
const { calculateExtraFee, extraFeeQuantity } = compiled.exports;
const fee = { configured_amount: 20, calculated_amount: 0, calculation_type: 'fixed' };
test('two phones cost twice the tariff; updating and deselecting are not cumulative', () => {
  const first = calculateExtraFee({ ...fee, quantity: 2 }, 10, 60);
  assert.equal(first.calculated_amount, 40);
  assert.equal(calculateExtraFee({ ...first, quantity: 3 }, 10, 60).calculated_amount, 60);
  assert.equal(calculateExtraFee(first, 10, 60).calculated_amount, 40);
});
test('legacy fees without quantity retain the one-unit calculation', () => {
  assert.equal(extraFeeQuantity(undefined), 1);
  assert.equal(calculateExtraFee(fee, 10, 60).calculated_amount, 20);
});
test('weight and percentage fees keep their formula and support unit counts', () => {
  assert.equal(calculateExtraFee({ ...fee, configured_amount: 2, calculation_type: 'per_lb', quantity: 2 }, 10, 60).calculated_amount, 40);
  assert.equal(calculateExtraFee({ ...fee, configured_amount: 5, calculation_type: 'percentage', quantity: 2 }, 10, 60).calculated_amount, 6);
});
test('rejects zero, negative, fractional and non-finite counts', () => {
  for (const quantity of [0, -1, 1.5, NaN, Infinity, 10000]) assert.throws(() => extraFeeQuantity(quantity));
});
test('rounds each unit in cents before multiplying for a consistent invoice', () => {
  assert.equal(calculateExtraFee({ ...fee, configured_amount: 5, calculation_type: 'percentage', quantity: 2 }, 10, 0.1).calculated_amount, 0.02);
});
