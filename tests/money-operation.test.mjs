import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path) { const compiled = { exports: {} }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: compiled, exports: compiled.exports }); return compiled.exports; }
const { resolveOperationTrip, operationContent } = load('lib/shipping/operation-mode.ts');
const { getShippingStatusLabel, getShippingTripStatusLabel } = load('lib/shipping/types.ts');
test('money has no trip even if a default or requested trip was selected', () => {
  for (const trip of [null, undefined, '', 'default-trip', 'requested-trip']) assert.equal(resolveOperationTrip(operationContent('money'), trip), null);
});
test('packages and mixed operations require their selected trip', () => {
  for (const mode of ['package', 'mixed']) {
    assert.throws(() => resolveOperationTrip(operationContent(mode), null), /viaje/);
    assert.equal(resolveOperationTrip(operationContent(mode), 'trip'), 'trip');
  }
});
test('empty operations cannot be saved', () => { assert.throws(() => resolveOperationTrip({ contains_money:false,contains_package:false }, null)); });
test('money status labels describe delivery without changing the stored status codes', () => {
  assert.equal(getShippingStatusLabel('preparing', true), 'Pendiente de entrega');
  assert.equal(getShippingStatusLabel('preparing'), 'Preparando salida');
  assert.equal(getShippingStatusLabel('out_for_delivery', true), 'En reparto');
  assert.equal(getShippingTripStatusLabel('preparing'), 'Preparando salida');
});
