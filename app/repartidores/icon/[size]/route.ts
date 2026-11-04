import sharp from 'sharp';
export const runtime='nodejs';
export async function GET(_req:Request,{params}:{params:Promise<{size:string}>}) {
 const {size}=await params; const pixels=Number(size);
 if(![180,192,512].includes(pixels)) return new Response(null,{status:404});
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#133f39"/><path d="M151 198l105-55 105 55v119l-105 58-105-58z M151 198l105 58 105-58 M256 256v119 M204 170l105 58" fill="none" stroke="#d2ef9c" stroke-width="17" stroke-linejoin="round"/><circle cx="355" cy="350" r="60" fill="#d2ef9c"/><path d="M325 350l21 21 39-43" fill="none" stroke="#133f39" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 const png=await sharp(Buffer.from(svg)).resize(pixels,pixels).png().toBuffer();
 return new Response(new Uint8Array(png),{headers:{'Content-Type':'image/png','Cache-Control':'public,max-age=86400'}});
}
