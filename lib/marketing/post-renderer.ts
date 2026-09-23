import QRCode from "qrcode";

export type Template = "offer" | "multi" | "combo" | "store";
export type Format = "square" | "story";
export type PostProduct = { id: string; name: string; price: number; image: string; url?: string };
export type PostDesign = { template: Template; format: Format; products: PostProduct[]; storeName: string; storeUrl: string; logo?: string; headline: string; footer: string; accent: string; showQr: boolean; showPrice: boolean };
const text = (ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, size: number, color: string, lines = 2) => {
  ctx.fillStyle = color; ctx.font = `bold ${size}px Arial`;
  const words = value.trim().split(/\s+/); let line = "", row = 0;
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width > width && line) { ctx.fillText(line, x, y + row * size * 1.15); row++; if (row >= lines) return; line = word; }
    else line = next;
  }
  if (row < lines) ctx.fillText(line, x, y + row * size * 1.15);
};
const load = async (url: string) => { const img = new Image(); img.crossOrigin = "anonymous"; img.src = url; await img.decode(); return img; };
async function contain(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, w: number, h: number) {
  try {
    const img = await load(url); const scale = Math.min(w / img.width, h / img.height);
    ctx.drawImage(img, x + (w - img.width * scale) / 2, y + (h - img.height * scale) / 2, img.width * scale, img.height * scale);
    return true;
  } catch { return false; }
}
export async function renderPost(canvas: HTMLCanvasElement, design: PostDesign) {
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas no disponible");
  const w = 1080, h = design.format === "story" ? 1920 : 1080;
  canvas.width = w; canvas.height = h;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = design.accent; ctx.fillRect(0, 0, w, 205);
  if (design.logo) await contain(ctx, design.logo, 40, 24, 155, 155);
  const left = design.logo ? 215 : 55;
  text(ctx, design.storeName, left, 83, w - left - 45, 46, "#ffffff", 1);
  text(ctx, design.headline, 55, 165, 960, 53, "#ffffff", 1);
  const bottom = h - 210, areaTop = 240, areaHeight = bottom - areaTop - 30;
  ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 205, w, bottom - 205);
  const products = design.template === "store" ? design.products.slice(0, 4) : design.template === "multi" ? design.products.slice(0, 6) : design.products.slice(0, 1);
  if (design.template === "multi" || design.template === "store") {
    const cols = 2, rows = Math.ceil(products.length / cols), cellW = 500, cellH = Math.min(470, areaHeight / Math.max(rows, 1));
    for (let i = 0; i < products.length; i++) {
      const p = products[i], x = 30 + (i % cols) * 525, y = areaTop + Math.floor(i / cols) * cellH;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, cellW, cellH - 12);
      if (!await contain(ctx, p.image, x + 15, y + 10, cellW - 30, cellH - 125)) throw new Error("No se pudo cargar una fotografía. Comprueba la URL y sus permisos CORS.");
      text(ctx, p.name, x + 18, y + cellH - 100, cellW - 35, 27, "#0f172a", 2);
      if (design.showPrice) text(ctx, "$" + Number(p.price).toFixed(2), x + 18, y + cellH - 25, cellW - 35, 43, design.accent, 1);
    }
  } else {
    const p = products[0]; if (!p) throw new Error("Selecciona un producto");
    if (!await contain(ctx, p.image, 90, areaTop + 20, 900, areaHeight - 150)) throw new Error("No se pudo cargar la fotografía. Comprueba la URL y sus permisos CORS.");
    text(ctx, p.name, 55, bottom - 110, 950, 48, "#0f172a", 2);
    if (design.showPrice) {
      ctx.fillStyle = design.accent; ctx.fillRect(55, bottom - 55, 400, 95);
      text(ctx, "$" + Number(p.price).toFixed(2), 76, bottom + 10, 365, 63, "#ffffff", 1);
    }
  }
  ctx.fillStyle = design.accent; ctx.fillRect(0, h - 175, w, 175);
  text(ctx, design.footer, 45, h - 98, design.showQr ? 775 : 970, 36, "#ffffff", 2);
  if (design.showQr) {
    const url = products.length === 1 && products[0].url ? products[0].url : design.storeUrl;
    if (url && /^https:\/\//.test(url)) {
      const qr = await QRCode.toDataURL(url, { width: 180, margin: 1, errorCorrectionLevel: "M" });
      await contain(ctx, qr, w - 175, h - 163, 150, 150);
    }
  }
}
