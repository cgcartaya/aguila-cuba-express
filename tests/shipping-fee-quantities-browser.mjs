import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const browserRequire = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? createRequire(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/package.json`) : require;
const qaRequire = process.env.PRINT_QA_NODE_MODULES ? createRequire(`${process.env.PRINT_QA_NODE_MODULES}/package.json`) : require;
const { chromium } = browserRequire('playwright');
const esbuild = qaRequire('esbuild');
const bundle = await esbuild.build({
  stdin: { contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import Form from './components/admin/shipping/ShipmentForm';
    const shipment = { id:'demo', customer_id:'customer', contains_package:true, contains_money:false, weight_lb:10, service_type_id:'s', country_id:'c', recipient_name:'Test',recipient_phone:'5550100',sender_name:'Test',sender_phone:'5550101',status:'preparing' };
    const fees=[{id:'phone',name:'Teléfono',amount:20,calculation_type:'fixed',is_active:true},{id:'tablet',name:'Tablet',amount:10,calculation_type:'fixed',is_active:true}];
    createRoot(document.getElementById('root')).render(<Form storeId="agency" shipment={shipment} drivers={[]} settings={null} countries={[{id:'c',name:'Cuba',is_active:true}]} provinces={[]} municipalities={[]} locations={[]} serviceTypes={[{id:'s',name:'Express',code:'EXPRESS',is_active:true}]} rates={[{id:'rate',service_type_id:'s',scope_type:'country',country_id:'c',rate_per_lb:6,is_active:true}]} extraFees={fees} submitting={false} onSubmit={async value=>{window.savedShipment=value;}} />);`, resolveDir: process.cwd(), loader: 'jsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'local-alias', setup(build) {
    build.onResolve({ filter: /^@\/components\/admin\/shipping\/CustomerRecipientPicker$/ }, () => ({ path: 'picker', namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export default function Picker(){return null}', loader: 'jsx' }));
    build.onResolve({ filter: /^@\// }, args => ({ path: path.resolve(process.cwd(), args.path.slice(2) + (path.extname(args.path) ? '' : args.path.startsWith('@/components/') ? '.tsx' : '.ts')) }));
  } }],
});
const browser = await chromium.launch({ headless: true, executablePath: process.env.PRINT_QA_CHROMIUM || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setContent('<html><body><div id="root"></div></body></html>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const total = page.getByLabel('Total final (USD)', { exact: true });
  await total.waitFor();
  await page.waitForFunction(() => document.querySelectorAll('input').length > 10);
  assert.equal(await total.inputValue(), '60.00');
  await page.getByLabel('Teléfono', { exact: true }).check();
  await page.getByLabel('Cantidad de Teléfono').fill('2');
  await page.waitForFunction(() => [...document.querySelectorAll('label')].find(e => e.textContent.startsWith('Total final (USD)'))?.querySelector('input')?.value === '100.00');
  await page.getByLabel('Tablet', { exact: true }).check();
  await page.getByLabel('Cantidad de Tablet').fill('3');
  await page.waitForFunction(() => [...document.querySelectorAll('label')].find(e => e.textContent.startsWith('Total final (USD)'))?.querySelector('input')?.value === '130.00');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  const saved = await page.evaluate(() => window.savedShipment);
  assert.equal(saved.extra_fees_total, 70);
  assert.equal(saved.selected_fees[0].quantity, 2);
  assert.equal(saved.selected_fees[1].quantity, 3);
  await page.getByLabel('Teléfono', { exact: true }).uncheck();
  await page.waitForFunction(() => [...document.querySelectorAll('label')].find(e => e.textContent.startsWith('Total final (USD)'))?.querySelector('input')?.value === '90.00');
  assert.equal(await page.getByLabel('Cantidad de Teléfono').count(), 0);
  assert.deepEqual(errors, []);
  console.log('Browser: phone ×2 + tablet ×3, saved quantities and deselection totals verified.');
} finally { await browser.close(); }
