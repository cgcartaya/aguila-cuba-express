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
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, console, URL, process, ...globals, require: name => name in dependencies ? dependencies[name] : name === '@/components/shipping/RemittanceDeliveryDetails' ? deliveryDetails : name === '@/components/shipping/AlvarezInvoice' ? compactInvoice : require(name) });
  return module.exports;
}
const branding = load('lib/saas/store-branding.ts');
const delivery = load('lib/shipping/remittance-delivery.ts');
const deliveryDetails = load('components/shipping/RemittanceDeliveryDetails.tsx', { '@/lib/shipping/remittance-delivery': delivery });
const compactInvoice = load('components/shipping/AlvarezInvoice.tsx', {
  '@/lib/shipping/remittance-delivery': delivery,
  '@/lib/shipping/package-label': { packageNumber: value => String(value) },
});
const stores = [
  { id: 'alvarez', name: 'Álvarez Travel', slug: 'alvarez-travel', domain: 'alvarez-travel.com', has_landing: true },
  { id: 'aguila', name: 'Aguila Express USA', slug: 'aguila', domain: 'aguilaexpressusa.com', has_landing: true },
  { id: 'new', name: 'Agencia Nueva', slug: 'agencia-nueva', subdomain: 'agencia-nueva', has_landing: false },
];
for (const store of stores) {
  test(`${store.name}: own identity, website and contact`, () => {
    const brand = branding.storeBranding(store, { whatsapp: '+1 305 555 0100', logo_url: `/${store.id}.png` });
    assert.equal(brand.name, store.name);
    assert.equal(brand.logoUrl, `/${store.id}.png`);
    assert.equal(brand.whatsappUrl, 'https://wa.me/13055550100');
    assert.equal(brand.origin, `https://${store.domain || store.subdomain + '.perlamarketplace.com'}`);
    assert.equal(brand.storefrontUrl, brand.origin + (store.has_landing ? '/tienda' : ''));
  });
}
test('new store without branding has neutral defaults and no other agency contact', () => {
  const empty = branding.storeBranding();
  assert.equal(empty.name, 'Agencia de envíos');
  for (const key of ['logoUrl', 'website', 'whatsappUrl', 'origin', 'storefrontUrl']) assert.equal(empty[key], null);
  assert.equal(branding.storeBranding({ name: 'Nueva', slug: 'nueva' }).storefrontUrl, 'https://perlamarketplace.com/tienda/nueva');
  assert.equal(branding.storeBranding({ ...stores[0], module_store_enabled: false }).storefrontUrl, null);
  assert.equal(branding.publicStoreOrigin({ domain: 'evil.test/path?x=1' }), null);
});
function database(tables) {
  const calls = [];
  const client = { from(table) {
    const call = { table, filters: [], fields: '' }; calls.push(call);
    const chain = { select(fields) { call.fields = fields; return this; }, eq(k, v) { call.filters.push([k, v]); return this; }, is() { return this; }, ilike() { return this; }, order() { return this; }, limit() { return this; },
      async maybeSingle() { return { data: tables[table] ?? null, error: null }; },
      then(resolve) { return Promise.resolve({ data: tables[table] ?? [], error: null }).then(resolve); },
    }; return chain;
  } }; return { client, calls };
}
test('public identity fetch uses the same explicit tenant in both tables and an allowlist', async () => {
  const db = database({ stores: stores[0], store_settings: { store_name: 'Álvarez', whatsapp: '+13050000001' } });
  const service = load('lib/services/store-branding.ts', { '@/lib/supabase-public': { publicSupabase: db.client }, '@/lib/saas/store-branding': branding });
  const result = await service.getPublicStoreBranding('alvarez');
  assert.equal(result.name, 'Álvarez');
  for (const c of db.calls) { assert.deepEqual(c.filters, [[c.table === 'stores' ? 'id' : 'store_id', 'alvarez']]); assert.ok(!c.fields.includes('*')); assert.doesNotMatch(c.fields, /secret|client_email|notes/); }
  const before = db.calls.length; await service.getPublicStoreBranding(null); assert.equal(db.calls.length, before);
});
test('settings alone cannot impersonate an unresolved store', async () => {
  const db = database({ store_settings: { store_name: 'Old agency' } });
  const service = load('lib/services/store-branding.ts', { '@/lib/supabase-public': { publicSupabase: db.client }, '@/lib/saas/store-branding': branding });
  assert.equal((await service.getPublicStoreBranding('missing')).name, 'Agencia de envíos');
});
test('host resolution matches only its domain/subdomain; unknown hosts never choose Aguila', async () => {
  const queried = [];
  const metadata = load('lib/saas/store-metadata.ts', {}, {
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://db.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public' } },
    fetch: async url => { const u = new URL(url); queried.push(u); const found = stores.filter(s => ['slug','domain','subdomain'].every(k => !u.searchParams.has(k) || `eq.${s[k]}` === u.searchParams.get(k))); return { ok: true, json: async () => found }; },
  });
  const resolver = load('lib/saas/public-store-resolution.ts', { '@/lib/saas/store-metadata': metadata });
  assert.equal((await resolver.resolvePublicStore('', 'www.alvarez-travel.com:443')).id, 'alvarez');
  assert.equal((await resolver.resolvePublicStore('', 'agencia-nueva.perlamarketplace.com')).id, 'new');
  assert.equal((await resolver.resolvePublicStore('alvarez-travel', 'perlamarketplace.com')).id, 'alvarez');
  assert.equal(await resolver.resolvePublicStore('', 'unknown.test'), null);
  assert.equal(await resolver.resolvePublicStore('', 'perlamarketplace.com'), null);
  assert.equal(await resolver.resolvePublicStore('bad,slug', 'alvarez-travel.com'), null);
  assert.ok(queried.every(u => !u.searchParams.has('or')));
});
function lookupHarness(store) {
  const db = database({ shipping_customers: { id: 'customer', name: 'Test', customer_code: 'TEST' }, shipments: [] });
  const route = load('app/api/public/customer-portal/lookup/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/saas/public-store-resolution': { resolvePublicStore: async () => store },
    '@/lib/supabase-admin': { supabaseAdmin: db.client },
  }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://db.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public' } } });
  return { ...db, post: () => route.POST({ headers: new Map([['host', 'unknown.test']]), json: async () => ({ phone: '3055550100', customerCode: 'TEST' }) }) };
}
test('customer portal on unknown host stops before querying any customer', async () => {
  const h = lookupHarness(null); assert.equal((await h.post()).status, 404); assert.equal(h.calls.length, 0);
});
for (const store of stores) test(`customer portal scopes both customer and shipment to ${store.id}`, async () => {
  const h = lookupHarness(store); assert.equal((await h.post()).status, 200);
  assert.equal(h.calls.length, 2);
  for (const c of h.calls) assert.ok(c.filters.some(([key, value]) => key === 'store_id' && value === store.id));
});
const nullComponent = () => null;
const shipment = { id: 'shipment', store_id: 'alvarez', tracking_code: 'ACE-12345678', created_at: '2026-11-03', contains_package: false, contains_money: true, money_discount: 0, money_amount: 100, money_commission: 10, service_price: 110, balance_due: 110, amount_paid: 0 };
function stateReact(values) { let index = 0; return { ...React, use: () => ({ id: 'shipment' }), useState: () => [values[index++], () => {}], useEffect() {} }; }
for (const store of stores) test(`invoice rendering prints ${store.name} without another agency`, () => {
  const brand = branding.storeBranding(store);
  const Page = load('app/admin/(store)/shipping/[id]/invoice/page.tsx', {
    react: stateReact([{ ...shipment, store_id: store.id }, [], false, '']),
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    '@/hooks/useStore': { useStore: () => ({ store, loading: false }) },
    '@/hooks/useAdminAccess': { useAdminAccess: () => ({ store, loading: false, isSuperAdmin: false }) },
    '@/hooks/useStoreBranding': { useStoreBranding: () => brand },
    '@/lib/shipping/package-label': { packageNumber: () => '' },
    '@/components/shipping/PackageContentsList': nullComponent,
    '@/components/admin/shipping/InvoiceActions': nullComponent,
    '@/components/admin/shipping/PrintInvoiceButton': nullComponent,
    '@/lib/services/shipping': {},
    '@/lib/shipping/types': { getShippingStatusLabel: () => 'Recibido' },
  }).default;
  const html = renderToStaticMarkup(React.createElement(Page, { params: Promise.resolve({ id: 'shipment' }) }));
  assert.ok(html.includes(store.name)); assert.ok(html.includes(brand.website));
  for (const other of stores.filter(s => s.id !== store.id)) { assert.ok(!html.includes(other.name)); if (other.domain) assert.ok(!html.includes(other.domain)); }
  assert.ok(html.includes('110.00'));
});
test('public invoice and receipt rendering use the document brand', () => {
  const brand = branding.storeBranding(stores[0]);
  const data = { shipment, items: [], brand, store_name: brand.name, receipt: { folio: 'REC-TEST', amount: 110 } };
  for (const file of ['app/factura/[trackingCode]/page.tsx','app/recibo/[folio]/page.tsx']) {
    const Page = load(file, {
      react: stateReact([data, false, '']),
      '@/components/public/invoice/PublicInvoiceButtons': nullComponent,
      '@/components/shipping/PackageContentsList': nullComponent,
      '@/lib/shipping/package-label': { packageNumber: () => '' },
      '@/lib/shipping/types': { getShippingStatusLabel: () => 'Recibido' },
      '@/lib/services/public-shipping-invoice': {}, '@/lib/services/public-payment-receipt': {},
    }).default;
    const html = renderToStaticMarkup(React.createElement(Page, { params: Promise.resolve({}) }));
    assert.ok(html.includes('Álvarez Travel')); assert.ok(html.includes('https://alvarez-travel.com')); assert.doesNotMatch(html, /aguila|yoyo/i);
  }
});
test('shared public components cannot reintroduce fixed agency names or contact numbers', () => {
  for (const file of [
    'components/tracking/TrackingView.tsx', 'components/pickups/PickupPlannerHero.tsx', 'components/pickups/UpcomingPickupRoutes.tsx', 'components/pickups/RouteSocialPoster.tsx',
    'components/admin/shipping/PaymentCollectPanel.tsx', 'components/tienda/product-detail/ProductHeader.tsx', 'app/admin/(store)/shipping/[id]/invoice/page.tsx',
    'app/factura/[trackingCode]/page.tsx', 'app/recibo/[folio]/page.tsx', 'lib/saas/store-branding.ts',
  ]) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /aguila|águila|yoyo|13054974891/i, file);
});
for (const store of stores) test(`tracking API and rendered contact follow shipment owner ${store.id}`, async () => {
  const brand = branding.storeBranding(store, { whatsapp: store.id === 'alvarez' ? '+13055090981' : null });
  const db = database({ shipments: { ...shipment, store_id: store.id, public_tracking_enabled: true }, shipment_tracking_events: [] });
  const owners = [];
  const route = load('app/api/tracking/[codigo]/route.ts', {
    'next/server': { NextResponse: { json: body => body } },
    '@/lib/services/store-branding': { getPublicStoreBranding: async id => { owners.push(id); return brand; } },
    '@/lib/supabase-admin': { supabaseAdmin: db.client },
    '@/lib/tracking/types': { TRACKING_STATUS_LABELS: { received_miami: 'Recibido' } },
    '@/lib/shipping/types': { getShippingStatusLabel: () => 'Recibido' },
  });
  const payload = await route.GET({ headers: new Map([['host', 'another-tenant.test']]) }, { params: Promise.resolve({ codigo: shipment.tracking_code }) });
  assert.deepEqual(owners, [store.id]); assert.equal(payload.brand.name, store.name);
  const Page = load('components/tracking/TrackingView.tsx', {
    react: stateReact([payload, false, '']), './TrackingSearch': nullComponent, './TrackingProductsCarousel': nullComponent,
    '@/lib/saas/store-branding': branding,
  }).default;
  const html = renderToStaticMarkup(React.createElement(Page, { code: shipment.tracking_code }));
  assert.ok(html.includes(store.name));
  if (store.id === 'alvarez') { assert.ok(html.includes('wa.me/13055090981')); assert.doesNotMatch(html, /13054974891|aguila|yoyo/i); }
  if (!brand.whatsappUrl) assert.doesNotMatch(html, /wa.me/);
});
test('commercial portal stops unknown hosts before reading settings', async () => {
  const db = database({});
  const route = load('app/api/public/commercial-portal/config/route.ts', {
    'next/cache': { unstable_cache: fn => fn },
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@supabase/supabase-js': { createClient: () => db.client },
    '@/lib/saas/public-store-resolution': { resolvePublicStore: async () => null },
  }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://db.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public' } } });
  const response = await route.GET({ headers: new Map([['host', 'unknown.test']]), nextUrl: new URL('https://unknown.test/api/public/commercial-portal/config') });
  assert.equal(response.status, 404); assert.equal(db.calls.length, 0);
});
