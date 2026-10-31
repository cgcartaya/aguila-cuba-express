import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import QRCode from 'qrcode';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = createRequire(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/package.json`)('playwright')); }
function load(path, dependencies = {}) {
  const compiled = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports, URL, require: name => dependencies[name] || require(name) });
  return compiled.exports;
}
const helper = load('lib/shipping/package-label.ts');
const Label = load('components/shipping/PackageLabelDocument.tsx', { '@/lib/shipping/package-label': helper }).default;
const css = fs.readFileSync('app/admin/(store)/shipping/[id]/label/label.css', 'utf8');
const url = 'https://alvarez-travel.perlamarketplace.com/factura/ACE-12345678';
const qr = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 4, width: 384 });
const contents = [{ description: 'Paquetes de café', quantity: 4 }, { description: 'Jabones', quantity: 2 }, { description: 'Lata de leche condensada', quantity: 1 }];
const data = { agency: 'Álvarez Travel', packageNumber: 2693, trackingCode: 'ACE-12345678', recipient: 'Destinatario de ejemplo', address: 'Calle Enamorado 8, entre 10 de Octubre y Rabí', phone: '+53 5555 0100', sender: 'Remitente de ejemplo', service: 'Express · Comida, medicinas y aseo', destination: 'Diez de Octubre · La Habana · Cuba', weightLb: 20, date: '31/10/2026', contents };
const browser = await chromium.launch({ headless: true, executablePath: process.env.PRINT_QA_CHROMIUM || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
function html(packingList, labelData = data) { return `<html><head><meta charset="utf-8"><style>body{margin:0}${css}@page{size:${packingList ? 'A4' : '4in 6in'};margin:${packingList ? '12mm' : '0'}}</style></head><body><main class="package-print-screen"><div class="package-print-document">${renderToStaticMarkup(React.createElement(Label, { data: labelData, qr, packingList }))}</div></main></body></html>`; }
try {
  await page.setContent(html(false));
  await page.locator('.package-qr img').evaluate(image => image.decode());
  await page.screenshot({ path: '/tmp/perla-package-label.png', fullPage: true });
  const label = await page.locator('.package-label').boundingBox();
  assert.ok(label.height <= 577, `4x6 label is too tall: ${label.height}`);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: '/tmp/perla-package-label.pdf', preferCSSPageSize: true, printBackground: true });
  await page.setContent(html(true, { ...data, contents: Array.from({ length: 100 }, (_, index) => ({ quantity: index + 1, description: `Artículo de comprobación ${index + 1}` })) }));
  assert.equal(await page.locator('tbody tr').count(), 100);
  await page.pdf({ path: '/tmp/perla-package-contents.pdf', preferCSSPageSize: true, printBackground: true });
  assert.equal((await page.locator('tbody tr:last-child').innerText()).trim(), '100\tArtículo de comprobación 100');
  console.log(JSON.stringify({ labelWidth: label.width, labelHeight: label.height, all100ItemsPresent: true, qrTarget: url }));
} finally { await browser.close(); }
