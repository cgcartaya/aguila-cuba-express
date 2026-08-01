#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const overwrite = process.argv.includes('--overwrite');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapping = JSON.parse(fs.readFileSync(path.join(root, 'mapping.ready.json'), 'utf8'));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const slug = process.env.DEPARIS_STORE_SLUG || 'deparis';
if (!url || !key) throw new Error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const normalize = (v) => String(v ?? '').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const samePrice = (a,b) => Math.abs(Number(a)-Number(b)) < 0.01;

const { data: store, error: se } = await supabase.from('stores').select('id,name,slug').eq('slug',slug).maybeSingle();
if (se || !store) throw new Error(`Tienda no encontrada: ${se?.message || slug}`);
const { data: products, error: pe } = await supabase.from('products').select('id,name,price,image_url,deleted_at').eq('store_id',store.id).is('deleted_at',null);
if (pe) throw pe;
const result = { store, total:mapping.length, matched:0, uploaded:0, skipped:0, errors:[], dry_run:!apply };

for (const item of mapping) {
  const found = products.filter(p => normalize(p.name)===normalize(item.product_name) && samePrice(p.price,item.product_price));
  if (found.length !== 1) { result.errors.push({type:'product_match', item, matches:found}); continue; }
  const product = found[0]; result.matched++;
  const { data: existing, error: ee } = await supabase.from('product_images').select('id,storage_path').eq('product_id',product.id);
  if (ee) { result.errors.push({type:'existing_images', product:product.name, message:ee.message}); continue; }
  if ((existing?.length || 0) > 0 && !overwrite) { console.log(`[SKIP] ${product.name}: ya tiene imagen`); result.skipped++; continue; }
  const local = path.join(root,'images',item.image_file);
  if (!fs.existsSync(local)) { result.errors.push({type:'missing_file', file:item.image_file}); continue; }
  console.log(`${apply?'[APPLY]':'[DRY RUN]'} ${product.name} <= ${item.image_file}`);
  if (!apply) continue;
  if (overwrite && existing?.length) {
    const paths=existing.map(x=>x.storage_path).filter(Boolean);
    if (paths.length) await supabase.storage.from('product-images').remove(paths);
    await supabase.from('product_images').delete().eq('product_id',product.id);
  }
  const ext=path.extname(item.image_file).toLowerCase() || '.jpeg';
  const storagePath=`${product.id}/deparis-initial-${item.source_row}${ext}`;
  const contentType=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';
  const { error: ue } = await supabase.storage.from('product-images').upload(storagePath,fs.readFileSync(local),{cacheControl:'31536000',contentType,upsert:overwrite});
  if (ue) { result.errors.push({type:'upload', product:product.name, message:ue.message}); continue; }
  const imageUrl=supabase.storage.from('product-images').getPublicUrl(storagePath).data.publicUrl;
  const { error: ie } = await supabase.from('product_images').insert({product_id:product.id,image_url:imageUrl,storage_path:storagePath,is_main:true,position:0});
  if (ie) { await supabase.storage.from('product-images').remove([storagePath]); result.errors.push({type:'insert',product:product.name,message:ie.message}); continue; }
  await supabase.from('products').update({image_url:imageUrl}).eq('id',product.id).eq('store_id',store.id);
  result.uploaded++;
}
fs.writeFileSync(path.join(root,'resultado-asignacion.json'),JSON.stringify(result,null,2));
console.log('\n',result);
if (!apply) console.log('\nSimulación completada. Usa --apply para realizar la carga.');
