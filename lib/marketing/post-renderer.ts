import QRCode from "qrcode";

export type Template = "offer" | "multi" | "combo" | "store" | "classic" | "premium" | "discount" | "minimal" | "benefits" | "recipe";
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

const singleStyles: Template[] = ["classic","premium","discount","minimal","benefits","recipe"];
const rounded = (ctx: CanvasRenderingContext2D, x:number,y:number,w:number,h:number,r:number,color:string) => {
 ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
};
function priceLabel(ctx:CanvasRenderingContext2D,price:number,x:number,y:number,w:number,accent:string,dark=false) {
 rounded(ctx,x,y,w,115,28,dark?"#ffffff":accent);
 text(ctx,"$"+Number(price).toFixed(2),x+24,y+78,w-45,65,dark?accent:"#ffffff",1);
}
async function renderSingleStyle(ctx:CanvasRenderingContext2D,d:PostDesign,p:PostProduct,w:number,h:number) {
 const style=d.template, story=h>1080, factor=story?1.45:1;
 const footerY=h-170, productTop=story?420:265, productBottom=story?h-400:h-255;
 const dark=style==="discount", light=style==="premium"||style==="minimal"||style==="recipe";
 const background=dark?"#b91c1c":style==="classic"?"#fff2dc":style==="benefits"?"#fff3bf":light?"#ffffff":"#fff7ed";
 ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
 if(style==="classic"||style==="benefits") {
   ctx.fillStyle=d.accent;ctx.beginPath();ctx.arc(980,330,280,0,Math.PI*2);ctx.fill();
   ctx.fillStyle="#ffffff66";ctx.beginPath();ctx.arc(95,690,190,0,Math.PI*2);ctx.fill();
 }
 if(style==="discount") {
   ctx.fillStyle="#facc15";ctx.save();ctx.translate(815,135);ctx.rotate(-0.12);ctx.fillRect(-215,-70,430,140);ctx.restore();
   text(ctx,"¡OFERTA!",635,152,370,64,"#7f1d1d",1);
 }
 if(style==="premium"||style==="minimal"||style==="recipe") {
   rounded(ctx,35,28,1010,130,25,"#f8fafc");
 }
 if(style==="benefits") rounded(ctx,35,30,1010,180,30,d.accent);
 const nameColor=dark?"#ffffff":style==="benefits"?"#ffffff":"#0f172a";
 text(ctx,d.storeName,55,style==="benefits"?100:85,style==="discount"?500:960,45,nameColor,1);
 text(ctx,d.headline,55,style==="benefits"?165:style==="discount"?265:style==="classic"?205:230,940,style==="discount"?66:52,dark?"#ffffff":style==="benefits"?"#ffffff":d.accent,2);
 const imageY=style==="classic"?285:style==="discount"?350:style==="benefits"?290:productTop;
 const imageBottom=style==="discount"?productBottom-35:productBottom;
 const imageX=style==="premium"?110:style==="minimal"?115:style==="recipe"?105:65;
 const imageW=w-imageX*2;
 rounded(ctx,imageX-12,imageY-15,imageW+24,imageBottom-imageY+30,35,"#ffffff");
 if(!await contain(ctx,p.image,imageX+15,imageY+12,imageW-30,imageBottom-imageY-24)) throw new Error("No se pudo cargar la fotografía. Comprueba la URL y sus permisos CORS.");
 const infoY=story?h-365:style==="discount"?h-245:h-235;
 if(style==="recipe"||style==="benefits") {
  text(ctx,style==="recipe"?"IDEAL PARA TUS POSTRES":"CALIDAD PARA TU HOGAR",55,infoY-28,950,28,d.accent,1);
 }
 text(ctx,p.name,55,infoY+25,style==="discount"?550:940,style==="discount"?39:42,dark?"#ffffff":"#0f172a",2);
 if(d.showPrice) priceLabel(ctx,p.price,style==="discount"?680:55,infoY+50,style==="discount"?335:365,d.accent,style==="discount");
 ctx.fillStyle=style==="discount"?"#facc15":d.accent;ctx.fillRect(0,footerY,w,170);
 const footerColor=style==="discount"?"#7f1d1d":"#ffffff";
 text(ctx,d.footer,45,footerY+95,d.showQr?760:970,38,footerColor,2);
 if(d.showQr) {
  const url=p.url||d.storeUrl;
  if(url&&/^https:\/\//.test(url)) {
   const qr=await QRCode.toDataURL(url,{width:180,margin:1,errorCorrectionLevel:"M"});
   rounded(ctx,w-200,footerY+7,180,155,12,"#ffffff");
   await contain(ctx,qr,w-185,footerY+15,150,140);
  }
 }
}

export async function renderPost(canvas: HTMLCanvasElement, design: PostDesign) {
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas no disponible");
  const w = 1080, h = design.format === "story" ? 1920 : 1080;
  canvas.width = w; canvas.height = h;
  if(singleStyles.includes(design.template)) { const product=design.products[0];if(!product)throw new Error("Selecciona un producto");await renderSingleStyle(ctx,design,product,w,h);return; }
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
