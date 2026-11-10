import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { loadTravelModule, legacyPackages, travelTypes } from './helpers/luxury-fixtures.mjs';
const { travelDraftFromText } = loadTravelModule('lib/travel/import-text.ts');
test('deadlines and departure dates close offers in the agency timezone while permanent packages stay consultable', () => {
 const pkg = structuredClone(legacyPackages[0]), departure = pkg.content.departures[0];
 departure.start='2027-01-12'; departure.deadline='2027-01-05';
 assert.equal(travelTypes.isDepartureOpen(departure,'2027-01-05'),true);
 assert.equal(travelTypes.isDepartureOpen(departure,'2027-01-06'),false);
 assert.equal(travelTypes.todayInMiami(new Date('2027-01-06T02:00:00Z')),'2027-01-05');
 assert.equal(travelTypes.isPackageVisible(pkg,'2027-01-06'),false);
 pkg.content.permanent=true; assert.equal(travelTypes.isPackageVisible(pkg,'2027-01-06'),true);
});
test('import retains complete text, warns about contradictory dates and never mistakes child fares for adult occupancy prices', () => {
 const text='SUDÁFRICA PLATINIUM EXPERIENCE 2027\n25 de Marzo al 06 de Abril 2027\nDía 1\nSalida de origen\nDía 2\nLlegada\nTRIPLE $ 2,986.00 USD\nDOBLE $ 2,997.00 USD\nSIMPLE $ 3,625.00 USD\n0 - 1.9 $ 2,086.00 USD';
 const result=travelDraftFromText(text,'MARZO DEL 25 AL 3 ABRIL- SUDAFRICA PLATINIUM EXPERIENCE pdf.pdf');
 assert.equal(result.content.departures[0].end,'2027-04-06');
 assert.deepEqual(Array.from(result.content.departures[0].rates,rate=>rate.amount),[2986,2997,3625]);
 assert.ok(result.warnings.some(message=>message.includes('difiere')));
 assert.equal(result.content.source_text,text);
 assert.equal(result.content.itinerary.length,2);
});
test('incomplete PDFs remain editable drafts while unsafe links and invalid dates cannot be published', () => {
 const draft=travelDraftFromText('Programa escaneado','Tour de París.pdf');
 assert.ok(draft.warnings.some(message=>message.includes('escaneado')));
 assert.equal(travelTypes.validateTravelContent(draft.content,'draft'),null);
 assert.ok(travelTypes.validateTravelContent(draft.content,'published'));
 const content=structuredClone(legacyPackages[0].content);
 content.pdf='javascript:alert(1)'; assert.ok(travelTypes.validateTravelContent(content,'published'));
 content.pdf=''; content.departures[0].start='2027-99-99'; assert.ok(travelTypes.validateTravelContent(content,'published'));
});
test('migration preserves 37 current offers, enforces tenant writes, hides drafts and detects stale edits', async () => {
 const db=new PGlite();
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;create schema storage;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.stores(id uuid primary key,slug text,is_active boolean);create table public.profiles(id uuid,active boolean);create table public.test_members(user_id uuid,store_id uuid,role text);create function public.has_store_role(tenant uuid,roles text[]) returns boolean language sql security definer as $$select exists(select 1 from public.test_members where store_id=tenant and user_id=auth.uid() and role=any(roles))$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text,name text);create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;grant usage on schema public,auth,storage to anon,authenticated;grant select on public.stores,public.profiles to anon,authenticated;insert into public.stores values('57f60bbe-35a7-46f2-99a6-484414a3b893','luxury-travel-point',true),('00000000-0000-0000-0000-000000000002','other',true);insert into public.profiles values('00000000-0000-0000-0000-000000000001',true);insert into public.test_members values('00000000-0000-0000-0000-000000000001','57f60bbe-35a7-46f2-99a6-484414a3b893','OWNER');`);
  await db.exec("alter table public.stores add column name text not null default 'Luxury Travel Point';alter table storage.objects enable row level security;grant insert,select on storage.objects to authenticated");
  await db.exec(fs.readFileSync('supabase/migrations/20261110223706_luxury_managed_packages.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261110225833_travel_pdf_size_limit.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261110230040_travel_public_catalog_policy.sql','utf8'));
  await db.exec('revoke execute on function public.has_store_role(uuid,text[]) from public,anon;grant execute on function public.has_store_role(uuid,text[]) to authenticated');
  assert.equal((await db.query('select count(*)::integer n from travel_packages')).rows[0].n,37);
  const pkg=(await db.query('select * from travel_packages limit 1')).rows[0];
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false)`);
  await assert.rejects(db.query("insert into storage.objects(id,bucket_id,name) values(gen_random_uuid(),'travel-assets',$1)",[pkg.store_id+'/before-fix.pdf']));
  await db.exec('reset role');
  await db.exec(fs.readFileSync('supabase/migrations/20261110233210_travel_storage_tenant_path.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261110233545_travel_storage_metadata_read.sql','utf8'));
  await db.exec('set role authenticated');
  const uploaded = await db.query("insert into storage.objects(id,bucket_id,name) values(gen_random_uuid(),'travel-assets',$1) returning id",[pkg.store_id+'/programme.pdf']);
  assert.equal(uploaded.rows.length,1);
  await assert.rejects(db.query("insert into storage.objects(id,bucket_id,name) values(gen_random_uuid(),'travel-assets',$1)",['00000000-0000-0000-0000-000000000002/other.pdf']));
  const saved=await db.query("update travel_packages set status='draft' where id=$1 and version=1 returning version",[pkg.id]);
  assert.equal(saved.rows[0].version,2);
  assert.equal((await db.query("update travel_packages set status='paused' where id=$1 and version=1 returning id",[pkg.id])).rows.length,0);
  await assert.rejects(db.query('update travel_packages set store_id=$1 where id=$2',['00000000-0000-0000-0000-000000000002',pkg.id]));
  await assert.rejects(db.query('insert into travel_packages(store_id,content) values($1,$2)',['00000000-0000-0000-0000-000000000002',pkg.content]));
  await db.exec("reset role;select set_config('request.jwt.claim.sub','',false);set role anon");
  assert.equal((await db.query('select id from travel_packages where id=$1',[pkg.id])).rows.length,0);
  assert.equal((await db.query('select count(*)::integer n from travel_packages')).rows[0].n,36);
  await assert.rejects(db.query("insert into travel_packages(store_id,content) values($1,$2)",[pkg.store_id,pkg.content]));
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::integer n from travel_packages')).rows[0].n,37);
 } finally { await db.close(); }
});
