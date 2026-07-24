"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  ImageIcon,
  Instagram,
  LayoutTemplate,
  Loader2,
  MessageCircle,
  MonitorUp,
  Palette,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { PickupRoute } from "@/lib/pickups/types";

type Props = {
  route: PickupRoute;
  storeName?: string;
  phone?: string | null;
  logoUrl?: string | null;
};

type PosterFormat = "feed" | "story" | "whatsapp" | "banner";
type PosterStyle = "modern" | "corporate" | "minimal";
type Point = { x: number; y: number };

type FormatDefinition = {
  label: string;
  description: string;
  width: number;
  height: number;
  icon: React.ReactNode;
};

type PaletteDefinition = {
  backgroundA: string;
  backgroundB: string;
  navy: string;
  red: string;
  blue: string;
  cyan: string;
  pale: string;
  softText: string;
  panel: string;
  panelBorder: string;
};

const FORMATS: Record<PosterFormat, FormatDefinition> = {
  feed: {
    label: "Feed",
    description: "Instagram / Facebook · 1080×1350",
    width: 1080,
    height: 1350,
    icon: <Instagram size={17} />,
  },
  story: {
    label: "Story",
    description: "Historia vertical · 1080×1920",
    width: 1080,
    height: 1920,
    icon: <MonitorUp size={17} />,
  },
  whatsapp: {
    label: "WhatsApp",
    description: "Horizontal · 1200×628",
    width: 1200,
    height: 628,
    icon: <MessageCircle size={17} />,
  },
  banner: {
    label: "Banner web",
    description: "Portada horizontal · 1600×700",
    width: 1600,
    height: 700,
    icon: <LayoutTemplate size={17} />,
  },
};

const PALETTES: Record<PosterStyle, PaletteDefinition> = {
  modern: {
    backgroundA: "#03152f",
    backgroundB: "#0c5ca6",
    navy: "#071d43",
    red: "#cf1020",
    blue: "#0b4f93",
    cyan: "#38bdf8",
    pale: "#f8fafc",
    softText: "#c8ddff",
    panel: "rgba(255,255,255,.96)",
    panelBorder: "rgba(255,255,255,.14)",
  },
  corporate: {
    backgroundA: "#06152e",
    backgroundB: "#16385f",
    navy: "#071d43",
    red: "#bb1424",
    blue: "#1e4f7e",
    cyan: "#77bff8",
    pale: "#f8fafc",
    softText: "#d5e4f5",
    panel: "rgba(255,255,255,.97)",
    panelBorder: "rgba(255,255,255,.16)",
  },
  minimal: {
    backgroundA: "#f8fafc",
    backgroundB: "#dbeafe",
    navy: "#071d43",
    red: "#c90f1e",
    blue: "#1d4e89",
    cyan: "#60a5fa",
    pale: "#ffffff",
    softText: "#475569",
    panel: "rgba(255,255,255,.98)",
    panelBorder: "rgba(7,29,67,.10)",
  },
};

