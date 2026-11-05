import test from 'node:test';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {PGlite}=require('@electric-sql/pglite');
test('isolated Postgres: remittance migration, stock, pricing, rollback, access and read cursors',async()=>{
 const db=new PGlite();
 try {
  await db.exec(fs.readFileSync('tests/helpers/remittance-test-db.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261105162233_remittance_manual_delivery_and_products.sql','utf8'));
  await db.exec(fs.readFileSync('tests/remittance-delivery.sql','utf8'));
 } finally { await db.close(); }
});
