#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const STORE_ID = "269f9a43-827a-4f4a-a2bd-9562bb514a13";
const STORE_SLUG = "jotajota";
const SOURCE_HOST = "img1.elyerromenu.com";
const BUCKET = "product-images";
const STORAGE_PREFIX = `menu/${STORE_SLUG}`;

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const TARGET_MAX_BYTES = 350 * 1024;
const QUALITY_STEPS = [75, 65, 55, 45, 35];
const DIMENSION_STEPS = [1200, 1050, 900, 800];

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

function die(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isYerromenuUrl(value) {
  try {
    return new URL(value).hostname === SOURCE_HOST;
  } catch {
    return false;
  }
}

async function optimizeToWebp(input) {
  const originalMeta = await sharp(input).metadata();
  let best = null;

  for (const dimension of DIMENSION_STEPS) {
    for (const quality of QUALITY_STEPS) {
      const output = await sharp(input)
        .rotate()
        .resize({
          width: Math.min(dimension, MAX_WIDTH),
          height: Math.min(dimension, MAX_HEIGHT),
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality,
          effort: 4,
          smartSubsample: true,
        })
        .toBuffer();

      best = { buffer: output, quality, dimension, originalMeta };

      if (output.length <= TARGET_MAX_BYTES) {
        return best;
      }
    }
  }

  return best;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  die("Falta NEXT_PUBLIC_SUPABASE_URL en el entorno.");
}

if (!serviceRoleKey) {
  die(
    "Falta SUPABASE_SERVICE_ROLE_KEY. No uses la anon key para esta migración. " +
      "Ejecuta el script localmente con la service role key solamente en tu máquina."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  console.log("JotaJota · migración de imágenes");
  console.log(`Modo: ${APPLY ? "APLICAR CAMBIOS" : "DRY RUN (sin cambios)"}`);
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Carpeta: ${STORAGE_PREFIX}/\n`);

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, slug")
    .eq("id", STORE_ID)
    .eq("slug", STORE_SLUG)
    .maybeSingle();

  if (storeError) die(`No se pudo validar la tienda: ${storeError.message}`);
  if (!store) die("No existe JotaJota con el store_id y slug esperados.");

  const { data: items, error: itemsError } = await supabase
    .from("menu_items")
    .select("id, name, image_url")
    .eq("store_id", STORE_ID)
    .order("sort_order", { ascending: true });

  if (itemsError) die(`No se pudieron leer los platos: ${itemsError.message}`);

  const candidates = (items ?? []).filter((item) => isYerromenuUrl(item.image_url));
  const alreadyMigrated = (items ?? []).filter(
    (item) => item.image_url && !isYerromenuUrl(item.image_url)
  );
  const withoutImage = (items ?? []).filter((item) => !item.image_url);

  console.log(`Platos totales: ${items?.length ?? 0}`);
  console.log(`Con imagen de El Yerromenu: ${candidates.length}`);
  console.log(`Con otra URL/ya migrados: ${alreadyMigrated.length}`);
  console.log(`Sin imagen: ${withoutImage.length}\n`);

  if (candidates.length === 0) {
    console.log("✅ No hay imágenes de El Yerromenu pendientes.");
    return;
  }

  if (!APPLY) {
    console.log("DRY RUN: no se descargará, subirá ni modificará nada.");
    console.log('Ejecuta de nuevo con "--apply" cuando quieras hacer la migración.\n');
    for (const item of candidates) {
      console.log(`• ${item.name}`);
      console.log(`  ${item.image_url}`);
    }
    return;
  }

  let migrated = 0;
  let failed = 0;
  let originalBytes = 0;
  let optimizedBytes = 0;

  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];
    const number = `${i + 1}/${candidates.length}`;
    console.log(`[${number}] ${item.name}`);

    try {
      const response = await fetch(item.image_url, {
        headers: {
          "User-Agent": "Mozilla/5.0 JotaJotaMenuImageMigration/1.0",
          Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} al descargar`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        throw new Error(`La URL no devolvió una imagen (${contentType || "sin content-type"})`);
      }

      const input = Buffer.from(await response.arrayBuffer());
      if (input.length === 0) throw new Error("Imagen vacía");

      const optimized = await optimizeToWebp(input);
      if (!optimized?.buffer?.length) throw new Error("No se pudo optimizar");

      const path = `${STORAGE_PREFIX}/${item.id}.webp`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, optimized.buffer, {
          cacheControl: "31536000",
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage: ${uploadError.message}`);
      }

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) throw new Error("Supabase no devolvió URL pública");

      const { error: updateError } = await supabase
        .from("menu_items")
        .update({ image_url: publicUrl })
        .eq("id", item.id)
        .eq("store_id", STORE_ID);

      if (updateError) {
        // El archivo ya se subió; se intenta limpiar para no dejar un huérfano.
        await supabase.storage.from(BUCKET).remove([path]);
        throw new Error(`Base de datos: ${updateError.message}`);
      }

      migrated += 1;
      originalBytes += input.length;
      optimizedBytes += optimized.buffer.length;

      const width = optimized.originalMeta.width ?? "?";
      const height = optimized.originalMeta.height ?? "?";
      console.log(
        `  ✅ ${width}×${height} · ${formatBytes(input.length)} → ` +
          `${formatBytes(optimized.buffer.length)} · q${optimized.quality} · ` +
          `${optimized.dimension}px max`
      );
    } catch (error) {
      failed += 1;
      console.error(`  ❌ ${error instanceof Error ? error.message : String(error)}`);
      if (!FORCE) {
        console.error(
          '\nMigración detenida para evitar una ejecución parcial silenciosa. ' +
            'Puedes corregir el problema y volver a ejecutar; los ya migrados se omiten automáticamente.'
        );
        process.exitCode = 1;
        break;
      }
    }
  }

  console.log("\nResumen:");
  console.log(`  Migradas: ${migrated}`);
  console.log(`  Fallidas: ${failed}`);

  if (migrated > 0) {
    console.log(`  Peso fuente procesado: ${formatBytes(originalBytes)}`);
    console.log(`  Peso optimizado: ${formatBytes(optimizedBytes)}`);
    if (originalBytes > 0) {
      const reduction = (1 - optimizedBytes / originalBytes) * 100;
      console.log(`  Reducción aproximada: ${reduction.toFixed(1)}%`);
    }
  }

  const { data: verifyItems, error: verifyError } = await supabase
    .from("menu_items")
    .select("id, image_url")
    .eq("store_id", STORE_ID);

  if (verifyError) {
    die(`No se pudo hacer la verificación final: ${verifyError.message}`);
  }

  const remaining = (verifyItems ?? []).filter((item) => isYerromenuUrl(item.image_url));

  console.log(`  URLs de El Yerromenu restantes: ${remaining.length}`);

  if (remaining.length === 0 && failed === 0) {
    console.log("\n✅ Migración completada. JotaJota ya no depende de El Yerromenu para sus fotos.");
  } else if (remaining.length > 0) {
    console.log("\n⚠️ Aún quedan imágenes pendientes. Vuelve a ejecutar el script cuando resuelvas las fallidas.");
  }
}

main().catch((error) => {
  die(error instanceof Error ? error.stack || error.message : String(error));
});
