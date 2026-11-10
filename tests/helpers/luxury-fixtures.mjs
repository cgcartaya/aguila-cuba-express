import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
const require = createRequire(import.meta.url);
export function loadTravelModule(filename) {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, {
    module: mod, exports: mod.exports, Intl, Date, URL, crypto: webcrypto,
    require: name => name.startsWith('./') ? loadTravelModule(path.join(path.dirname(filename), name + '.ts')) : require(name),
  });
  return mod.exports;
}
export const travelTypes = loadTravelModule('lib/travel/types.ts');
export const legacyRows = JSON.parse(fs.readFileSync('components/landing/luxury/groups.json', 'utf8'));
export const legacyPackages = legacyRows.map((row, index) => ({ id: row.id, store_id: 'luxury', status: 'published', version: 1, updated_at: '', content: { ...travelTypes.emptyTravelContent(), title: row.title, days: row.days, nights: row.nights, countries: row.countries, image: row.image, description: row.route, route: row.route, includes: row.includes, excludes: row.excludes, sort_order: index, departures: [{ id: row.id, start: row.date, end: '', deadline: '', origin: '', status: 'available', pdf: '', rates: row.price !== null ? [{ label: 'Desde · consultar ocupación', amount: row.price }] : [] }] } }));
