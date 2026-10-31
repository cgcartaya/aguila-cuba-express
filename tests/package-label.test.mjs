import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jsx from 'react/jsx-runtime';
function load(path, dependencies = {}) {
  const compiled = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports, URL, require: name => dependencies[name] });
  return compiled.exports;
}
const helpers = load('lib/shipping/package-label.ts');
const { normalizePackageContents, packageNumber, packageInvoiceUrl } = helpers;
const ContentsList = load('components/shipping/PackageContentsList.tsx', { '@/lib/shipping/package-label': helpers, 'react/jsx-runtime': jsx }).default;
const Label = load('components/shipping/PackageLabelDocument.tsx', { '@/lib/shipping/package-label': helpers, 'react/jsx-runtime': jsx }).default;
test('normalizes optional content, trims descriptions and ignores blank editor rows', () => {
  assert.equal(normalizePackageContents(undefined).length, 0);
  const rows = normalizePackageContents([{ description: ' Café ', quantity: 4 }, { description: '', quantity: 1 }, { description: 'Jabones', quantity: 2 }]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].description, 'Café');
  assert.equal(rows[0].quantity, 4);
});
test('rejects incomplete, excessive and invalid quantities and descriptions', () => {
  for (const rows of ['not-an-array', Array(101).fill({ description: 'Café', quantity: 1 }), [{ description: '', quantity: 4 }], [{ description: 'a'.repeat(161), quantity: 1 }], ...[0, -1, NaN, Infinity, 1.001].map(quantity => [{ description: 'Café', quantity }])]) {
    assert.throws(() => normalizePackageContents(rows));
  }
});
test('package numbers are stable, zero padded and never truncated', () => {
  assert.equal(packageNumber(2693), 'PKG-00002693');
  assert.equal(packageNumber('10000000001'), 'PKG-10000000001');
  assert.equal(packageNumber(null), 'Pendiente');
});
test('QR points to the public invoice on the correct tenant host', () => {
  assert.equal(packageInvoiceUrl({ domain: 'example.com' }, 'ACE-12345678', 'https://admin.example.org'), 'https://example.com/factura/ACE-12345678');
  assert.equal(packageInvoiceUrl({ subdomain: 'alvarez-travel' }, 'ACE-12345678', 'https://admin.example.org'), 'https://alvarez-travel.perlamarketplace.com/factura/ACE-12345678');
  assert.equal(packageInvoiceUrl({}, 'ACE-12345678', 'https://example.org/path'), 'https://example.org/factura/ACE-12345678');
  assert.throws(() => packageInvoiceUrl({}, '', 'https://example.org'));
});
const data = { agency: 'Agencia de prueba', packageNumber: 2693, trackingCode: 'ACE-12345678', recipient: 'Destinatario de prueba', address: 'Calle de prueba 123', phone: '5550100', sender: 'Remitente de prueba', service: 'Express', destination: 'La Habana · Cuba', weightLb: 20, date: '31/10/2026', contents: Array.from({ length: 12 }, (_, i) => ({ description: `Artículo ${i + 1}`, quantity: i + 1 })) };
test('all declared items appear in invoices and packing lists, including escaped text', () => {
  const contents = [...data.contents, { description: '<script>alert(1)</script>', quantity: 1 }];
  const invoice = renderToStaticMarkup(React.createElement(ContentsList, { items: contents }));
  const sheet = renderToStaticMarkup(React.createElement(Label, { data: { ...data, contents }, packingList: true, qr: null }));
  for (const markup of [invoice, sheet]) {
    assert.ok(markup.includes('Artículo 12'));
    assert.ok(markup.includes('&lt;script&gt;'));
    assert.ok(!markup.includes('<script>'));
  }
});
test('label includes its identifier, destination, converted weight and explicit continuation notice', () => {
  const markup = renderToStaticMarkup(React.createElement(Label, { data, qr: 'data:image/png;base64,TEST' }));
  for (const value of ['PKG-00002693', 'La Habana', '20.00 lb', '9.07 kg', 'Lista completa en la factura', 'ESCANEA LA FACTURA']) assert.ok(markup.includes(value));
  assert.ok(!markup.includes('Artículo 12'));
});
