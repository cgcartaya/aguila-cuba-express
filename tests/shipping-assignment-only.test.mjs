import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(new URL('../supabase/migrations/20261111001558_shipping_assignment_only_role.sql', import.meta.url), 'utf8');
const textIdMigration = readFileSync(new URL('../supabase/migrations/20261111002108_shipping_assignment_text_shipment_id.sql', import.meta.url), 'utf8');
const uid = '10000000-0000-0000-0000-000000000001';
const store = '20000000-0000-0000-0000-000000000001';
const otherStore = '20000000-0000-0000-0000-000000000002';
const shipment = '30000000-0000-0000-0000-000000000001';
const otherShipment = '30000000-0000-0000-0000-000000000002';
const driver = '40000000-0000-0000-0000-000000000001';
const inactive = '40000000-0000-0000-0000-000000000002';
const foreign = '40000000-0000-0000-0000-000000000003';

test('assignment-only role enforces tenant, column and write restrictions', async t => {
 const db = new PGlite();
 await db.exec(`
 create role anon; create role authenticated;
 create schema auth; create schema private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.profiles(id uuid primary key, role text, active boolean);
 create table public.stores(id uuid primary key, is_active boolean, module_shipping_enabled boolean);
 create table public.store_users(id uuid,store_id uuid,user_id uuid,role text,active boolean,permissions jsonb,
 constraint store_users_role_check check(role in ('OWNER','VIEWER')));
 create table public.staff_users(id uuid primary key,store_id uuid,first_name text,last_name text,username text,role text,status text,legacy_app_user_id uuid);
 create table public.shipments(id text primary key,store_id uuid,assigned_staff_id uuid,assigned_driver_id uuid,assigned_driver_name text,updated_at timestamptz,
 deleted_at timestamptz,service_price numeric default 100,status text default 'preparing',trip_id uuid);
 create table public.shipment_items(id int,store_id uuid,description text);
 insert into profiles values('${uid}','store_owner',true);
 insert into stores values('${store}',true,true),('${otherStore}',true,true);
 insert into store_users values(gen_random_uuid(),'${store}','${uid}','VIEWER',true,'{}');
 insert into staff_users values('${driver}','${store}','Ana','Pérez','ana','DELIVERY','ACTIVE',null),
 ('${inactive}','${store}','No','Activo','inactive','DELIVERY','INACTIVE',null),
 ('${foreign}','${otherStore}','Otra','Tienda','other','DELIVERY','ACTIVE',null);
 insert into shipments(id,store_id) values('${shipment}','${store}'),('${otherShipment}','${otherStore}');
 insert into shipment_items values(1,'${store}','original');
 grant usage on schema public,auth to authenticated; grant all on all tables in schema public to authenticated;
 alter table shipments enable row level security;
 create policy legacy_open on shipments for all using(true) with check(true);
 alter table shipment_items enable row level security;
 create policy legacy_open on shipment_items for all using(true) with check(true);
 alter table store_users enable row level security;
 create policy own on store_users for select using(user_id=auth.uid());
 alter table profiles enable row level security;
 create policy own on profiles for select using(id=auth.uid());
 `);
 await db.exec(migration);
 await db.exec(textIdMigration);
 // Production grants only safe staff columns, never password_hash.
 await db.exec("revoke select on staff_users from authenticated; grant select(id,store_id,first_name,last_name,username,role,status,legacy_app_user_id) on staff_users to authenticated;");
 await db.exec(`update store_users set role='ASSIGNER'; set role authenticated; set request.jwt.claim.sub='${uid}';`);
 const rpc = staff => db.query(`select public.assign_shipment_driver($1::uuid,$2::text,$3::uuid) as result`, [store,shipment,staff]);
 await t.test('assign and persist the canonical driver',async()=>{
   const result=await rpc(driver);
   assert.equal(result.rows[0].result.assigned_staff_id,driver);
   assert.equal(result.rows[0].result.assigned_driver_name,'Ana Pérez');
   assert.equal((await db.query('select service_price,status from shipments')).rows[0].service_price,'100');
 });
 await t.test('reject all other columns including combined assignment edits',async()=>{
   for(const change of ["service_price=1","status='delivered'",`trip_id='${driver}'`,`store_id='${otherStore}'`,"assigned_staff_id=null,assigned_driver_name=null,service_price=1"])
     await assert.rejects(db.exec(`update shipments set ${change} where id='${shipment}'`),/Solo puedes cambiar/);
 });
 await t.test('reject fabricated names and inactive or foreign drivers',async()=>{
   await assert.rejects(db.exec(`update shipments set assigned_driver_name='Falso' where id='${shipment}'`),/repartidor/);
   await assert.rejects(rpc(inactive),/repartidor/);
   await assert.rejects(rpc(foreign),/repartidor/);
 });
 await t.test('hide other stores and reject cross-store RPC',async()=>{
   assert.equal((await db.query('select id from shipments')).rows.length,1);
   await assert.rejects(db.query('select assign_shipment_driver($1,$2,$3)',[otherStore,otherShipment,foreign]),/permiso/);
 });
 await t.test('block create, delete and edits to shipment children',async()=>{
   await assert.rejects(db.exec(`insert into shipments(id,store_id) values(gen_random_uuid(),'${store}')`));
   await db.exec(`delete from shipments where id='${shipment}'`);
   assert.equal((await db.query('select id from shipments')).rows.length,1);
   await db.exec("update shipment_items set description='changed'");
   assert.equal((await db.query('select description from shipment_items')).rows[0].description,'original');
 });
 await t.test('clear assignment without changing other fields',async()=>{
   const result=await rpc(null); assert.equal(result.rows[0].result.assigned_driver_name,null);
 });
 await t.test('inactive membership loses access even with an existing session',async()=>{
   await db.exec('reset role; update store_users set active=false; set role authenticated;');
   await assert.rejects(rpc(driver),/permiso/);
   assert.equal((await db.query('select id from shipments')).rows.length,0);
   await db.exec('reset role; update store_users set active=true; set role authenticated;');
 });
 await t.test('viewer cannot call assignment RPC',async()=>{
   await db.exec("reset role; update store_users set role='VIEWER'; set role authenticated;");
   await assert.rejects(rpc(driver),/permiso/);
 });
 await t.test('owners retain existing edit and assignment access',async()=>{
   await db.exec("reset role; update store_users set role='OWNER'; set role authenticated;");
   await rpc(driver); await db.exec(`update shipments set service_price=125 where id='${shipment}'`);
   assert.equal((await db.query(`select service_price from shipments where id='${shipment}'`)).rows[0].service_price,'125');
 });
 await db.close();
});
