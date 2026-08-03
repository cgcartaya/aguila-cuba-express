#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const overwriteOptimized = args.has('--overwrite-optimized');
const maxWidth = Number(process.env.IMAGE_MAX_WIDTH || 1200);
const maxHeight = Number(process.env.IMAGE_MAX_HEIGHT || 1200);
const quality = Number(process.env.IMAGE_WEBP_QUALITY || 82);
const bucket = process.env.PRODUCT_IMAGES_BUCKET || 'product-images';
const slug = process.env.DEPARIS_STORE_SLUG || 'deparis';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('Faltan SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY');
}
if (!Number.isFinite(maxWidth) || maxWidth < 100 || !Number.isFinite(maxHeight) || maxHeight < 100) {
  throw new Error('IMAGE_MAX_WIDTH e IMAGE_MAX_HEIGHT deben ser números válidos mayores de 100');
}
if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
  throw new Error('IMAGE_WEBP_QUALITY debe estar entre 1 y 100');
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(root, apply ? 'resultado-optimizacion.json' : 'simulacion-optimizacion.json');
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const safeBase = (storagePath, imageId) => {
  const original = path.basename(storagePath || `image-${imageId}`);
  const stem = original.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return stem || `image-${imageId}`;
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
};

async function fetchAllProductImages(productIds) {
  const all = [];
  const chunkSize = 100;
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const ids = productIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('product_images')
      .select('id,product_id,image_url,storage_path,is_main,position')
      .in('product_id', ids)
      .order('position', { ascending: true });
    if (error) throw error;
    all.push(...(data || []));
  }
  return all;
}

const { data: store, error: storeError } = await supabase
  .from('stores')
  .select('id,name,slug')
  .eq('slug', slug)
  .maybeSingle();
if (storeError || !store) throw new Error(`Tienda no encontrada: ${storeError?.message || slug}`);

const { data: products, error: productsError } = await supabase
  .from('products')
  .select('id,name,image_url,deleted_at')
  .eq('store_id', store.id)
  .is('deleted_at', null);
if (productsError) throw productsError;

const productMap = new Map((products || []).map((p) => [p.id, p]));
const images = await fetchAllProductImages([...productMap.keys()]);

const result = {
  mode: apply ? 'apply' : 'dry-run',
  store,
  settings: { bucket, maxWidth, maxHeight, quality },
  totals: {
    products: products?.length || 0,
    images: images.length,
    candidates: 0,
    optimized: 0,
    skippedAlreadyOptimized: 0,
    skippedMissingStoragePath: 0,
    skippedNoSavings: 0,
    errors: 0,
    originalBytes: 0,
    optimizedBytes: 0,
    estimatedSavedBytes: 0,
  },
  items: [],
  errors: [],
};

