import { travelDraftFromText } from './import-text';

export async function extractTravelPdf(file: File, progress: (message: string) => void) {
  if (file.size > 30 * 1024 * 1024) throw new Error('El PDF supera los 30 MB.');
  const buffer = await file.arrayBuffer();
  if (!new TextDecoder().decode(buffer.slice(0, 1024)).includes('%PDF-')) throw new Error('El archivo no es un PDF válido.');
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerPort) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), { type: 'module' });
  }
  const task = pdfjs.getDocument({ data: buffer, isEvalSupported: false, useSystemFonts: true, maxImageSize: 16000000 });
  const images: Blob[] = [];
  const imageIds = new Set<string>();
  const pages: string[] = [];
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 40) throw new Error('Importa documentos de hasta 40 páginas.');
    for (let number = 1; number <= pdf.numPages; number++) {
      progress(`Leyendo página ${number} de ${pdf.numPages}…`);
      const page = await pdf.getPage(number);
      const text = await page.getTextContent();
      const rows = new Map<number, { x: number; text: string }[]>();
      for (const item of text.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const y = Math.round(item.transform[5] / 3) * 3;
        const row = rows.get(y) || [];
        row.push({ x: item.transform[4], text: item.str }); rows.set(y, row);
      }
      pages.push([...rows.entries()].sort(([a], [b]) => b - a).map(([, row]) => row.sort((a, b) => a.x - b.x).map(item => item.text).join(' ')).join('\n'));
      if (images.length < 12) {
        const viewport = page.getViewport({ scale: Math.min(1, 900 / page.getViewport({ scale: 1 }).width) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        // Rendering resolves compressed embedded images into decoded pixel data.
        await page.render({ canvas, viewport }).promise;
        const ops = await page.getOperatorList();
        for (let i = 0; i < ops.fnArray.length && images.length < 12; i++) {
          if (ops.fnArray[i] !== pdfjs.OPS.paintImageXObject) continue;
          const id = String(ops.argsArray[i][0]);
          if (imageIds.has(id)) continue;
          imageIds.add(id);
          try {
            const image = page.objs.has(id) ? page.objs.get(id) : page.commonObjs.get(id);
            if (!image || image.width < 240 || image.height < 140 || image.width * image.height > 16000000) continue;
            const photo = document.createElement('canvas');
            photo.width = image.width; photo.height = image.height;
            const context = photo.getContext('2d')!;
            if (image.bitmap) context.drawImage(image.bitmap, 0, 0);
            else if (image.data) {
              const rgba = new Uint8ClampedArray(image.width * image.height * 4);
              if (image.kind === pdfjs.ImageKind.RGBA_32BPP) rgba.set(image.data);
              else if (image.kind === pdfjs.ImageKind.RGB_24BPP) {
                for (let pixel = 0; pixel < image.width * image.height; pixel++) { rgba[pixel*4] = image.data[pixel*3]; rgba[pixel*4+1] = image.data[pixel*3+1]; rgba[pixel*4+2] = image.data[pixel*3+2]; rgba[pixel*4+3] = 255; }
              } else continue;
              context.putImageData(new ImageData(rgba, image.width, image.height), 0, 0);
            } else continue;
            const thumbnail = document.createElement('canvas');
            thumbnail.width = Math.min(1600, photo.width); thumbnail.height = Math.round(photo.height * thumbnail.width / photo.width);
            thumbnail.getContext('2d')!.drawImage(photo, 0, 0, thumbnail.width, thumbnail.height);
            const blob = await new Promise<Blob | null>(resolve => thumbnail.toBlob(resolve, 'image/webp', 0.85));
            if (blob) images.push(blob);
            photo.width = photo.height = thumbnail.width = thumbnail.height = 0;
          } catch { /* A decorative image can be unsupported without losing the document. */ }
        }
        canvas.width = canvas.height = 0;
      }
      page.cleanup();
    }
    const result = travelDraftFromText(pages.join('\n\n'), file.name);
    if (!images.length) result.warnings.push('No se pudieron extraer fotografías independientes. Sube una portada o imagen propia.');
    return { ...result, images };
  } finally { await task.destroy(); }
}
