import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(path, dependencies) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, console, require: name => dependencies[name] ?? require(name) });
  return module.exports;
}
test('shipping revenue reads beyond 1000 invoices and propagates later-page errors', async () => {
  for (const fail of [false, true]) {
    const pages = [];
    const filters = [];
    const client = { from(table) {
      assert.equal(table, 'shipping_platform_charges');
      return { select() { return this; }, order() { return this; },
        gte(...args) { filters.push(args); return this; }, lt(...args) { filters.push(args); return this; },
        range: async (start, end) => {
          pages.push([start, end]);
          return start === 0 ? { data: Array.from({ length: 1000 }, (_, i) => ({ shipment_id: String(i), amount: '0.40' })) }
            : fail ? { error: new Error('denied') } : { data: [{ shipment_id: 'last', amount: '0.60' }] };
        } };
    } };
    const { getShippingPlatformRevenue } = load('lib/services/shipping-platform-revenue.ts', { '@/lib/supabase': { supabase: client } });
    if (fail) await assert.rejects(getShippingPlatformRevenue('from', 'to'), /denied/);
    else assert.equal((await getShippingPlatformRevenue('from', 'to')).length, 1001);
    assert.deepEqual(pages, [[0, 999], [1000, 1999]]);
    assert.deepEqual(filters[0], ['created_at', 'from']);
    assert.deepEqual(filters[1], ['created_at', 'to']);
  }
});
test('SaaS adds historical shipping fees to sales and fixed subscriptions with a source breakdown', async () => {
  const state = []; let cursor = 0; let effect;
  const react = { ...React, useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], v => { state[i] = v; }]; },
    useMemo: fn => fn(), useEffect: fn => { effect = fn; } };
  const query = { select() { return this; }, gte() { return this; }, lt() { return this; },
    gt: async () => ({ data: [{ store_id: 'a', platform_fee_amount: 2.5 }] }) };
  const Component = load('components/admin/saas/SaasPlatformRevenue.tsx', {
    react, '@/lib/supabase': { supabase: { from: () => query } },
    '@/lib/services/shipping-platform-revenue': { getShippingPlatformRevenue: async () => [
      { store_id: 'a', amount: '0.40' }, { store_id: 'a', amount: '0.60' }, { store_id: 'b', amount: '0.40' },
    ] },
  }).default;
  const props = { subscriptions: 15, stores: [{ id: 'a', name: 'Alvarez Travel' }, { id: 'b', name: 'Otra agencia' }], variant: 'summary' };
  Component(props); effect(); await new Promise(resolve => setImmediate(resolve)); cursor = 0;
  const html = renderToStaticMarkup(Component(props));
  assert.match(html, /\$18\.90/); assert.match(html, /Comisiones \$3\.90/);
  assert.match(html, /Ventas: \$2\.50/); assert.match(html, /Envíos: \$1\.00 \(2 facturas\)/);
  assert.match(html, /Otra agencia/);
});
