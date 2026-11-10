import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { legacyPackages, travelTypes } from './helpers/luxury-fixtures.mjs';
const require = createRequire(import.meta.url), mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/landing/luxury/GroupExplorer.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, { module: mod, exports: mod.exports, Intl, Date, require: name => name === '@/lib/travel/types' ? travelTypes : name === './PackageDetail' ? { travelDate: date => date } : name === './i18n' ? { useLuxuryLanguage: () => ({ language: 'es' }), translateTree: node => node } : name.endsWith('.css') ? new Proxy({}, { get: (_, key) => String(key) }) : require(name) });
const filter = mod.exports.filterPackages;
test('country, month, year and date match the same departure in a managed package', () => {
  const sample = legacyPackages.find(pkg => pkg.content.countries.includes('Japón'));
  const start = sample.content.departures[0].start;
  const result = filter(legacyPackages, 'Japón', start.slice(5, 7), start.slice(0, 4), start, '', 'date');
  assert.ok(result.length > 0);
  for (const pkg of result) assert.ok(pkg.content.departures.some(departure => departure.start >= start && departure.start.startsWith(start.slice(0, 7))));
  assert.equal(filter(legacyPackages, 'No existe', '', '', '', '', 'date').length, 0);
});
test('paused, deleted, expired and sold out offers cannot reappear from a hardcoded fallback', () => {
  const clone = structuredClone(legacyPackages[0]);
  clone.status = 'paused'; assert.equal(filter([clone], '', '', '', '', '', 'date').length, 0);
  clone.status = 'published'; clone.content.departures[0].status = 'sold_out'; assert.equal(filter([clone], '', '', '', '', '', 'date').length, 0);
  clone.content.permanent = true; assert.equal(filter([clone], '', '', '', '', '', 'date').length, 1);
  assert.equal(filter([], '', '', '', '', '', 'date').length, 0);
  assert.equal(filter([clone], '', '01', '', '', '', 'date').length, 0);
});
test('managed catalogue renders links to each programme and keeps migration fixtures out of the component', () => {
  const html = renderToStaticMarkup(React.createElement(mod.exports.default, { packages: legacyPackages }));
  assert.match(html, /30 viajes encontrados/);
  assert.equal((html.match(/Ver programa y salidas/g) || []).length, 30);
  for (const pkg of legacyPackages) assert.ok(html.includes('/viajes/' + pkg.id));
  assert.doesNotMatch(fs.readFileSync('components/landing/luxury/GroupExplorer.tsx','utf8'), /groups\.json/);
});
