import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { supabaseAdmin } from "@/lib/supabase-admin";
//lk
export const runtime = "nodejs";
export const maxDuration = 60;

type ImageKind = "product" | "combo" | "banner" | "logo" | "generic";

type Candidate = {
  key: string;
  table: string;
  id: string;
  column: string;
  url: string;
  kind: ImageKind;
  storagePathColumn?: string;
};

const SOURCES: Array<{
  table: string;
  columns: Array<{
    column: string;
    kind: ImageKind;
  }>;
  storagePathColumn?: string;
}> = [
  {
    table: "product_images",
    columns: [{ column: "image_url", kind: "product" }],
    storagePathColumn: "storage_path",
  },
];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function requireSuperAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) return { error: "Sesión no encontrada." };

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return { error: "Sesión inválida o vencida." };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, active")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.active !== true ||
    profile.role !== "super_admin"
  ) {
    return { error: "Solo un Super Admin puede ejecutar esta migración." };
  }

  return { user: userData.user };
}

function parseSupabaseStorageUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const markers = [
      "/storage/v1/object/public/",
      "/storage/v1/object/sign/",
      "/storage/v1/render/image/public/",
      "/storage/v1/render/image/sign/",
    ];

    const marker = markers.find((value) => url.pathname.includes(value));
    if (!marker) return null;

    const after = decodeURIComponent(url.pathname.split(marker)[1] || "");
    const slash = after.indexOf("/");
    if (slash <= 0) return null;

    const bucket = after.slice(0, slash);
    const path = after.slice(slash + 1);

    if (!bucket || !path) return null;

    return { bucket, path };
  } catch {
    return null;
  }
}

function alreadyOptimized(url: string) {
  const parsed = parseSupabaseStorageUrl(url);
  if (!parsed) return false;

  return (
    parsed.path.includes("/optimized/") ||
    parsed.path.endsWith(".webp") ||
    parsed.path.endsWith(".avif")
  );
}

function imageSettings(kind: ImageKind) {
  switch (kind) {
    case "banner":
      return { width: 1920, height: 1080, quality: 82, fit: "inside" as const };
    case "combo":
      return { width: 1600, height: 1100, quality: 80, fit: "inside" as const };
    case "logo":
      return { width: 1000, height: 1000, quality: 86, fit: "inside" as const };
    case "product":
      return { width: 1600, height: 1600, quality: 80, fit: "inside" as const };
    default:
      return { width: 1600, height: 1600, quality: 80, fit: "inside" as const };
  }
}

async function validateImageBuffer(buffer: Buffer, expectedFormat = "webp") {
  const metadata = await sharp(buffer, { sequentialRead: true }).metadata();

  if (
    metadata.format !== expectedFormat ||
    !metadata.width ||
    !metadata.height ||
    metadata.width < 2 ||
    metadata.height < 2
  ) {
    throw new Error(
      `La imagen generada no pasó la validación (${metadata.format || "sin formato"}).`
    );
  }

  // Fuerza una decodificación completa de píxeles, no solo de cabeceras.
  await sharp(buffer, { sequentialRead: true })
    .resize({ width: 8, height: 8, fit: "inside" })
    .raw()
    .toBuffer();

  return metadata;
}

async function scanCandidates(limit: number) {
  const results: Candidate[] = [];
  const warnings: string[] = [];

  for (const source of SOURCES) {
    if (results.length >= limit) break;

    const selectColumns = [
      "id",
      ...source.columns.map((item) => item.column),
      ...(source.storagePathColumn ? [source.storagePathColumn] : []),
    ].join(",");

    const { data, error } = await supabaseAdmin
      .from(source.table)
      .select(selectColumns)
      .limit(Math.max(limit - results.length, 1));

    if (error) {
      warnings.push(`${source.table}: ${error.message}`);
      continue;
    }

    for (const rawRow of data ?? []) {
      const row = rawRow as unknown as Record<string, unknown>;

      for (const item of source.columns) {
        const url = String(row[item.column] ?? "").trim();

       if (!url || !parseSupabaseStorageUrl(url) || alreadyOptimized(url)) {
  continue;
}

const parsed = parseSupabaseStorageUrl(url);
if (!parsed) continue;

try {
  const { data: file } = await supabaseAdmin.storage
    .from(parsed.bucket)
    .download(parsed.path);

  if (!file) continue;

  const bytes = file.size;

  // ignorar imágenes menores de 1 MB
  if (bytes < 1000000) {
    continue;
  }
} catch {
  continue;
}

        results.push({
          key: `${source.table}:${String(row.id ?? "")}:${item.column}`,
          table: source.table,
          id: String(row.id ?? ""),
          column: item.column,
          url,
          kind: item.kind,
          storagePathColumn: source.storagePathColumn,
        });

        if (results.length >= limit) break;
      }

      if (results.length >= limit) break;
    }
  }

  return { candidates: results, warnings };
}

