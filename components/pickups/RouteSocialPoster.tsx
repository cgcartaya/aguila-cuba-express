"use client";

import { useMemo, useRef, useState } from "react";
import { Download, ImageIcon, Loader2, Sparkles } from "lucide-react";
import type { PickupRoute } from "@/lib/pickups/types";

type Props = {
  route: PickupRoute;
  storeName?: string;
  phone?: string | null;
  logoUrl?: string | null;
};

type Point = { x: number; y: number };

function formatRouteDate(value: string) {
  return new Intl.DateTimeFormat("es-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

function uniqueCities(route: PickupRoute) {
  return Array.from(
    new Set(
      (route.stops || [])
        .map((stop) => stop.pickup_request?.city?.trim())
        .filter((city): city is string => Boolean(city))
    )
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines;
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill?: string,
  stroke?: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, ring: string) {
  ctx.save();
  ctx.shadowColor = ring;
  ctx.shadowBlur = 22;
  ctx.strokeStyle = ring;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(x, y + 34, 34, 13, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y + 28);
  ctx.bezierCurveTo(x - 35, y - 8, x - 26, y - 48, x, y - 48);
  ctx.bezierCurveTo(x + 26, y - 48, x + 35, y - 8, x, y + 28);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y - 18, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVan(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;

  roundedRect(ctx, -70, -31, 142, 55, 13, "#f8fafc");
  ctx.fillStyle = "#dbeafe";
  ctx.fillRect(15, -25, 39, 25);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(-58, -21, 55, 7);
  ctx.fillStyle = "#e11d2e";
  ctx.fillRect(-55, -3, 70, 7);
  ctx.fillStyle = "#071d43";
  ctx.fillRect(-17, -18, 12, 28);
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(-43, 25, 12, 0, Math.PI * 2);
  ctx.arc(43, 25, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#94a3b8";
  ctx.beginPath();
  ctx.arc(-43, 25, 5, 0, Math.PI * 2);
  ctx.arc(43, 25, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function routePoints(count: number): Point[] {
  const presets: Point[] = [
    { x: 250, y: 845 },
    { x: 415, y: 785 },
    { x: 565, y: 835 },
    { x: 710, y: 760 },
    { x: 855, y: 835 },
    { x: 940, y: 710 },
  ];
  if (count <= presets.length) return presets.slice(0, Math.max(2, count));
  return Array.from({ length: count }, (_, index) => {
    const t = index / Math.max(1, count - 1);
    return {
      x: 230 + t * 710,
      y: 820 - Math.sin(t * Math.PI * 2.15) * 80 - Math.cos(t * Math.PI) * 28,
    };
  });
}

function drawMapBackground(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = "rgba(96,165,250,.16)";
  ctx.lineWidth = 2;
  const roads = [
    [[180, 670], [350, 715], [520, 650], [740, 700], [1010, 630]],
    [[140, 900], [330, 860], [520, 930], [760, 860], [1040, 900]],
    [[260, 570], [320, 760], [285, 990]],
    [[560, 560], [605, 760], [580, 1000]],
    [[860, 540], [815, 760], [870, 1010]],
  ];
  roads.forEach((road) => {
    ctx.beginPath();
    road.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });
  ctx.restore();
}

export default function RouteSocialPoster({ route, storeName = "YOYO ENVÍOS", phone, logoUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);
  const cities = useMemo(() => uniqueCities(route), [route]);

  async function generatePoster() {
    setGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const navy = "#071d43";
      const red = "#ef233c";
      const blue = "#0b4f93";
      const cyan = "#38bdf8";
      const pale = "#f8fafc";

      const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
      bg.addColorStop(0, "#03152f");
      bg.addColorStop(0.58, "#07366d");
      bg.addColorStop(1, "#0c5ca6");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(255,255,255,.045)";
      for (let x = 0; x <= 1080; x += 54) ctx.fillRect(x, 0, 1, 1350);
      for (let y = 0; y <= 1350; y += 54) ctx.fillRect(0, y, 1080, 1);
      drawMapBackground(ctx);

      ctx.fillStyle = red;
      ctx.fillRect(0, 0, 18, 1350);

      let logo: HTMLImageElement | null = null;
      try {
        logo = await loadImage(logoUrl || "/yoyo/logo-yoyo.jpg");
      } catch {
        logo = null;
      }

      if (logo) {
        roundedRect(ctx, 64, 58, 150, 118, 24, "#ffffff");
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(64, 58, 150, 118, 24);
        ctx.clip();
        ctx.drawImage(logo, 70, 64, 138, 106);
        ctx.restore();
      }

      ctx.fillStyle = "white";
      ctx.font = "900 46px Arial";
      ctx.fillText(storeName.toUpperCase(), logo ? 252 : 64, 110);
      ctx.font = "700 20px Arial";
      ctx.fillStyle = "#c8ddff";
      ctx.fillText("RECOGIDA A DOMICILIO  •  RUTA PROGRAMADA", logo ? 254 : 66, 151);

      roundedRect(ctx, 64, 215, 320, 54, 28, red);
      ctx.fillStyle = "white";
      ctx.font = "900 22px Arial";
      ctx.fillText(`▣  ${formatRouteDate(route.route_date).toUpperCase()}`, 88, 250);

      ctx.fillStyle = "white";
      ctx.font = "900 70px Arial";
      const routeTitle = route.name || "Próxima ruta";
      const titleLines = wrapText(ctx, routeTitle, 610).slice(0, 2);
      titleLines.forEach((line, index) => ctx.fillText(line, 64, 355 + index * 74));

      ctx.fillStyle = red;
      ctx.font = "900 78px Arial";
      const date = new Date(`${route.route_date}T12:00:00`);
      const shortDate = new Intl.DateTimeFormat("es-US", { day: "numeric", month: "long" }).format(date);
      ctx.fillText(shortDate.replace(/^./, (letter) => letter.toUpperCase()), 64, 515);

      ctx.fillStyle = "#e5efff";
      ctx.font = "600 27px Arial";
      const summary = route.public_summary || "Estaremos recogiendo paquetes en las siguientes ciudades y zonas aledañas.";
      wrapText(ctx, summary, 560).slice(0, 3).forEach((line, index) => ctx.fillText(line, 66, 585 + index * 38));

      roundedRect(ctx, 682, 212, 336, 330, 28, "rgba(255,255,255,.96)");
      ctx.fillStyle = navy;
      ctx.font = "900 26px Arial";
      ctx.fillText("●  CIUDADES DE LA RUTA", 715, 258);

      const listCities = cities.slice(0, 5);
      listCities.forEach((city, index) => {
        const y = 315 + index * 46;
        ctx.fillStyle = index === 0 ? red : navy;
        ctx.beginPath();
        ctx.arc(722, y - 8, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "900 17px Arial";
        ctx.textAlign = "center";
        ctx.fillText(String(index + 1), 722, y - 2);
        ctx.textAlign = "left";
        ctx.fillStyle = navy;
        ctx.font = "800 23px Arial";
        ctx.fillText(city, 755, y);
      });
      if (cities.length > 5) {
        ctx.fillStyle = blue;
        ctx.font = "800 19px Arial";
        ctx.fillText(`+ ${cities.length - 5} ciudades adicionales`, 715, 510);
      }

      const mapCities = cities.length > 0 ? cities.slice(0, 8) : ["Ciudad inicial", "Destino"];
      const points = routePoints(mapCities.length);
      ctx.save();
      ctx.strokeStyle = red;
      ctx.lineWidth = 10;
      ctx.setLineDash([22, 18]);
      ctx.lineCap = "round";
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else {
          const previous = points[index - 1];
          const midX = (previous.x + point.x) / 2;
          ctx.bezierCurveTo(midX, previous.y, midX, point.y, point.x, point.y);
        }
      });
      ctx.stroke();
      ctx.restore();

      points.forEach((point, index) => {
        const isFirst = index === 0;
        drawPin(ctx, point.x, point.y, isFirst ? red : navy, cyan);
        roundedRect(ctx, point.x - 70, point.y + 52, 140, 34, 17, isFirst ? red : "rgba(7,29,67,.92)");
        ctx.fillStyle = "white";
        ctx.font = "800 17px Arial";
        ctx.textAlign = "center";
        const label = mapCities[index].length > 14 ? `${mapCities[index].slice(0, 13)}…` : mapCities[index];
        ctx.fillText(label, point.x, point.y + 75);
        ctx.textAlign = "left";
      });

      if (points.length >= 2) {
        const midIndex = Math.floor((points.length - 1) / 2);
        const a = points[midIndex];
        const b = points[Math.min(points.length - 1, midIndex + 1)];
        drawVan(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2 - 12, Math.atan2(b.y - a.y, b.x - a.x));
      }

      roundedRect(ctx, 40, 1190, 1000, 116, 28, "rgba(3,21,47,.92)", "rgba(255,255,255,.14)");
      ctx.fillStyle = "white";
      ctx.font = "900 26px Arial";
      ctx.fillText("▣  PROGRAMA TU RECOGIDA", 78, 1240);
      ctx.fillStyle = "#c8ddff";
      ctx.font = "600 19px Arial";
      ctx.fillText("Reserva ahora y te confirmamos la hora", 78, 1275);

      ctx.fillStyle = red;
      ctx.fillRect(555, 1190, 485, 116);
      ctx.fillStyle = "white";
      ctx.font = "900 25px Arial";
      ctx.fillText("◉  ATENCIÓN POR WHATSAPP", 600, 1240);
      ctx.font = "700 19px Arial";
      ctx.fillText(phone || "Rápida y personalizada", 600, 1276);

      setReady(true);
    } finally {
      setGenerating(false);
    }
  }

  function downloadPoster() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    const safeName = (route.name || "ruta").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    link.download = `${safeName || "ruta"}-${route.route_date}.png`;
    link.href = canvas.toDataURL("image/png", 1);
    link.click();
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-red-600"><Sparkles size={15} /> Contenido automático</p>
          <h2 className="mt-2 text-2xl font-black">Publicación de la ruta</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Genera una imagen profesional lista para Instagram, Facebook o WhatsApp.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={generatePoster} disabled={generating} className="inline-flex items-center gap-2 rounded-2xl bg-[#071d43] px-4 py-3 font-black text-white disabled:opacity-60">
            {generating ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />} {ready ? "Regenerar" : "Generar imagen"}
          </button>
          <button type="button" onClick={downloadPoster} disabled={!ready} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 font-black text-slate-800 disabled:opacity-40">
            <Download size={18} /> Descargar PNG
          </button>
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
        <canvas ref={canvasRef} className="block h-auto w-full" aria-label="Vista previa de la publicación de la ruta" />
        {!ready && <div className="flex min-h-56 items-center justify-center px-6 text-center font-bold text-slate-400">Pulsa “Generar imagen” para crear la publicación con los datos actuales de la ruta.</div>}
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500">La imagen se genera localmente en el navegador. No utiliza inteligencia artificial, GPS ni servicios externos.</p>
    </section>
  );
}
