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

export default function RouteSocialPoster({ route, storeName = "YOYO ENVÍOS", phone, logoUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);
  const cities = useMemo(() => uniqueCities(route), [route]);

  async function generatePoster() {
    setGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const navy = "#071d43";
    const red = "#e11d2e";
    const pale = "#f7f9fc";
    const gold = "#f2bd45";

    ctx.fillStyle = pale;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, 1080, 750);
    gradient.addColorStop(0, "#051a3d");
    gradient.addColorStop(0.65, "#0b3971");
    gradient.addColorStop(1, "#0d5ca2");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 760);

    ctx.fillStyle = "rgba(255,255,255,.055)";
    for (let x = 0; x <= 1080; x += 54) ctx.fillRect(x, 0, 1, 760);
    for (let y = 0; y <= 760; y += 54) ctx.fillRect(0, y, 1080, 1);

    ctx.fillStyle = red;
    ctx.fillRect(0, 0, 18, 1350);

    let logo: HTMLImageElement | null = null;
    try {
      logo = await loadImage(logoUrl || "/yoyo/logo-yoyo.jpg");
    } catch {
      logo = null;
    }

    if (logo) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(68, 62, 150, 100, 22);
      ctx.clip();
      ctx.fillStyle = "white";
      ctx.fillRect(68, 62, 150, 100);
      ctx.drawImage(logo, 68, 62, 150, 100);
      ctx.restore();
    }

    ctx.fillStyle = "white";
    ctx.font = "900 42px Arial";
    ctx.fillText(storeName.toUpperCase(), logo ? 250 : 68, 112);
    ctx.font = "700 19px Arial";
    ctx.fillStyle = "#b9d6ff";
    ctx.fillText("RECOGIDA A DOMICILIO · RUTA PROGRAMADA", logo ? 252 : 70, 148);

    ctx.fillStyle = gold;
    ctx.font = "900 24px Arial";
    ctx.fillText(formatRouteDate(route.route_date).toUpperCase(), 70, 238);

    ctx.fillStyle = "white";
    ctx.font = "900 78px Arial";
    const titleLines = wrapText(ctx, route.name || "Próxima ruta", 900).slice(0, 2);
    titleLines.forEach((line, index) => ctx.fillText(line, 68, 335 + index * 88));

    ctx.fillStyle = "#d8e7ff";
    ctx.font = "600 27px Arial";
    const summary = route.public_summary || "Estaremos recogiendo paquetes en las siguientes ciudades y zonas aledañas.";
    wrapText(ctx, summary, 900).slice(0, 3).forEach((line, index) => ctx.fillText(line, 70, 535 + index * 39));

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.roundRect(58, 690, 964, 520, 34);
    ctx.fill();

    ctx.fillStyle = navy;
    ctx.font = "900 32px Arial";
    ctx.fillText("CIUDADES DE LA RUTA", 95, 770);

    const displayedCities = cities.slice(0, 12);
    displayedCities.forEach((city, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 95 + column * 455;
      const y = 835 + row * 58;
      ctx.fillStyle = index % 3 === 0 ? red : navy;
      ctx.beginPath();
      ctx.arc(x + 12, y - 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = navy;
      ctx.font = "800 25px Arial";
      ctx.fillText(city, x + 38, y);
    });

    if (cities.length > displayedCities.length) {
      ctx.fillStyle = "#64748b";
      ctx.font = "700 22px Arial";
      ctx.fillText(`+ ${cities.length - displayedCities.length} ciudades adicionales`, 95, 1180);
    }

    ctx.fillStyle = navy;
    ctx.beginPath();
    ctx.roundRect(58, 1230, 964, 78, 24);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "800 25px Arial";
    ctx.fillText("PROGRAMA TU RECOGIDA", 92, 1280);
    ctx.fillStyle = gold;
    ctx.font = "900 26px Arial";
    ctx.textAlign = "right";
    ctx.fillText(phone || "Atención por WhatsApp", 987, 1280);
    ctx.textAlign = "left";

    setReady(true);
    setGenerating(false);
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
          <p className="mt-1 text-sm font-semibold text-slate-500">Genera una imagen vertical lista para historias, Instagram o WhatsApp.</p>
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
        {!ready && <div className="flex min-h-56 items-center justify-center px-6 text-center font-bold text-slate-400">La vista previa aparecerá aquí.</div>}
      </div>
    </section>
  );
}