function formatRouteDate(value: string) {
  return new Intl.DateTimeFormat("es-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

function shortRouteDate(value: string) {
  return new Intl.DateTimeFormat("es-US", {
    day: "numeric",
    month: "long",
  })
    .format(new Date(`${value}T12:00:00`))
    .replace(/^./, (letter) => letter.toUpperCase());
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

function cleanPhone(value?: string | null) {
  return (value || "").replace(/\s+/g, " ").trim();
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

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  weight = 900,
  family = "Arial"
) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size > 18);
  return size;
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
  stroke?: string,
  lineWidth = 1
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  ctx.restore();
}

function drawSoftGrid(ctx: CanvasRenderingContext2D, width: number, height: number, dark: boolean) {
  ctx.save();
  ctx.strokeStyle = dark ? "rgba(255,255,255,.045)" : "rgba(7,29,67,.045)";
  ctx.lineWidth = 1;
  const spacing = Math.max(52, Math.round(width / 20));
  for (let x = 0; x <= width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMapTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 36);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const roads = [
    [[-0.05, 0.18], [0.18, 0.3], [0.39, 0.2], [0.62, 0.32], [1.05, 0.16]],
    [[-0.05, 0.7], [0.2, 0.61], [0.39, 0.77], [0.66, 0.61], [1.05, 0.73]],
    [[0.12, -0.05], [0.2, 0.42], [0.16, 1.05]],
    [[0.49, -0.05], [0.53, 0.42], [0.48, 1.05]],
    [[0.82, -0.05], [0.75, 0.48], [0.83, 1.05]],
  ];
  roads.forEach((road) => {
    ctx.beginPath();
    road.forEach(([rx, ry], index) => {
      const px = x + rx * width;
      const py = y + ry * height;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  });
  ctx.restore();
}

function drawPin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fill: string,
  ring: string,
  kind: "start" | "stop" | "finish"
) {
  ctx.save();
  ctx.shadowColor = ring;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = ring;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y + 31, 31, 11, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (kind === "finish") {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = fill;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y - 8, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = fill;
    const cell = 10;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        if ((row + col) % 2 === 0) ctx.fillRect(x - 20 + col * cell, y - 28 + row * cell, cell, cell);
      }
    }
    ctx.restore();
    return;
  }

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y + 26);
  ctx.bezierCurveTo(x - 31, y - 6, x - 24, y - 43, x, y - 43);
  ctx.bezierCurveTo(x + 24, y - 43, x + 31, y - 6, x, y + 26);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y - 16, kind === "start" ? 10 : 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBrandedVan(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  scale: number,
  navy: string,
  red: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath();
  ctx.ellipse(0, 42, 112, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "rgba(0,0,0,.26)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;

  const bodyGradient = ctx.createLinearGradient(-95, -50, 95, 45);
  bodyGradient.addColorStop(0, "#ffffff");
  bodyGradient.addColorStop(0.55, "#eef2f7");
  bodyGradient.addColorStop(1, "#cbd5e1");

  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(-102, 17);
  ctx.lineTo(-88, -35);
  ctx.quadraticCurveTo(-80, -53, -55, -55);
  ctx.lineTo(51, -55);
  ctx.quadraticCurveTo(80, -52, 91, -28);
  ctx.lineTo(105, 11);
  ctx.quadraticCurveTo(110, 26, 92, 31);
  ctx.lineTo(-90, 31);
  ctx.quadraticCurveTo(-108, 28, -102, 17);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#0f2745";
  ctx.beginPath();
  ctx.moveTo(-72, -43);
  ctx.lineTo(-22, -45);
  ctx.lineTo(-13, -7);
  ctx.lineTo(-82, -7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#193b61";
  ctx.beginPath();
  ctx.moveTo(-13, -45);
  ctx.lineTo(15, -45);
  ctx.lineTo(18, -7);
  ctx.lineTo(-4, -7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#9aa9ba";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(26, -47);
  ctx.lineTo(31, 22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(68, -44);
  ctx.lineTo(73, 21);
  ctx.stroke();

  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.moveTo(31, -18);
  ctx.lineTo(49, -36);
  ctx.lineTo(55, -36);
  ctx.lineTo(38, -17);
  ctx.lineTo(55, 0);
  ctx.lineTo(49, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = navy;
  ctx.beginPath();
  ctx.moveTo(25, -18);
  ctx.lineTo(7, -36);
  ctx.lineTo(1, -36);
  ctx.lineTo(18, -17);
  ctx.lineTo(1, 0);
  ctx.lineTo(7, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = navy;
  ctx.font = "900 13px Arial";
  ctx.fillText("YOYO", 4, 15);
  ctx.fillStyle = red;
  ctx.fillText("ENVÍOS", 42, 15);

  ctx.fillStyle = "#101820";
  ctx.beginPath();
  ctx.arc(-63, 31, 19, 0, Math.PI * 2);
  ctx.arc(72, 31, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#94a3b8";
  ctx.beginPath();
  ctx.arc(-63, 31, 9, 0, Math.PI * 2);
  ctx.arc(72, 31, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#dce7f2";
  ctx.beginPath();
  ctx.arc(-63, 31, 4, 0, Math.PI * 2);
  ctx.arc(72, 31, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d8e1ea";
  ctx.fillRect(-103, 13, 13, 7);
  ctx.fillStyle = "#fff8dc";
  ctx.fillRect(-99, 1, 10, 8);
  ctx.restore();
}

function routePoints(count: number, x: number, y: number, width: number, height: number): Point[] {
  const total = Math.max(2, Math.min(count, 10));
  return Array.from({ length: total }, (_, index) => {
    const t = index / Math.max(1, total - 1);
    return {
      x: x + width * (0.08 + t * 0.84),
      y: y + height * (0.54 - Math.sin(t * Math.PI * 2.1) * 0.16 - Math.cos(t * Math.PI) * 0.05),
    };
  });
}

function drawRouteLine(ctx: CanvasRenderingContext2D, points: Point[], red: string) {
  ctx.save();
  ctx.shadowColor = "rgba(239,35,60,.48)";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "rgba(255,255,255,.68)";
  ctx.lineWidth = 18;
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
  ctx.shadowBlur = 0;
  ctx.strokeStyle = red;
  ctx.lineWidth = 10;
  ctx.setLineDash([22, 16]);
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
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  storeName: string,
  navy: string,
  red: string
) {
  roundedRect(ctx, x, y, size, size * 0.78, size * 0.16, "#ffffff", "rgba(7,29,67,.08)", 2);
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 7, y + 7, size - 14, size * 0.78 - 14, size * 0.12);
    ctx.clip();
    ctx.drawImage(logo, x + 7, y + 7, size - 14, size * 0.78 - 14);
    ctx.restore();
    return;
  }
  ctx.fillStyle = navy;
  ctx.font = `900 ${Math.round(size * 0.24)}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText(storeName.split(" ")[0]?.toUpperCase() || "YOYO", x + size / 2, y + size * 0.34);
  ctx.fillStyle = red;
  ctx.font = `900 ${Math.round(size * 0.17)}px Arial`;
  ctx.fillText("ENVÍOS", x + size / 2, y + size * 0.58);
  ctx.textAlign = "left";
}

function drawStatusPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  fill: string,
  color: string,
  fontSize: number
) {
  ctx.font = `900 ${fontSize}px Arial`;
  const width = ctx.measureText(text).width + 40;
  roundedRect(ctx, x, y, width, fontSize + 30, (fontSize + 30) / 2, fill);
  ctx.fillStyle = color;
  ctx.fillText(text, x + 20, y + fontSize + 7);
  return width;
}

function drawCityList(
  ctx: CanvasRenderingContext2D,
  cities: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  palette: PaletteDefinition,
  compact = false
) {
  roundedRect(ctx, x, y, width, height, 28, palette.panel, "rgba(7,29,67,.09)", 2);
  ctx.fillStyle = palette.navy;
  ctx.font = `900 ${compact ? 21 : 25}px Arial`;
  ctx.fillText("CIUDADES", x + 32, y + 48);
  ctx.fillStyle = palette.red;
  ctx.fillRect(x + 32, y + 60, 72, 5);

  const maxRows = compact ? 4 : Math.max(4, Math.min(7, Math.floor((height - 100) / 47)));
  const rows = cities.slice(0, maxRows);
  rows.forEach((city, index) => {
    const rowY = y + 102 + index * (compact ? 42 : 47);
    const isFirst = index === 0;
    const isLast = index === rows.length - 1 && cities.length <= maxRows;
    ctx.fillStyle = isFirst ? palette.red : isLast ? palette.blue : "#e8eef6";
    ctx.beginPath();
    ctx.arc(x + 43, rowY - 7, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isFirst || isLast ? "#ffffff" : palette.navy;
    ctx.font = `900 ${compact ? 14 : 16}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(String(index + 1), x + 43, rowY - 1);
    ctx.textAlign = "left";
    ctx.fillStyle = palette.navy;
    const labelSize = fitText(ctx, city, width - 98, compact ? 21 : 23, 800);
    ctx.font = `800 ${labelSize}px Arial`;
    ctx.fillText(city, x + 72, rowY);
  });

  if (cities.length > maxRows) {
    ctx.fillStyle = palette.blue;
    ctx.font = `800 ${compact ? 15 : 18}px Arial`;
    ctx.fillText(`+ ${cities.length - maxRows} ciudades adicionales`, x + 32, y + height - 28);
  }
}

function drawMetricCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  icon: string,
  value: string,
  label: string,
  palette: PaletteDefinition,
  dark: boolean
) {
  roundedRect(
    ctx,
    x,
    y,
    width,
    height,
    22,
    dark ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.82)",
    dark ? "rgba(255,255,255,.12)" : "rgba(7,29,67,.08)"
  );
  ctx.fillStyle = dark ? "#ffffff" : palette.navy;
  ctx.font = "900 24px Arial";
  ctx.fillText(icon, x + 22, y + 38);
  ctx.font = "900 25px Arial";
  ctx.fillText(value, x + 61, y + 39);
  ctx.fillStyle = dark ? palette.softText : "#64748b";
  ctx.font = "700 15px Arial";
  ctx.fillText(label.toUpperCase(), x + 22, y + height - 19);
}

export default function RouteSocialPoster({
  route,
  storeName = "YOYO ENVÍOS",
  phone,
  logoUrl,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [format, setFormat] = useState<PosterFormat>("feed");
  const [style, setStyle] = useState<PosterStyle>("modern");
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [showCities, setShowCities] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const cities = useMemo(() => uniqueCities(route), [route]);
  const fallbackCities = useMemo(
    () => [route.start_city, route.end_city].filter((city): city is string => Boolean(city)),
    [route.start_city, route.end_city]
  );
  const displayCities = cities.length ? cities : fallbackCities.length ? fallbackCities : ["Próxima parada", "Destino"];

  async function generatePoster(nextFormat = format, nextStyle = style) {
    setGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const definition = FORMATS[nextFormat];
      const palette = PALETTES[nextStyle];
      const { width, height } = definition;
      const isHorizontal = nextFormat === "whatsapp" || nextFormat === "banner";
      const isStory = nextFormat === "story";
      const isMinimal = nextStyle === "minimal";
      const dark = !isMinimal;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, palette.backgroundA);
      background.addColorStop(1, palette.backgroundB);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      drawSoftGrid(ctx, width, height, dark);

      if (!isMinimal) {
        const glow = ctx.createRadialGradient(width * 0.84, height * 0.1, 0, width * 0.84, height * 0.1, width * 0.6);
        glow.addColorStop(0, "rgba(56,189,248,.24)");
        glow.addColorStop(1, "rgba(56,189,248,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.fillStyle = palette.red;
      ctx.fillRect(0, 0, isHorizontal ? 14 : 18, height);

      let logo: HTMLImageElement | null = null;
      try {
        logo = await loadImage(logoUrl || "/yoyo/logo-yoyo.jpg");
      } catch {
        logo = null;
      }

      const routeTitle = (route.name || "Próxima ruta").trim();
      const summary =
        route.public_summary ||
        "Estaremos recogiendo paquetes en estas ciudades y zonas cercanas. Reserva tu espacio antes del cierre de la ruta.";
      const routeOpen = route.status === "published" || route.status === "draft";
      const statusLabel = routeOpen ? "RUTA ABIERTA" : route.status === "in_progress" ? "EN RECORRIDO" : "RUTA PROGRAMADA";
      const requestCount = route.stops?.length || 0;

      if (nextFormat === "feed") {
        drawLogo(ctx, logo, 58, 52, 150, storeName, palette.navy, palette.red);
        ctx.fillStyle = dark ? "#ffffff" : palette.navy;
        ctx.font = "900 41px Arial";
        ctx.fillText(storeName.toUpperCase(), 240, 102);
        ctx.fillStyle = dark ? palette.softText : "#52657a";
        ctx.font = "700 18px Arial";
        ctx.fillText("RECOGIDA A DOMICILIO · SERVICIO SEGURO", 242, 141);

        drawStatusPill(ctx, 58, 207, statusLabel, palette.red, "#ffffff", 19);
        ctx.fillStyle = dark ? "#ffffff" : palette.navy;
        const titleSize = fitText(ctx, routeTitle.toUpperCase(), 585, 70, 900);
        ctx.font = `900 ${titleSize}px Arial`;
        const titleLines = wrapText(ctx, routeTitle.toUpperCase(), 585).slice(0, 2);
        titleLines.forEach((line, index) => ctx.fillText(line, 58, 340 + index * (titleSize + 6)));

        ctx.fillStyle = palette.red;
        ctx.font = "900 65px Arial";
        ctx.fillText(shortRouteDate(route.route_date), 58, titleLines.length > 1 ? 507 : 430);

        if (showDescription) {
          ctx.fillStyle = dark ? "#e7f0ff" : "#475569";
          ctx.font = "650 24px Arial";
          wrapText(ctx, summary, 590)
            .slice(0, 3)
            .forEach((line, index) => ctx.fillText(line, 60, (titleLines.length > 1 ? 565 : 490) + index * 34));
        }

        if (showCities) drawCityList(ctx, displayCities, 678, 204, 344, 360, palette);

        const metricY = 610;
        drawMetricCard(ctx, 58, metricY, 206, 92, "🚚", routeOpen ? "Abierta" : "Lista", "Estado", palette, dark);
        drawMetricCard(ctx, 278, metricY, 206, 92, "📍", String(displayCities.length), "Ciudades", palette, dark);
        drawMetricCard(ctx, 498, metricY, 206, 92, "📦", String(requestCount), "Solicitudes", palette, dark);
        drawMetricCard(ctx, 718, metricY, 304, 92, "📅", formatRouteDate(route.route_date), "Fecha", palette, dark);

        if (showMap) {
          const mapX = 42;
          const mapY = 735;
          const mapW = 996;
          const mapH = 405;
          roundedRect(ctx, mapX, mapY, mapW, mapH, 34, dark ? "rgba(2,18,43,.54)" : "rgba(255,255,255,.66)", palette.panelBorder, 2);
          drawMapTexture(ctx, mapX, mapY, mapW, mapH, dark ? "rgba(96,165,250,.16)" : "rgba(7,29,67,.09)");
          const points = routePoints(displayCities.length, mapX + 34, mapY + 30, mapW - 68, mapH - 90);
          drawRouteLine(ctx, points, palette.red);
          points.forEach((point, index) => {
            const kind = index === 0 ? "start" : index === points.length - 1 ? "finish" : "stop";
            drawPin(ctx, point.x, point.y, kind === "start" ? palette.red : palette.navy, palette.cyan, kind);
            const label = displayCities[index] || `Parada ${index + 1}`;
            roundedRect(ctx, point.x - 67, point.y + 44, 134, 32, 16, kind === "start" ? palette.red : "rgba(7,29,67,.94)");
            ctx.fillStyle = "#ffffff";
            ctx.font = "800 15px Arial";
            ctx.textAlign = "center";
            ctx.fillText(label.length > 14 ? `${label.slice(0, 13)}…` : label, point.x, point.y + 66);
            ctx.textAlign = "left";
          });
          if (points.length >= 2) {
            const index = Math.max(0, Math.floor((points.length - 1) * 0.48));
            const a = points[index];
            const b = points[index + 1];
            drawBrandedVan(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2 - 17, Math.atan2(b.y - a.y, b.x - a.x), 0.78, palette.navy, palette.red);
          }
        }

        roundedRect(ctx, 42, 1174, 996, 132, 28, dark ? "rgba(2,18,43,.94)" : palette.navy);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 24px Arial";
        ctx.fillText("PROGRAMA TU RECOGIDA", 76, 1225);
        ctx.fillStyle = "#c8ddff";
        ctx.font = "650 18px Arial";
        ctx.fillText("Reserva ahora y te confirmamos el horario.", 76, 1260);
        if (showPhone) {
          roundedRect(ctx, 590, 1190, 420, 100, 24, palette.red);
          ctx.fillStyle = "#ffffff";
          ctx.font = "900 21px Arial";
          ctx.fillText("WHATSAPP", 625, 1230);
          ctx.font = "800 24px Arial";
          ctx.fillText(cleanPhone(phone) || "Atención personalizada", 625, 1266);
        }
      }

      if (nextFormat === "story") {
        drawLogo(ctx, logo, 62, 62, 166, storeName, palette.navy, palette.red);
        ctx.fillStyle = dark ? "#ffffff" : palette.navy;
        ctx.font = "900 44px Arial";
        ctx.fillText(storeName.toUpperCase(), 260, 112);
        ctx.fillStyle = dark ? palette.softText : "#52657a";
        ctx.font = "700 18px Arial";
        ctx.fillText("RUTAS DE RECOGIDA", 262, 151);

        drawStatusPill(ctx, 62, 236, statusLabel, palette.red, "#ffffff", 22);
        ctx.fillStyle = dark ? "#ffffff" : palette.navy;
        const titleSize = fitText(ctx, routeTitle.toUpperCase(), 950, 91, 900);
        ctx.font = `900 ${titleSize}px Arial`;
        const titleLines = wrapText(ctx, routeTitle.toUpperCase(), 950).slice(0, 2);
        titleLines.forEach((line, index) => ctx.fillText(line, 62, 390 + index * (titleSize + 10)));
        ctx.fillStyle = palette.red;
        ctx.font = "900 82px Arial";
        ctx.fillText(shortRouteDate(route.route_date), 62, titleLines.length > 1 ? 610 : 500);

        if (showDescription) {
          ctx.fillStyle = dark ? "#e7f0ff" : "#475569";
          ctx.font = "650 29px Arial";
          wrapText(ctx, summary, 940)
            .slice(0, 3)
            .forEach((line, index) => ctx.fillText(line, 64, (titleLines.length > 1 ? 685 : 580) + index * 42));
        }

        const metricY = titleLines.length > 1 ? 810 : 710;
        drawMetricCard(ctx, 62, metricY, 286, 105, "🚚", routeOpen ? "Abierta" : "Lista", "Estado", palette, dark);
        drawMetricCard(ctx, 365, metricY, 286, 105, "📍", String(displayCities.length), "Ciudades", palette, dark);
        drawMetricCard(ctx, 668, metricY, 350, 105, "📦", String(requestCount), "Solicitudes", palette, dark);

        if (showMap) {
          const mapY = metricY + 140;
          roundedRect(ctx, 38, mapY, 1004, 610, 36, dark ? "rgba(2,18,43,.54)" : "rgba(255,255,255,.72)", palette.panelBorder, 2);
          drawMapTexture(ctx, 38, mapY, 1004, 610, dark ? "rgba(96,165,250,.16)" : "rgba(7,29,67,.09)");
          const points = routePoints(displayCities.length, 70, mapY + 70, 940, 460);
          drawRouteLine(ctx, points, palette.red);
          points.forEach((point, index) => {
            const kind = index === 0 ? "start" : index === points.length - 1 ? "finish" : "stop";
            drawPin(ctx, point.x, point.y, kind === "start" ? palette.red : palette.navy, palette.cyan, kind);
            const label = displayCities[index] || `Parada ${index + 1}`;
            roundedRect(ctx, point.x - 74, point.y + 47, 148, 36, 18, kind === "start" ? palette.red : "rgba(7,29,67,.94)");
            ctx.fillStyle = "#ffffff";
            ctx.font = "800 16px Arial";
            ctx.textAlign = "center";
            ctx.fillText(label.length > 15 ? `${label.slice(0, 14)}…` : label, point.x, point.y + 71);
            ctx.textAlign = "left";
          });
          if (points.length >= 2) {
            const index = Math.max(0, Math.floor((points.length - 1) * 0.47));
            const a = points[index];
            const b = points[index + 1];
            drawBrandedVan(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2 - 25, Math.atan2(b.y - a.y, b.x - a.x), 1, palette.navy, palette.red);
          }
        }

        if (showCities) drawCityList(ctx, displayCities, 62, 1560, 956, 205, palette, true);
        roundedRect(ctx, 62, 1792, 956, 84, 26, palette.red);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 26px Arial";
        ctx.fillText("RESERVA TU RECOGIDA", 100, 1845);
        if (showPhone) {
          ctx.textAlign = "right";
          ctx.font = "900 28px Arial";
          ctx.fillText(cleanPhone(phone) || "ESCRÍBENOS POR WHATSAPP", 980, 1845);
          ctx.textAlign = "left";
        }
      }

      if (nextFormat === "whatsapp" || nextFormat === "banner") {
        const margin = nextFormat === "banner" ? 60 : 40;
        const logoSize = nextFormat === "banner" ? 150 : 115;
        drawLogo(ctx, logo, margin, margin, logoSize, storeName, palette.navy, palette.red);
        const left = margin + logoSize + 28;
        ctx.fillStyle = dark ? "#ffffff" : palette.navy;
        ctx.font = `900 ${nextFormat === "banner" ? 39 : 31}px Arial`;
        ctx.fillText(storeName.toUpperCase(), left, margin + 48);
        ctx.fillStyle = dark ? palette.softText : "#52657a";
        ctx.font = `700 ${nextFormat === "banner" ? 17 : 14}px Arial`;
        ctx.fillText("RECOGIDA A DOMICILIO · RUTA PROGRAMADA", left + 2, margin + 80);

        const contentX = margin;
        const contentY = nextFormat === "banner" ? 230 : 178;
        const leftWidth = nextFormat === "banner" ? 690 : 515;
        drawStatusPill(ctx, contentX, contentY, statusLabel, palette.red, "#ffffff", nextFormat === "banner" ? 19 : 16);
        ctx.fillStyle = dark ? "#ffffff" : palette.navy;
        const horizontalTitleSize = fitText(ctx, routeTitle.toUpperCase(), leftWidth, nextFormat === "banner" ? 62 : 44, 900);
        ctx.font = `900 ${horizontalTitleSize}px Arial`;
        const titleLines = wrapText(ctx, routeTitle.toUpperCase(), leftWidth).slice(0, 2);
        titleLines.forEach((line, index) => ctx.fillText(line, contentX, contentY + 100 + index * (horizontalTitleSize + 3)));
        ctx.fillStyle = palette.red;
        ctx.font = `900 ${nextFormat === "banner" ? 48 : 36}px Arial`;
        ctx.fillText(shortRouteDate(route.route_date), contentX, contentY + (titleLines.length > 1 ? 235 : 172));

        if (showDescription) {
          ctx.fillStyle = dark ? "#e7f0ff" : "#475569";
          ctx.font = `650 ${nextFormat === "banner" ? 21 : 16}px Arial`;
          wrapText(ctx, summary, leftWidth)
            .slice(0, nextFormat === "banner" ? 3 : 2)
            .forEach((line, index) => ctx.fillText(line, contentX, contentY + (titleLines.length > 1 ? 285 : 220) + index * (nextFormat === "banner" ? 31 : 24)));
        }

        const mapX = nextFormat === "banner" ? 815 : 610;
        const mapY = nextFormat === "banner" ? 46 : 35;
        const mapW = width - mapX - margin;
        const mapH = height - mapY - margin;
        roundedRect(ctx, mapX, mapY, mapW, mapH, 34, dark ? "rgba(2,18,43,.52)" : "rgba(255,255,255,.70)", palette.panelBorder, 2);
        drawMapTexture(ctx, mapX, mapY, mapW, mapH, dark ? "rgba(96,165,250,.17)" : "rgba(7,29,67,.09)");
        if (showMap) {
          const points = routePoints(displayCities.length, mapX + 28, mapY + 65, mapW - 56, mapH - 135);
          drawRouteLine(ctx, points, palette.red);
          points.forEach((point, index) => {
            const kind = index === 0 ? "start" : index === points.length - 1 ? "finish" : "stop";
            drawPin(ctx, point.x, point.y, kind === "start" ? palette.red : palette.navy, palette.cyan, kind);
          });
          if (points.length >= 2) {
            const index = Math.max(0, Math.floor((points.length - 1) * 0.5));
            const a = points[index];
            const b = points[index + 1];
            drawBrandedVan(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2 - 13, Math.atan2(b.y - a.y, b.x - a.x), nextFormat === "banner" ? 0.82 : 0.62, palette.navy, palette.red);
          }
        }

        if (showCities) {
          const cityText = displayCities.slice(0, nextFormat === "banner" ? 6 : 4).join("  ·  ");
          roundedRect(ctx, mapX + 24, mapY + mapH - 78, mapW - 48, 52, 18, "rgba(7,29,67,.92)");
          ctx.fillStyle = "#ffffff";
          ctx.font = `800 ${nextFormat === "banner" ? 17 : 14}px Arial`;
          ctx.textAlign = "center";
          ctx.fillText(cityText, mapX + mapW / 2, mapY + mapH - 45);
          ctx.textAlign = "left";
        }

        if (showPhone) {
          roundedRect(ctx, contentX, height - margin - 78, leftWidth, 78, 22, palette.red);
          ctx.fillStyle = "#ffffff";
          ctx.font = `900 ${nextFormat === "banner" ? 23 : 18}px Arial`;
          ctx.fillText("WHATSAPP", contentX + 28, height - margin - 33);
          ctx.textAlign = "right";
          ctx.font = `900 ${nextFormat === "banner" ? 27 : 22}px Arial`;
          ctx.fillText(cleanPhone(phone) || "RESERVA AHORA", contentX + leftWidth - 28, height - margin - 33);
          ctx.textAlign = "left";
        }
      }

      setReady(true);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    setReady(false);
  }, [route, format, style, showMap, showCities, showDescription, showPhone]);

  function downloadPoster() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    const safeName = (route.name || "ruta")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    link.download = `${safeName || "ruta"}-${format}-${route.route_date}.png`;
    link.href = canvas.toDataURL("image/png", 1);
    link.click();
  }

  const optionClass = (active: boolean) =>
    `flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-black transition ${
      active
        ? "border-[#071d43] bg-[#071d43] text-white shadow-sm"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
    }`;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-[#06172f] via-[#082d5e] to-[#0b5aa3] p-5 text-white sm:p-7">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-blue-200">
              <Sparkles size={15} /> Marketing Studio · V12
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Generador inteligente de publicaciones</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-blue-100/80">
              Convierte esta ruta en contenido listo para Instagram, Facebook, WhatsApp y la portada de la web.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void generatePoster()}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-black text-[#071d43] shadow-lg disabled:opacity-60"
            >
              {generating ? <Loader2 size={18} className="animate-spin" /> : ready ? <RefreshCw size={18} /> : <ImageIcon size={18} />}
              {ready ? "Regenerar" : "Generar publicación"}
            </button>
            <button
              type="button"
              onClick={downloadPoster}
              disabled={!ready}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 font-black text-white disabled:opacity-40"
            >
              <Download size={18} /> Descargar PNG
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50 p-5 xl:border-b-0 xl:border-r sm:p-6">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.15em] text-slate-400">
              <LayoutTemplate size={14} /> Formato
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {(Object.entries(FORMATS) as Array<[PosterFormat, FormatDefinition]>).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormat(key)}
                  className={`${optionClass(format === key)} justify-between text-left`}
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    <span>
                      <span className="block">{item.label}</span>
                      <span className={`block text-[11px] font-bold ${format === key ? "text-blue-100" : "text-slate-400"}`}>
                        {item.description}
                      </span>
                    </span>
                  </span>
                  {format === key && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.15em] text-slate-400">
              <Palette size={14} /> Estilo
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["modern", "corporate", "minimal"] as PosterStyle[]).map((key) => (
                <button key={key} type="button" onClick={() => setStyle(key)} className={optionClass(style === key)}>
                  {key === "modern" ? "Moderno" : key === "corporate" ? "Corporativo" : "Minimalista"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7">
            <p className="text-xs font-black uppercase tracking-[.15em] text-slate-400">Contenido visible</p>
            <div className="mt-3 space-y-2">
              <Toggle label="Mostrar mapa" checked={showMap} onChange={setShowMap} />
              <Toggle label="Mostrar ciudades" checked={showCities} onChange={setShowCities} />
              <Toggle label="Mostrar descripción" checked={showDescription} onChange={setShowDescription} />
              <Toggle label="Mostrar WhatsApp" checked={showPhone} onChange={setShowPhone} />
            </div>
          </div>

          <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-black">Datos automáticos</p>
            <p className="mt-1 font-semibold text-blue-700">
              {displayCities.length} ciudades · {route.stops?.length || 0} solicitudes · {formatRouteDate(route.route_date)}
            </p>
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[.15em] text-slate-400">Vista previa</p>
              <p className="mt-1 text-sm font-bold text-slate-600">
                {FORMATS[format].label} · {FORMATS[format].width}×{FORMATS[format].height}px
              </p>
            </div>
            {!ready && (
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                Hay cambios sin generar
              </span>
            )}
          </div>

          <div className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0px] p-3 sm:p-5">
            <canvas
              ref={canvasRef}
              className={`block h-auto max-h-[760px] max-w-full rounded-xl shadow-2xl ${ready ? "bg-white" : "hidden"}`}
              aria-label="Vista previa de la publicación de la ruta"
            />
            {!ready && (
              <div className="max-w-md px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Sparkles className="text-blue-700" size={28} />
                </div>
                <h3 className="mt-5 text-xl font-black text-slate-800">La publicación está lista para crearse</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Selecciona el formato y el estilo. Después pulsa “Generar publicación” para ver el resultado final.
                </p>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs font-semibold text-slate-500">
            La imagen se renderiza localmente en el navegador. No usa GPS, APIs de mapas ni servicios externos.
          </p>
        </div>
      </div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#071d43]"
      />
    </label>
  );
}
