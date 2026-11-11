import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const luxury = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';
const owner = '20000000-0000-0000-0000-000000000001';
const otherOwner = '20000000-0000-0000-0000-000000000002';
const migration = readFileSync('supabase/migrations/20261111162000_luxury_shipping_catalog.sql', 'utf8');

test('Luxury shipping seeds rates, applies Florida schedule, and enforces tenant access', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      create table stores(id uuid primary key, slug text, is_active boolean);
      create table profiles(id uuid primary key, active boolean);
      create table memberships(user_id uuid, store_id uuid, role text);
      create function has_store_role(tenant uuid, roles text[]) returns boolean language sql security definer as $$
        select exists(select 1 from memberships where store_id=tenant and user_id=auth.uid() and role=any(roles))
      $$;
      revoke execute on function has_store_role(uuid,text[]) from public;
      grant execute on function has_store_role(uuid,text[]) to authenticated;
      grant usage on schema auth to authenticated;
      grant select on stores to anon,authenticated;
      grant select on profiles to authenticated;
      insert into stores values ('${luxury}','luxury-travel-point',true), ('${other}','other',true);
      insert into profiles values ('${owner}',true), ('${otherOwner}',true);
      insert into memberships values ('${owner}','${luxury}','OWNER'), ('${otherOwner}','${other}','ADMIN');
    `);
    await db.exec(migration.replaceAll('now()', "current_setting('test.clock')::timestamptz"));
    const visibleAt = async instant => {
      await db.query("select set_config('test.clock',$1,false)", [instant]);
      return (await db.query('select key from luxury_shipping_catalog order by key')).rows.map(row => row.key);
    };
    await db.exec('set role anon');
    assert.deepEqual((await visibleAt('2026-11-11T16:00:00Z')).filter(key => ['seniors','new'].includes(key)), ['seniors']);
    assert.deepEqual((await visibleAt('2026-11-14T16:00:00Z')).filter(key => ['seniors','new'].includes(key)), ['new']);
    assert.ok((await visibleAt('2026-12-01T04:59:59Z')).includes('loyalty'));
    assert.deepEqual(await visibleAt('2026-12-01T05:00:00Z'), ['air','durables','express','gold','online','sea','vehicles']);
    assert.deepEqual(await visibleAt('2027-11-11T16:00:00Z'), ['air','durables','express','gold','online','sea','vehicles']);
    await assert.rejects(db.exec("update luxury_shipping_catalog set enabled=false where key='gold'"));
    await db.exec(`reset role; select set_config('request.jwt.claim.sub','${otherOwner}',false); set role authenticated`);
    assert.equal((await db.query("update luxury_shipping_catalog set enabled=false where key='gold' returning key")).rows.length, 0);
    await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false)`);
    assert.equal((await db.query('select key from luxury_shipping_catalog')).rows.length, 12);
    assert.equal((await db.query("select copy->'es'->>'price' as price from luxury_shipping_catalog where key='air'")).rows[0].price, '$3.99/lb');
    await assert.rejects(db.exec(`insert into luxury_shipping_catalog(store_id,key,section,copy)
      select '${other}', 'other-rate', 'rate', copy from luxury_shipping_catalog where key='air'`));
    assert.equal((await db.query("update luxury_shipping_catalog set enabled=false where key='gold' returning key")).rows.length, 1);
    await db.exec('reset role; set role anon');
    assert.ok(!(await visibleAt('2026-12-01T05:00:00Z')).includes('gold'));
  } finally {
    await db.close();
  }
});
