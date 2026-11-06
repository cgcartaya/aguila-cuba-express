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

test('isolated Postgres: mixed cash and a single commission-bearing product order',async()=>{
 const db=new PGlite();
 try {
  await db.exec(fs.readFileSync('tests/helpers/remittance-test-db.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261105162233_remittance_manual_delivery_and_products.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261105165935_mixed_remittance_product_orders.sql','utf8'));
  await db.exec(fs.readFileSync('tests/mixed-remittance-orders.sql','utf8'));
 } finally { await db.close(); }
});

test('delivery updates do not create historical product sales or re-price old invoices',async()=>{
 const db=new PGlite();
 try {
  await db.exec(fs.readFileSync('tests/helpers/remittance-test-db.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261105162233_remittance_manual_delivery_and_products.sql','utf8'));
  await db.exec(`do $$declare sid uuid:=gen_random_uuid();actor uuid:=gen_random_uuid();pid uuid:=gen_random_uuid();begin
   insert into public.stores(id,subdomain,is_active,module_shipping_enabled) values(sid,'alvarez-travel',true,true);
   insert into public.profiles(id,active,role) values(actor,true,'super_admin');
   perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',actor)::text,false);
   insert into public.products(id,store_id,name,price,stock) values(pid,sid,'Historical product',25,10);
   perform public.create_remittance_numbered_shipment(sid,'legacy-before-mixed','LEGACY',jsonb_build_object('money_amount',100,'money_total',110,'store_products',jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',1,'unit_price',25))));
  end $$;`);
  await db.exec(fs.readFileSync('supabase/migrations/20261105165935_mixed_remittance_product_orders.sql','utf8'));
  await db.exec(`update public.shipments set status='out_for_delivery' where id='legacy-before-mixed';
  do $$begin
   if exists(select 1 from public.orders) or (select service_price from public.shipments where id='legacy-before-mixed')<>135 then raise exception 'Historical sale backfilled or re-priced';end if;
  end$$;`);
 } finally { await db.close(); }
});

test('products-only shipments create a single sale, stock reservation and WhatsApp notice without cash',async()=>{
 const db=new PGlite();
 try {
  await db.exec(fs.readFileSync('tests/helpers/remittance-test-db.sql','utf8'));
  await db.exec('create table public.remittance_orders(id uuid primary key default gen_random_uuid(),store_id uuid,shipment_id text);');
  await db.exec(fs.readFileSync('supabase/migrations/20261105152646_alvarez_remittance_whatsapp_outbox.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261105162233_remittance_manual_delivery_and_products.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261105165935_mixed_remittance_product_orders.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261105172653_products_only_shipping_operations.sql','utf8'));
  await db.exec(`
    create table public.customers(id uuid primary key);
    create table public.shipping_customers(id uuid primary key);
    alter table public.orders add constraint orders_customer_id_fkey
      foreign key(customer_id) references public.customers(id);
    alter table public.shipments add constraint shipments_customer_id_fkey
      foreign key(customer_id) references public.shipping_customers(id);
  `);
  await db.exec(fs.readFileSync('supabase/migrations/20261105190640_fix_linked_shipping_order_customer_fk.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261105193304_shipping_products_base_price.sql','utf8'));
  await db.exec(`
    create table public.combos(id uuid primary key,store_id uuid,name text,price numeric,is_active boolean not null default true,deleted_at timestamptz);
    create table public.combo_items(combo_id uuid references public.combos(id),product_id uuid references public.products(id),quantity integer not null);
    alter table public.order_items add column combo_id uuid;
  `);
  await db.exec(fs.readFileSync('supabase/migrations/20261105195245_shipping_catalog_combos.sql','utf8'));
  await db.exec(fs.readFileSync('tests/products-only-operations.sql','utf8'));
  await db.exec(fs.readFileSync('tests/shipping-catalog-combos.sql','utf8'));
  await db.exec("insert into public.stores values(gen_random_uuid(),'alvarez-travel',true,true);");
  await db.exec(fs.readFileSync('supabase/migrations/20261106150000_alvarez_physical_store_products.sql','utf8'));
  await db.exec(fs.readFileSync('tests/physical-store-products.sql','utf8'));
 } finally { await db.close(); }
});
