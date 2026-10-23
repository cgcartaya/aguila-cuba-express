import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const module = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('lib/storefront/product-quantity-pricing.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(code, { module, exports: module.exports });
const { applyPlatformFee } = module.exports;

test('actual half-cent prices from the audit round up consistently', () => {
  for (const [base, expected] of [[1,1.03],[3,3.08],[4.2,4.31],[7,7.18],[7.8,8],[11,11.28],[13,13.33],[15,15.38],[93,95.33]]) {
    assert.equal(applyPlatformFee(base, 2.5), expected, `base=${base}`);
  }
});

test('every cent price up to $1000 matches exact integer half-up rounding', () => {
  for (const basisPoints of [0,100,250,375,1000]) {
    for (let cents = 0; cents <= 100000; cents++) {
      const expected = Math.floor((cents * (10000 + basisPoints) + 5000) / 10000) / 100;
      assert.equal(applyPlatformFee(cents / 100, basisPoints / 100), expected);
    }
  }
});

test('fee is rounded per unit before multiplying quantities', () => {
  const price = applyPlatformFee(1, 2.5);
  assert.equal(Math.round((price - 1) * 2 * 100) / 100, 0.06);
});
