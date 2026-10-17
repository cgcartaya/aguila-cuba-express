import sharp from "sharp";
import { NextRequest } from "next/server";
import { promotion, itemImage } from "@/lib/shareapp/promotion";
import { storageImageUrl } from "@/lib/shareapp/preview";
import { errorResponse, fail } from "@/lib/shareapp/server";
const LIMIT = 8 * 1024 * 1024;
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { item } = await promotion((await context.params).code);
    const image = itemImage(item);
    const url =
      image &&
      storageImageUrl(image, process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    if (!url)
      return fail(
        "Este producto no tiene una foto disponible para compartir.",
        404,
      );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let bytes: Buffer;
    try {
      const response = await fetch(url, {
        redirect: "error",
        signal: controller.signal,
        cache: "no-store",
      });
      if (
        !response.ok ||
        Number(response.headers.get("content-length")) > LIMIT ||
        !response.body
      )
        return fail("No se pudo obtener la foto.", 502);
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > LIMIT) {
          await reader.cancel();
          return fail("La foto es demasiado grande.", 413);
        }
        chunks.push(value);
      }
      bytes = Buffer.concat(chunks);
    } finally {
      clearTimeout(timer);
    }
    const output = await sharp(bytes, {
      limitInputPixels: 25000000,
      animated: false,
    })
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 88 })
      .toBuffer();
    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": 'inline; filename="producto.jpg"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
