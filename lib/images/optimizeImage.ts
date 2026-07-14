"use client";

export type ImageOptimizationPreset =
  | "product"
  | "banner"
  | "combo"
  | "logo";

type OptimizeOptions = {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  outputType: "image/webp" | "image/png";
};

const PRESETS: Record<ImageOptimizationPreset, OptimizeOptions> = {
  product: {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.8,
    outputType: "image/webp",
  },
  banner: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.82,
    outputType: "image/webp",
  },
  combo: {
    maxWidth: 1600,
    maxHeight: 1000,
    quality: 0.8,
    outputType: "image/webp",
  },
  logo: {
    maxWidth: 900,
    maxHeight: 900,
    quality: 0.88,
    outputType: "image/png",
  },
};

const MAX_INPUT_BYTES = 25 * 1024 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo leer la imagen seleccionada."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  outputType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo optimizar la imagen."));
      },
      outputType,
      quality
    );
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function optimizeImageFile(
  file: File,
  preset: ImageOptimizationPreset = "product"
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen válido.");
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("La imagen supera el límite de 25 MB.");
  }

  // SVG y GIF animado no deben pasar por canvas porque perderían propiedades.
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  const options = PRESETS[preset];
  const image = await loadImage(file);
  const scale = Math.min(
    1,
    options.maxWidth / image.naturalWidth,
    options.maxHeight / image.naturalHeight
  );

  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Tu navegador no pudo procesar la imagen.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(
    canvas,
    options.outputType,
    options.quality
  );

  // Evita reemplazar el original si, excepcionalmente, la conversión pesa más.
  if (blob.size >= file.size && scale === 1) return file;

  const extension = options.outputType === "image/webp" ? "webp" : "png";
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-");

  return new File([blob], `${baseName}.${extension}`, {
    type: options.outputType,
    lastModified: Date.now(),
  });
}
