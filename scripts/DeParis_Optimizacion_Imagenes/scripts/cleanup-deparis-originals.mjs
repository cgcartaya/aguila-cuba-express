#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.PRODUCT_IMAGES_BUCKET || 'product-images';
if (!url || !key) throw new Error('Faltan SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportFile = path.join(root, 'resultado-optimizacion.json');
if (!fs.existsSync(reportFile)) throw new Error('No existe resultado-optimizacion.json. Ejecuta primero la optimización con --apply.');

const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
if (report.mode !== 'apply') throw new Error('El reporte no corresponde a una ejecución real con --apply.');
const paths = [...new Set((report.items || []).filter((x) => x.status === 'optimized').map((x) => x.old_storage_path).filter(Boolean))];
if (!paths.length) throw new Error('No hay rutas originales elegibles para eliminar.');

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const result = { mode: apply ? 'apply' : 'dry-run', total: paths.length, deleted: 0, errors: [] };
for (let i = 0; i < paths.length; i += 100) {
  const batch = paths.slice(i, i + 100);
  console.log(`${apply ? '[DELETE]' : '[DRY RUN]'} ${batch.length} archivos`);
  if (!apply) continue;
  const { data, error } = await supabase.storage.from(bucket).remove(batch);
  if (error) result.errors.push({ batch, message: error.message });
  else result.deleted += data?.length || batch.length;
}

fs.writeFileSync(path.join(root, 'resultado-limpieza-originales.json'), JSON.stringify(result, null, 2));
console.log('\n', result);
if (!apply) console.log('\nNo se borró nada. Revisa la tienda y ejecuta nuevamente con --apply solo cuando estés seguro.');
