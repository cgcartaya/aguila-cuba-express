import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
const require = createRequire(import.meta.url);
function load(path, deps = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, console, require: name => deps[name] ?? require(name) });
  return module.exports;
}
test('the gallery publishes only enabled active clients and exposes only public fields', async () => {
  const selected = []; const conditions = [];
  const client = { from(table) { return { select(fields) { selected.push(fields); return this; },
    eq(key, value) { conditions.push([table, key, value]); return this; },
    then(resolve) { return Promise.resolve({ data: [{ store_id: 'active' }] }).then(resolve); },
    in(key, ids) { assert.equal(key, 'id'); assert.deepEqual(Array.from(ids), ['active']); return this; },
    order: async () => ({ data: [{ id: 'active', name: 'Public client', slug: 'public', logo_url: null, module_shipping_enabled: true }] }),
  }; } };
  const { getPerlaShowcase } = load('lib/services/perla-showcase.ts', {
    '@/lib/supabase-public': { publicSupabase: client }, '@/lib/saas/store-metadata': { getStorePublicBaseUrl: () => 'https://public.example' },
  });
  const rows = await getPerlaShowcase();
  assert.equal(rows.length, 1); assert.equal(rows[0].url, 'https://public.example');
  assert.deepEqual(conditions, [['perla_client_showcase', 'enabled', true], ['stores', 'is_active', true]]);
  assert.doesNotMatch(selected.join(','), /client_email|client_phone|monthly_price|secret|token|notes/);
});
test('visibility writes require an active superadministrator and never change store activation', async () => {
  const storeId = '211dd255-7168-4045-a278-afc4164a3172';
  for (const [role, active, expected] of [['owner', true, 403], ['super_admin', false, 403], ['super_admin', true, 200]]) {
    const writes = [];
    const client = { auth: { getUser: async () => ({ data: { user: { id: 'actor' } } }) },
      from(table) { return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: table === 'profiles' ? { role, active } : { id: storeId } }),
        upsert: async value => { writes.push({ table, value }); return { error: null }; } }; },
    };
    const api = load('app/api/saas/client-showcase/route.ts', { '@/lib/supabase-admin': { supabaseAdmin: client }, 'next/server': { NextResponse: { json: (body, options) => ({ body, status: options.status }) } } });
    const request = body => ({ headers: new Map([['authorization', 'Bearer token']]), json: async () => body });
    const result = await api.PUT(request({ store_id: storeId, enabled: false }));
    assert.equal(result.status, expected);
    assert.equal(writes.length, expected === 200 ? 1 : 0);
    if (expected === 200) {
      assert.equal(writes[0].table, 'perla_client_showcase'); assert.equal(writes[0].value.enabled, false);
      assert.equal('is_active' in writes[0].value, false);
      assert.equal((await api.PUT(request({ store_id: storeId, enabled: 'yes' }))).status, 400);
      assert.equal((await api.PUT(request({ store_id: 'bad', enabled: true }))).status, 400);
    }
  }
});
test('database policies hide inactive and unpublished clients and deny direct public writes', async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table public.stores(id uuid primary key,is_active boolean not null);
    grant select on public.stores to anon,authenticated;
    create function public.is_super_admin() returns boolean language sql as 'select false';
    insert into public.stores values('00000000-0000-0000-0000-000000000001',true),('00000000-0000-0000-0000-000000000002',false);`);
  await db.exec(fs.readFileSync('supabase/migrations/20261108000221_perla_client_showcase.sql', 'utf8'));
  await db.exec('set role anon');
  assert.equal((await db.query('select count(*)::int as n from public.perla_client_showcase')).rows[0].n, 1);
  await assert.rejects(db.exec('update public.perla_client_showcase set enabled=false'), /permission denied/);
  await db.exec("reset role; update public.perla_client_showcase set enabled=false; set role anon");
  assert.equal((await db.query('select count(*)::int as n from public.perla_client_showcase')).rows[0].n, 0);
  await db.exec("reset role; update public.perla_client_showcase set enabled=true; set role anon");
  assert.equal((await db.query('select count(*)::int as n from public.perla_client_showcase')).rows[0].n, 1);
  await db.close();
});
test('landing renders modules, customer logos, original Perla branding and noncommittal prices', () => {
  const deps = {
    'next/image': { __esModule: true, default: ({ unoptimized, priority, ...props }) => React.createElement('img', props) },
    '@/components/perla/PerlaLogo': { __esModule: true, default: () => React.createElement('img', { src: '/perla/perla-shell.png', alt: 'Perla' }) },
    '@/components/perla/links': { CONTACT_EMAIL: 'contact@example.com', buildWhatsAppUrl: text => `https://wa.me/17862031226?text=${encodeURIComponent(text)}` },
    './modular.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) },
  };
  const Component = load('components/landing/perla/ModularLanding.tsx', deps).default;
  const html = renderToStaticMarkup(React.createElement(Component, { clients: [{ id: 'a', name: 'Cliente real', logo: 'https://example.com/logo.png', url: 'https://example.com', modules: ['Envíos'] }] }));
  assert.match(html, /Tu negocio<br\/>conectado/); assert.match(html, /\/perla\/perla-shell.png/);
  assert.match(html, /Cliente real/); assert.match(html, /example.com\/logo.png/);
  assert.equal((html.match(/class="moduleCard /g) || []).length, 6);
  assert.equal((html.match(/class="planPrice"/g) || []).length, 3);
  assert.match(html, /A consultar/); assert.doesNotMatch(html, /Sin comisión|Desde \$20/);
  assert.match(html, /Solicitar demo guiada/); assert.match(html, /aria-label="Navegación de Perla"/);
});
