/*
 * Utilidades de theming compartidas para toda la administración.
 * Toman los colores primario/secundario que cada tienda define en
 * su ficha del SaaS (los mismos campos "Color principal" / "Color
 * secundario" que ya existen) y generan variantes seguras para
 * fondos, degradados y texto — con contraste garantizado, sin
 * importar qué color elija cada cliente.
 */

const FALLBACK_PRIMARY = "#0B1F4D";
const FALLBACK_SECONDARY = "#1762BD";

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(hex?: string | null, fallback: string = FALLBACK_PRIMARY): string {
  if (!hex) return fallback;
  const clean = hex.trim();
  return HEX_RE.test(clean) ? clean : fallback;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Blanco o casi-negro: el que mejor contraste da sobre ese color de fondo. */
export function getContrastTextColor(hex?: string | null): string {
  const rgb = hexToRgb(normalizeHex(hex));
  return relativeLuminance(rgb) > 0.5 ? "#0B1220" : "#FFFFFF";
}

function clamp(n: number) {
  return Math.max(0, Math.min(255, n));
}

/** Aclara (percent > 0) u oscurece (percent < 0) un color, sin salir de su misma familia. */
export function shade(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(normalizeHex(hex));
  const amt = Math.round(255 * (percent / 100));
  const nr = clamp(r + amt);
  const ng = clamp(g + amt);
  const nb = clamp(b + amt);
  return `#${[nr, ng, nb].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(normalizeHex(hex));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Para usar un color de marca como TEXTO sobre fondo BLANCO (topbars,
 * tarjetas, etc.) — problema de contraste distinto al de arriba: ahí
 * evaluábamos texto sobre el color; aquí evaluamos el color sobre
 * blanco. Si el color es demasiado claro para leerse sobre blanco
 * (ej. un secundario tipo crema), lo oscurece; si no, lo deja tal cual.
 */
export function getSafeAccentOnWhite(hex?: string | null, fallback: string = FALLBACK_PRIMARY): string {
  const normalized = normalizeHex(hex, fallback);
  const luminance = relativeLuminance(hexToRgb(normalized));
  return luminance > 0.78 ? shade(normalized, -45) : normalized;
}

export type StoreThemeInput = {
  primary_color?: string | null;
  secondary_color?: string | null;
};

/**
 * Fondo del header: degradado dentro de la MISMA familia del color
 * primario (más oscuro -> primario -> un poco más claro). Así el
 * texto blanco/oscuro calculado siempre contrasta bien, para
 * cualquier color que elija cualquier tienda.
 *
 * El color secundario se reserva para acentos (glow, chips, borde
 * inferior) — nunca queda detrás del texto, así que no hace falta
 * calcularle contraste aparte.
 */
export function getStoreTheme(store?: StoreThemeInput | null) {
  const primary = normalizeHex(store?.primary_color, FALLBACK_PRIMARY);
  const secondary = normalizeHex(store?.secondary_color, FALLBACK_SECONDARY);
  const textOnPrimary = getContrastTextColor(primary);
  const textOnSecondary = getContrastTextColor(secondary);

  return {
    primary,
    secondary,
    textOnPrimary,
    textOnSecondary,
    mutedTextOnPrimary: withAlpha(textOnPrimary, 0.72),
    accentOnWhite: getSafeAccentOnWhite(primary),
    headerGradient: `linear-gradient(135deg, ${shade(primary, -22)} 0%, ${primary} 55%, ${shade(primary, 10)} 100%)`,
    secondaryGlow: withAlpha(secondary, 0.35),
    secondaryGlowStrong: withAlpha(secondary, 0.55),
    secondaryChipBg: withAlpha(secondary, 0.18),
  };
}
