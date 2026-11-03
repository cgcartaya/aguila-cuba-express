import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(path, dependencies = {}, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, ...globals, require: name => name in dependencies ? dependencies[name] : require(name) });
  return module.exports;
}
const ui = load('components/admin/remittances/RemittanceInbox.tsx', { 'next/link': ({ children, ...props }) => React.createElement('a', props, children) });
const { receivedAmountMatches } = load('components/admin/remittances/RemittanceActionDialog.tsx', { './RemittanceInbox': ui });
const order = { id: 'order-0001', payload: { sender_name: 'Remitente', sender_phone: '3055550100', recipient_name: 'Destinatario', recipient_phone: '5355550100', recipient_address: '<script>unsafe</script>', recipient_province: 'La Habana' }, amount: 100, commission: 10, total: 110, status: 'pending', shipment_id: null, payment_reference: null, created_at: '2026-11-03T12:00:00Z' };
const noop = () => {};
function render(orders, extra = {}) {
  return renderToStaticMarkup(React.createElement(ui.default, { storeName: 'Agencia nueva', orders, status: 'pending', page: 0, search: '', loading: false, busy: false, error: '', success: null, onStatus: noop, onSearch: noop, onRefresh: noop, onPage: noop, onConfirm: noop, onCancel: noop, ...extra }));
}
test('pending orders show amount, commission, total and explicit conversion action', () => {
  const html = render([order]);
  assert.match(html, /Confirmar pago y crear envío/); assert.match(html, /\$100\.00/); assert.match(html, /\$10\.00/); assert.match(html, /\$110\.00/);
  assert.match(html, /Resumen de la página actual/); assert.match(html, /Agencia nueva/); assert.doesNotMatch(html, /<script>unsafe/);
  assert.doesNotMatch(html, /href="\/admin\/shipping\/order-0001/);
});
test('converted orders and success banner link to existing invoice and edit pages', () => {
  const html = render([{ ...order, status: 'paid', shipment_id: 'shipment-1', payment_reference: 'TX123' }], { status: 'paid', success: { text: 'Creado', shipmentId: 'shipment-1' } });
  assert.equal((html.match(/href="\/admin\/shipping\/shipment-1\/invoice"/g) || []).length, 2);
  assert.equal((html.match(/href="\/admin\/shipping\/shipment-1\/edit"/g) || []).length, 2);
  assert.doesNotMatch(html, /href="\/admin\/shipping\/shipment-1"/);
  assert.doesNotMatch(html, /Confirmar pago y crear envío/); assert.match(html, /TX123/);
});
test('cancelled orders cannot confirm or expose a nonexistent invoice', () => {
  const html = render([{ ...order, status: 'cancelled' }], { status: 'cancelled' });
  assert.doesNotMatch(html, /Confirmar pago y crear envío|Ver factura/);
});
test('search is explicitly limited to the current page and supports names/references', () => {
  assert.match(render([order], { search: 'nadie' }), /No encontramos coincidencias/);
  assert.match(render([order], { search: 'destinatario' }), /Confirmar pago y crear envío/);
  assert.match(render([{ ...order, payment_reference: 'TXABC' }], { search: 'txabc' }), /Confirmar pago y crear envío/);
});
test('received amount must match total; invalid or sub-cent values cannot confirm', () => {
  for (const value of ['110', '110.00', '110,00']) assert.equal(receivedAmountMatches(value, 110), true);
  for (const value of ['', '100', '110.001', 'Infinity', '-110', '1e2', '110.01']) assert.equal(receivedAmountMatches(value, 110), false);
});
test('design fixture route never renders outside Vercel preview', () => {
  for (const environment of ['production', undefined]) {
    const route = load('app/design-preview/remittance-inbox/page.tsx', { 'next/navigation': { notFound() { throw new Error('404'); } }, '@/components/admin/remittances/RemittanceInboxPreview': { default: noop } }, { process: { env: { VERCEL_ENV: environment } } });
    assert.throws(() => route.default(), /404/);
  }
});