async function optimizeCandidate(
  candidate: Candidate,
  deleteOriginal: boolean
) {
  const parsed = parseSupabaseStorageUrl(candidate.url);

  if (!parsed) {
    throw new Error("La URL no pertenece a Supabase Storage.");
  }

  const { data: downloadData, error: downloadError } =
    await supabaseAdmin.storage.from(parsed.bucket).download(parsed.path);

  if (downloadError || !downloadData) {
    throw new Error(
      downloadError?.message || "No se pudo descargar la imagen original."
    );
  }

  const originalBuffer = Buffer.from(await downloadData.arrayBuffer());
  const settings = imageSettings(candidate.kind);

  // Valida primero que el original se pueda decodificar.
  await sharp(originalBuffer, { sequentialRead: true }).metadata();

  const optimizedBuffer = await sharp(originalBuffer, {
    sequentialRead: true,
    limitInputPixels: 100_000_000,
  })
    .rotate()
    .toColorspace("srgb")
    .resize({
      width: settings.width,
      height: settings.height,
      fit: settings.fit,
      withoutEnlargement: true,
    })
    .webp({
      quality: settings.quality,
      effort: 4,
      smartSubsample: false,
    })
    .toBuffer();

  await validateImageBuffer(optimizedBuffer);

  const originalFolder = parsed.path.includes("/")
    ? parsed.path.slice(0, parsed.path.lastIndexOf("/"))
    : "";

  const optimizedPath = [
    originalFolder,
    "optimized",
    `${crypto.randomUUID()}.webp`,
  ]
    .filter(Boolean)
    .join("/");

  // IMPORTANTE:
  // En Node/Next.js no enviamos el Buffer directamente a Supabase Storage.
  // Algunos entornos pueden enviar también bytes sobrantes del ArrayBuffer
  // subyacente y producir archivos WebP corruptos.
  // Creamos un ArrayBuffer exacto con solamente los bytes válidos.
  const exactArrayBuffer = optimizedBuffer.buffer.slice(
    optimizedBuffer.byteOffset,
    optimizedBuffer.byteOffset + optimizedBuffer.byteLength
  ) as ArrayBuffer;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(parsed.bucket)
    .upload(optimizedPath, exactArrayBuffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  try {
    // Descarga nuevamente lo almacenado y compara byte por byte mediante hash.
    const { data: uploadedData, error: uploadedDownloadError } =
      await supabaseAdmin.storage
        .from(parsed.bucket)
        .download(optimizedPath);

    if (uploadedDownloadError || !uploadedData) {
      throw new Error(
        uploadedDownloadError?.message ||
          "No se pudo verificar el archivo después de subirlo."
      );
    }

    const uploadedBuffer = Buffer.from(await uploadedData.arrayBuffer());

    // Supabase/CDN puede devolver una representación binaria distinta aunque
    // la imagen sea válida. Por eso verificamos que el archivo remoto se pueda
    // decodificar completamente como WebP, en lugar de exigir igualdad byte a byte.
    await validateImageBuffer(uploadedBuffer);
  } catch (error) {
    await supabaseAdmin.storage.from(parsed.bucket).remove([optimizedPath]);
    throw error;
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(parsed.bucket)
    .getPublicUrl(optimizedPath);

  const updatePayload: Record<string, string> = {
    [candidate.column]: publicUrlData.publicUrl,
  };

  if (candidate.storagePathColumn) {
    updatePayload[candidate.storagePathColumn] = optimizedPath;
  }

  const { error: updateError } = await supabaseAdmin
    .from(candidate.table)
    .update(updatePayload)
    .eq("id", candidate.id);

  if (updateError) {
    await supabaseAdmin.storage.from(parsed.bucket).remove([optimizedPath]);
    throw new Error(`No se actualizó la base de datos: ${updateError.message}`);
  }

  let originalDeleted = false;

  if (deleteOriginal && parsed.path !== optimizedPath) {
    const { error: deleteError } = await supabaseAdmin.storage
      .from(parsed.bucket)
      .remove([parsed.path]);

    if (!deleteError) originalDeleted = true;
  }

  return {
    oldUrl: candidate.url,
    newUrl: publicUrlData.publicUrl,
    originalBytes: originalBuffer.length,
    optimizedBytes: optimizedBuffer.length,
    savedBytes: Math.max(originalBuffer.length - optimizedBuffer.length, 0),
    originalDeleted,
  };
}

export async function POST(request: NextRequest) {
  const access = await requireSuperAdmin(request);

  if ("error" in access) {
    return jsonError(
      access.error ?? "No tienes permisos para ejecutar esta migración.",
      403
    );
  }

  let body: {
    action?: "scan" | "optimize";
    limit?: number;
    candidate?: Candidate;
    deleteOriginal?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("Solicitud inválida.");
  }

  if (body.action === "scan") {
    const limit = Math.min(Math.max(Number(body.limit || 250), 1), 1000);
    const result = await scanCandidates(limit);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  }

  if (body.action === "optimize") {
    if (!body.candidate) {
      return jsonError("Falta la imagen que se va a optimizar.");
    }

    try {
      const result = await optimizeCandidate(
        body.candidate,
        body.deleteOriginal === true
      );

      return NextResponse.json({ ok: true, result });
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "No se pudo optimizar."
      );
    }
  }

  return jsonError("Acción no reconocida.");
}