for (const image of images) {
  const product = productMap.get(image.product_id);
  const item = {
    image_id: image.id,
    product_id: image.product_id,
    product_name: product?.name || '(producto desconocido)',
    is_main: Boolean(image.is_main),
    old_storage_path: image.storage_path,
    old_image_url: image.image_url,
  };

  try {
    if (!image.storage_path) {
      item.status = 'skipped_missing_storage_path';
      result.totals.skippedMissingStoragePath++;
      result.items.push(item);
      continue;
    }

    if (/\/optimized\/.*\.webp$/i.test(image.storage_path) && !overwriteOptimized) {
      item.status = 'skipped_already_optimized';
      result.totals.skippedAlreadyOptimized++;
      result.items.push(item);
      continue;
    }

    result.totals.candidates++;
    const { data: downloaded, error: downloadError } = await supabase.storage.from(bucket).download(image.storage_path);
    if (downloadError || !downloaded) throw new Error(`Descarga: ${downloadError?.message || 'archivo vacío'}`);

    const originalBuffer = Buffer.from(await downloaded.arrayBuffer());
    const inputMeta = await sharp(originalBuffer, { failOn: 'none' }).metadata();
    const optimizedBuffer = await sharp(originalBuffer, { failOn: 'none' })
      .rotate()
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4, smartSubsample: true })
      .toBuffer();
    const outputMeta = await sharp(optimizedBuffer).metadata();

    const originalBytes = originalBuffer.length;
    const optimizedBytes = optimizedBuffer.length;
    const savedBytes = originalBytes - optimizedBytes;
    const savedPercent = originalBytes > 0 ? (savedBytes / originalBytes) * 100 : 0;
    result.totals.originalBytes += originalBytes;

    Object.assign(item, {
      original: {
        bytes: originalBytes,
        human: formatBytes(originalBytes),
        width: inputMeta.width || null,
        height: inputMeta.height || null,
        format: inputMeta.format || null,
      },
      optimized: {
        bytes: optimizedBytes,
        human: formatBytes(optimizedBytes),
        width: outputMeta.width || null,
        height: outputMeta.height || null,
        format: 'webp',
      },
      saved_bytes: savedBytes,
      saved_percent: Number(savedPercent.toFixed(2)),
    });

    // Evita reemplazar por un archivo mayor. Se puede forzar reduciendo calidad y repitiendo.
    if (optimizedBytes >= originalBytes) {
      item.status = 'skipped_no_savings';
      result.totals.skippedNoSavings++;
      result.items.push(item);
      console.log(`[SKIP] ${item.product_name}: WebP no reduce (${item.original.human} -> ${item.optimized.human})`);
      continue;
    }

    const base = safeBase(image.storage_path, image.id);
    const newStoragePath = `${image.product_id}/optimized/${base}-q${quality}-${maxWidth}x${maxHeight}.webp`;
    const newImageUrl = supabase.storage.from(bucket).getPublicUrl(newStoragePath).data.publicUrl;
    item.new_storage_path = newStoragePath;
    item.new_image_url = newImageUrl;

    console.log(`${apply ? '[APPLY]' : '[DRY RUN]'} ${item.product_name}: ${item.original.human} -> ${item.optimized.human} (${item.saved_percent}% menos)`);

    if (!apply) {
      item.status = 'ready';
      result.totals.optimizedBytes += optimizedBytes;
      result.totals.estimatedSavedBytes += savedBytes;
      result.items.push(item);
      continue;
    }

    const { error: uploadError } = await supabase.storage.from(bucket).upload(newStoragePath, optimizedBuffer, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: overwriteOptimized,
    });
    if (uploadError) throw new Error(`Subida WebP: ${uploadError.message}`);

    const { error: imageUpdateError } = await supabase
      .from('product_images')
      .update({ image_url: newImageUrl, storage_path: newStoragePath })
      .eq('id', image.id)
      .eq('product_id', image.product_id);
    if (imageUpdateError) {
      await supabase.storage.from(bucket).remove([newStoragePath]);
      throw new Error(`Actualizar product_images: ${imageUpdateError.message}`);
    }

    const shouldUpdateProduct = Boolean(image.is_main) || product?.image_url === image.image_url;
    if (shouldUpdateProduct) {
      const { error: productUpdateError } = await supabase
        .from('products')
        .update({ image_url: newImageUrl })
        .eq('id', image.product_id)
        .eq('store_id', store.id);
      if (productUpdateError) {
        // Restablece product_images antes de retirar el archivo nuevo.
        await supabase
          .from('product_images')
          .update({ image_url: image.image_url, storage_path: image.storage_path })
          .eq('id', image.id)
          .eq('product_id', image.product_id);
        await supabase.storage.from(bucket).remove([newStoragePath]);
        throw new Error(`Actualizar products.image_url: ${productUpdateError.message}`);
      }
    }

    item.status = 'optimized';
    result.totals.optimized++;
    result.totals.optimizedBytes += optimizedBytes;
    result.totals.estimatedSavedBytes += savedBytes;
    result.items.push(item);
  } catch (error) {
    item.status = 'error';
    item.error = error instanceof Error ? error.message : String(error);
    result.totals.errors++;
    result.errors.push(item);
    result.items.push(item);
    console.error(`[ERROR] ${item.product_name}: ${item.error}`);
  }
}

result.summary = {
  original: formatBytes(result.totals.originalBytes),
  optimized: formatBytes(result.totals.optimizedBytes),
  estimated_saved: formatBytes(result.totals.estimatedSavedBytes),
  estimated_saved_percent: result.totals.originalBytes > 0
    ? Number(((result.totals.estimatedSavedBytes / result.totals.originalBytes) * 100).toFixed(2))
    : 0,
};

fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
console.log('\nResumen:');
console.log(JSON.stringify({ mode: result.mode, totals: result.totals, summary: result.summary, report: reportPath }, null, 2));
if (!apply) console.log('\nSimulación terminada. Revisa el reporte y usa --apply para ejecutar.');
else console.log('\nOptimización terminada. Los originales NO fueron eliminados.');
