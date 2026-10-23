import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const module = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('lib/config/features.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(code, { module, exports: module.exports });
const { getPlatformOrderFixedFee, PLATFORM_ORDER_FIXED_FEE } = module.exports;

test('the new agreement applies only to Águila', () => {
  assert.equal(getPlatformOrderFixedFee('aguila'), 0.50);
  for (const slug of ['yoyo', 'tumercadolajero', 'combos-martinez', '', 'new-store']) {
    assert.equal(getPlatformOrderFixedFee(slug), 0.30);
  }
});

test('legacy fallback stays at 30 cents for previously created orders', () => {
  assert.equal(PLATFORM_ORDER_FIXED_FEE, 0.30);
});
