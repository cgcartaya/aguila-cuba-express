import sharp from "sharp";

export async function prepareRouteImage(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024) throw new Error("Selecciona una imagen JPG, PNG o WebP de hasta 3 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const input = sharp(bytes, { limitInputPixels: 25000000, animated: false });
  const metadata = await input.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format || "")) throw new Error("Formato no compatible. Usa JPG, PNG o WebP.");
  return input.rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
}
