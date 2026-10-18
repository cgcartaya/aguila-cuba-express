import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { db, owner, json, fail, errorResponse } from "@/lib/shareapp/server";
import { CAMPAIGN_BUCKET, posterUrl } from "@/lib/shareapp/campaigns";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get("storeId") || "";
    await owner(request, storeId);
    if (Number(request.headers.get("content-length")) > 3.5 * 1024 * 1024)
      return fail("El archivo supera el tamaño permitido.", 413);
    const form = await request.formData(),
      file = form.get("poster");
    if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024)
      return fail("Selecciona una imagen de hasta 3 MB.", 413);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return fail("Utiliza una imagen JPG, PNG o WebP.");
    let bytes: Buffer;
    try {
      bytes = await sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 25000000,
        animated: false,
      })
        .rotate()
        .resize({
          width: 1920,
          height: 1920,
          fit: "inside",
          withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 88 })
        .toBuffer();
    } catch {
      return fail(
        "No se pudo leer la imagen. Utiliza un JPG, PNG o WebP válido.",
      );
    }
    if (bytes.length > 3 * 1024 * 1024)
      return fail("La imagen es demasiado grande.", 413);
    const path = `${storeId}/${randomUUID()}.jpg`;
    const { error } = await db.storage
      .from(CAMPAIGN_BUCKET)
      .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
    if (error) throw error;
    return json({ posterPath: path, imageUrl: posterUrl(path) });
  } catch (e) {
    return errorResponse(e);
  }
}
