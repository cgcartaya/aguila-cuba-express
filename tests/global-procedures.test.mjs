import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
const require = createRequire(import.meta.url);
const store = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const actor = '00000000-0000-4000-8000-000000000003';
const id = '00000000-0000-4000-8000-000000000004';
function load(path, mocks = {}) {
  const loaded = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module: loaded, exports: loaded.exports, require: name => name in mocks ? mocks[name] : require(name), Response, Request, URL, URLSearchParams, Map, Set, Date });
  return loaded.exports;
}
const catalogModule = load('lib/procedures/catalog.ts');
const phone = load('lib/procedures/phone.ts');
const submissionModule = load('lib/procedures/submission.ts', { './phone': phone, './catalog': catalogModule });
const configuration = { title: 'Asesoría', description: 'Gestión documental', agencyFee: 20, fees: [], variants: [{ id: 'general', title: 'General', requirements: [{ id: 'documento', label: 'Documento', optional: false }] }] };
const entry = { service: 'asesoria', version: 1, configuration };
const body = { action: 'create', service: 'asesoria', variant: 'general', version: 1, name: 'Cliente Prueba', phone: '+17725550100', email: 'test@example.com', whatsapp: false, checklist: { documento: 'ready' }, origin: 'presencial', employee: null, note: 'Nota privada' };
function database(replies, { user = { id: actor }, rpc = { data: true, error: null } } = {}) {
  const calls = [];
  return { calls, auth: { getUser: async () => ({ data: { user } }) }, rpc: async (name, args) => { calls.push({ rpc: name, args }); return rpc; },
    from(table) {
      const expected = replies.shift(); assert.ok(expected, `unexpected ${table}`); assert.equal(table, expected.table);
      const call = { table, methods: [] }; calls.push(call); const builder = {};
      for (const method of ['select', 'eq', 'gte', 'lte', 'in', 'order', 'limit', 'not', 'insert', 'update', 'is', 'or', 'range']) builder[method] = (...args) => { call.methods.push([method, ...args]); return builder; };
      builder.maybeSingle = builder.single = () => Promise.resolve(expected.value);
      builder.then = (resolve, reject) => Promise.resolve(expected.value).then(resolve, reject);
      return builder;
    } };
}
const response = (data, status = 200) => Response.json(data, { status });
function server(db, resolver = async () => ({ id: store })) {
  return load('lib/procedures/server.ts', { '@/lib/supabase-admin': { supabaseAdmin: db }, '@/lib/saas/store-metadata': { normalizeStoreHost: value => value, resolveStoreByHost: resolver } });
}
const req = (method = 'GET', input, selected = store) => new Request('https://company.perlamarketplace.com/api/admin/procedures', { method, headers: { Authorization: 'Bearer fixture', ...(selected ? { 'x-store-id': selected } : {}), 'Content-Type': 'application/json' }, ...(input ? { body: JSON.stringify(input) } : {}) });
function admin(db, { staff = { id: actor, store, slug: 'example', name: 'Empresa', supervisor: true }, entries = [entry] } = {}) {
  return load('app/api/admin/procedures/route.ts', { '@/lib/supabase-admin': { supabaseAdmin: db }, '@/lib/procedures/catalog': catalogModule,
    '@/lib/procedures/submission': submissionModule, '@/lib/procedures/seed': { initialCatalog: {} }, '@/lib/procedures/server': { response, procedureStaff: async () => staff, catalog: async () => entries } });
}
const profile = { table: 'profiles', value: { data: { active: true, role: 'store_owner' } } };
const membership = { table: 'store_users', value: { data: [{ store_id: store, role: 'OWNER' }] } };
test('module disabled, revoked membership, viewer and inactive profile are denied', async () => {
  for (const replies of [[profile, membership, { table: 'stores', value: { data: null } }], [profile, { table: 'store_users', value: { data: [] } }],
    [profile, { table: 'store_users', value: { data: [{ store_id: store, role: 'VIEWER' }] } }], [{ table: 'profiles', value: { data: null } }]]) {
    assert.equal(await server(database(replies)).procedureStaff(req()), null);
  }
});
test('staff must have membership in requested tenant; active module is checked in database', async () => {
  const db = database([profile, membership, { table: 'stores', value: { data: { id: store, slug: 'example' } } }]);
  assert.equal((await server(db).procedureStaff(req())).store, store);
  assert.ok(db.calls[1].methods.some(m => m[0] === 'eq' && m[1] === 'store_id' && m[2] === store));
  assert.ok(db.calls[2].methods.some(m => m[0] === 'eq' && m[1] === 'module_procedures_enabled' && m[2] === true));
});
test('public requests require both module and public flags for resolved host', async () => {
  const db = database([{ table: 'stores', value: { data: null } }]);
  assert.equal(await server(db).procedurePublicStore(req()), null);
  for (const column of ['id', 'is_active', 'module_procedures_enabled', 'procedures_public_enabled']) assert.ok(db.calls[0].methods.some(m => m[0] === 'eq' && m[1] === column));
});
test('draft versions do not shadow published services; published inactive revision hides service', async () => {
  const db = database([{ table: 'procedure_catalog', value: { data: [{ ...entry, version: 3, configuration: { ...configuration, active: false } }, entry] } }]);
  assert.equal((await server(db).catalog(store, true)).length, 0);
  assert.ok(db.calls[0].methods.some(m => m[0] === 'not' && m[1] === 'published_at'));
});
test('public and manual validation reject stale catalog, mismatched requirements, invalid NA and missing required email', () => {
  const input = Object.fromEntries(Object.entries(body).filter(([key]) => !["action", "origin", "employee", "note"].includes(key)));
  for (const bad of [{ ...input, version: 2 }, { ...input, variant: 'other' }, { ...input, checklist: {} }, { ...input, checklist: { documento: 'na' } }, { ...input, email: '' }]) assert.equal(submissionModule.requestValues(bad, entry), null);
  assert.ok(submissionModule.requestValues({ ...input, email: '' }, { ...entry, configuration: { ...configuration, emailRequired: false } }));
  assert.equal(submissionModule.requestValues(input, entry).checklist[0].verification, 'pending');
});
test('manual creation uses authenticated tenant, creates new request and records source and actor', async () => {
  const db = database([{ table: 'procedure_requests', value: { data: { id }, error: null } }]);
  const result = await admin(db).POST(req('POST', body)); assert.equal(result.status, 201);
  const values = db.calls[0].methods.find(m => m[0] === 'insert')[1];
  assert.equal(values.store_id, store); assert.equal(values.origin, 'presencial'); assert.equal(values.created_by, actor); assert.equal(values.internal_notes, 'Nota privada');
});
test('manual creation rejects cross-tenant employee and cannot set initial state or store via body', async () => {
  const db = database([{ table: 'store_users', value: { data: null } }, { table: 'profiles', value: { data: { id: actor } } }]);
  assert.equal((await admin(db).POST(req('POST', { ...body, employee: actor }))).status, 400);
  assert.ok(db.calls[0].methods.some(m => m[0] === 'eq' && m[1] === 'store_id' && m[2] === store));
  for (const extra of [{ store_id: other }, { state: 'completed' }]) assert.equal((await admin(database([])).POST(req('POST', { ...body, ...extra }))).status, 400);
});
test('operations can only create assigned-to-self requests, and cannot edit catalog', async () => {
  const route = admin(database([]), { staff: { id: actor, store, supervisor: false } });
  assert.equal((await route.POST(req('POST', body))).status, 403);
  assert.equal((await route.POST(req('POST', { action: 'catalog', service: 'asesoria', configuration, publish: true }))).status, 403);
});
test('other-tenant request and unassigned operations request cannot be edited', async () => {
  const db = database([{ table: 'procedure_requests', value: { data: null } }]);
  const result = await admin(db, { staff: { id: actor, store, supervisor: false } }).POST(req('POST', { action: 'note', id, revision: 0, note: 'Privado' }));
  assert.equal(result.status, 404);
  assert.ok(db.calls[0].methods.some(m => m[0] === 'eq' && m[1] === 'store_id' && m[2] === store));
  assert.ok(db.calls[0].methods.some(m => m[0] === 'eq' && m[1] === 'assigned_to' && m[2] === actor));
});
test('server combines search, state, service, unassigned and date filters with pagination and exact global counters', async () => {
  const replies = [{ table: 'procedure_requests', value: { data: [], count: 30 } }, { table: 'store_users', value: { data: [] } },
    ...Array.from({ length: 7 }, (_, i) => ({ table: 'procedure_requests', value: { count: i } }))];
  const db = database(replies);
  const result = await admin(db).PUT(req('PUT', { filters: 'q=00000000&state=new&service=asesoria&assigned=none&from=2026-11-01&until=2026-11-17&page=1&sort=oldest' }));
  assert.equal(result.status, 200); const json = await result.json(); assert.equal(json.counts.unassigned, 6); assert.equal(json.total, 30);
  const methods = db.calls[0].methods;
  for (const op of ['gte', 'lte', 'or', 'is', 'range']) assert.ok(methods.some(m => m[0] === op));
  assert.deepEqual(methods.find(m => m[0] === 'range').slice(1), [25, 49]);
  assert.match(methods.find(m => m[0] === 'or')[1], /reference.ilike/);
  assert.ok(methods.some(m => m[0] === 'order' && m[1] === 'created_at' && m[2].ascending === true));
  for (const call of db.calls) if (call.table === 'procedure_requests') assert.ok(call.methods.some(m => m[0] === 'eq' && m[1] === 'store_id' && m[2] === store));
});
test('revision conflicts and incomplete checklist prevent a completed state', async () => {
  const row = { state: 'processing', revision: 2, checklist: [{ id: 'documento', optional: false, verification: 'pending' }] };
  for (const revision of [1, 2]) {
    const db = database([{ table: 'procedure_requests', value: { data: row } }]);
    assert.equal((await admin(db).POST(req('POST', { action: 'state', id, revision, state: 'completed' }))).status, 409);
    assert.equal(db.calls.some(c => c.rpc), false);
  }
});
test('unauthorized callers cannot access any admin operation', async () => {
  const route = admin(database([]), { staff: null });
  assert.equal((await route.GET(req())).status, 403);
  assert.equal((await route.PUT(req('PUT', { filters: '' }))).status, 403);
  assert.equal((await route.POST(req('POST', body))).status, 403);
});
test('migration preserves WF data, activation, versioned references, notes audit, concurrency and RLS', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('role',coalesce(current_setting('test.role',true),'authenticated'))$$;
      create table stores(id uuid primary key,slug text);
      create table profiles(id uuid primary key,active boolean,role text);
      insert into stores values ('${store}','wf-cago'),('${other}','example');
      insert into profiles values ('${actor}',true,'super_admin');`);
    await db.exec(readFileSync('supabase/migrations/20261111140000_wf_procedures.sql', 'utf8'));
    await db.query("insert into procedure_catalog values ($1,'asesoria',1,$2,now())", [store, configuration]);
    await db.query("insert into procedure_requests(store_id,id,service,version,variant,customer_name,checklist) values ($1,$2,'asesoria',1,'general','Histórico','[]')", [store,id]);
    await db.exec(readFileSync('supabase/migrations/20261117182229_global_procedures_module.sql', 'utf8'));
    assert.equal((await db.query('select customer_name,reference,origin from procedure_requests')).rows[0].reference,id);
    assert.deepEqual((await db.query('select module_procedures_enabled,procedures_public_enabled from stores order by slug')).rows,[{module_procedures_enabled:false,procedures_public_enabled:false},{module_procedures_enabled:true,procedures_public_enabled:true}]);
    await assert.rejects(db.exec(`update stores set module_procedures_enabled=true where id='${other}'`),/Solo el superadministrador/);
    await db.exec(`select set_config('test.uid','${actor}',false); update stores set module_procedures_enabled=false where id='${store}'; update stores set module_procedures_enabled=true where id='${store}';`);
    assert.equal((await db.query('select count(*)::int as n from procedure_requests')).rows[0].n,1);
    const note = (tenant, revision) => db.query('select procedure_add_note($1,$2,$3,$4,$5) as saved',[tenant,id,revision,actor,'Observación privada']);
    assert.equal((await note(other,0)).rows[0].saved,false);
    assert.equal((await note(store,0)).rows[0].saved,true);
    assert.equal((await note(store,0)).rows[0].saved,false);
    assert.equal((await db.query('select event from procedure_audit where revision=1')).rows[0].event,'note');
    await db.exec('set role authenticated');
    for(const table of ['procedure_requests','procedure_catalog','procedure_audit']) await assert.rejects(db.query(`select * from ${table}`),/permission denied/);
    await assert.rejects(note(store,1),/permission denied/);
  } finally { await db.close(); }
});
test('detail loads the exact historical service version, not the latest catalog', async () => {
  const db = database([{table:'procedure_requests',value:{data:{id,service:'asesoria',version:1,state:'new',internal_notes:'Solo equipo'}}},
    {table:'procedure_audit',value:{data:[]}}, {table:'procedure_catalog',value:{data:entry}}]);
  const result = await admin(db).GET(new Request(`https://example.test/api/admin/procedures?id=${id}`));
  assert.equal(result.status,200);assert.equal((await result.json()).snapshot.version,1);
  assert.ok(db.calls[2].methods.some(m=>m[0]==='eq'&&m[1]==='store_id'&&m[2]===store));
  assert.ok(db.calls[2].methods.some(m=>m[0]==='eq'&&m[1]==='version'&&m[2]===1));
});
test('public submission cannot set notes, assignee, state or another tenant; response contains reference only', async () => {
  const db=database([{table:'procedure_requests',value:{data:{id}}}]);
  const route=load('app/api/public/procedures/route.ts',{'@/lib/supabase-admin':{supabaseAdmin:db},'@/lib/procedures/submission':submissionModule,
    '@/lib/procedures/server':{response,procedurePublicStore:async()=>({id:store}),catalog:async()=>[entry]}});
  const input=Object.fromEntries(Object.entries(body).filter(([key])=>!['action','origin','employee','note'].includes(key)));
  for(const extra of [{internal_notes:'Privado'},{assigned_to:actor},{store_id:other},{state:'completed'}]) assert.equal((await route.POST(req('POST',{...input,...extra}))).status,400);
  const result=await route.POST(req('POST',input));assert.equal(result.status,201);assert.deepEqual(await result.json(),{reference:id});
});
test('module navigation is tenant-independent and disappears when disabled, including selected superadmin store', () => {
  const nav=load('lib/admin/nav-config.ts');
  for(const isSuper of [false,true]) for(const slug of ['wf-cago','example']) {
    const links=enabled=>nav.getVisibleAdminSections({slug,module_procedures_enabled:enabled},isSuper).flatMap(section=>section.links);
    assert.equal(links(true).some(link=>link.href==='/admin/tramites'),true);
    assert.equal(links(false).some(link=>link.href==='/admin/tramites'),false);
  }
});
test('column-level grants support public stores and authenticated admin membership without allowing owners to enable modules', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql as $$select '{"role":"authenticated"}'::jsonb$$;
      create table stores(id uuid primary key,slug text,private_field text);
      create table profiles(id uuid primary key,active boolean,role text);
      insert into stores values ('${store}','wf-cago','private');
      insert into profiles values ('${actor}',true,'super_admin');
      alter table stores enable row level security;
      create policy stores_read on stores for select to anon,authenticated using(true);
      create policy stores_update on stores for update to authenticated using(true) with check(true);
      grant select(id,slug) on stores to anon,authenticated;`);
    await db.exec(readFileSync('supabase/migrations/20261111140000_wf_procedures.sql','utf8'));
    await db.exec(readFileSync('supabase/migrations/20261117182229_global_procedures_module.sql','utf8'));
    for(const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select id,slug,module_procedures_enabled,procedures_public_enabled from stores'),/permission denied/);
      await db.exec('reset role');
    }
    await db.exec(readFileSync('supabase/migrations/20261117193456_fix_procedures_store_column_reads.sql','utf8'));
    for(const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      assert.equal((await db.query('select id,slug,module_procedures_enabled,procedures_public_enabled from stores')).rows.length,1);
      await assert.rejects(db.query('select private_field from stores'),/permission denied/);
      await assert.rejects(db.query('select * from procedure_requests'),/permission denied/);
      if(role==='authenticated') await assert.rejects(db.query('update stores set module_procedures_enabled=false'),/Solo el superadministrador/);
      await db.exec('reset role');
    }
    await db.exec(`select set_config('test.uid','${actor}',false); set role authenticated; update stores set module_procedures_enabled=false;`);
    assert.equal((await db.query('select module_procedures_enabled from stores')).rows[0].module_procedures_enabled,false);
  } finally { await db.close(); }
});
