/* =========================================================
   FLAG ICON
   ---------------------------------------------------------
   Banderas dibujadas en SVG puro (no imágenes externas, no
   emoji). Esto es a propósito: los emoji de bandera no se ven
   en Windows/Chrome, y las imágenes vía CDN externo se pueden
   quedar en blanco por bloqueadores, red lenta o extensiones
   del navegador. Un SVG inline siempre se renderiza, sin
   depender de nada externo.

   Si se necesita un país que todavía no está dibujado acá
   abajo, cae al respaldo de cuadrito con iniciales.
========================================================= */

type FlagIconProps = {
  countryCode: string; // ISO 3166-1 alpha-2, minúsculas (ej. "us", "es", "mx")
  className?: string;
  size?: number; // ancho en px, alto se ajusta proporcional (~0.71)
};

const VIEWBOX_W = 28;
const VIEWBOX_H = 20;

function FlagSvg({ countryCode, children }: { countryCode: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      role="img"
      aria-label={`Bandera de ${countryCode.toUpperCase()}`}
      className="block h-full w-full overflow-hidden rounded-[2px]"
    >
      {children}
    </svg>
  );
}

function FlagUS() {
  return (
    <FlagSvg countryCode="us">
      <rect width="28" height="20" fill="#B22234" />
      <rect y="1.54" width="28" height="1.54" fill="#fff" />
      <rect y="4.62" width="28" height="1.54" fill="#fff" />
      <rect y="7.69" width="28" height="1.54" fill="#fff" />
      <rect y="10.77" width="28" height="1.54" fill="#fff" />
      <rect y="13.85" width="28" height="1.54" fill="#fff" />
      <rect y="16.92" width="28" height="1.54" fill="#fff" />
      <rect width="11.2" height="10.77" fill="#3C3B6E" />
    </FlagSvg>
  );
}

function FlagES() {
  return (
    <FlagSvg countryCode="es">
      <rect width="28" height="20" fill="#AA151B" />
      <rect y="5" width="28" height="10" fill="#F1BF00" />
    </FlagSvg>
  );
}

function FlagMX() {
  return (
    <FlagSvg countryCode="mx">
      <rect width="28" height="20" fill="#fff" />
      <rect width="9.33" height="20" fill="#006847" />
      <rect x="18.67" width="9.33" height="20" fill="#CE1126" />
    </FlagSvg>
  );
}

function FlagBR() {
  return (
    <FlagSvg countryCode="br">
      <rect width="28" height="20" fill="#009739" />
      <polygon points="14,2 26,10 14,18 2,10" fill="#FEDD00" />
      <circle cx="14" cy="10" r="5" fill="#012169" />
    </FlagSvg>
  );
}

function FlagCA() {
  return (
    <FlagSvg countryCode="ca">
      <rect width="28" height="20" fill="#fff" />
      <rect width="7" height="20" fill="#FF0000" />
      <rect x="21" width="7" height="20" fill="#FF0000" />
      <polygon
        points="14,4 15,8 18,7 16.3,10 19,12 15.5,12 14,16 12.5,12 9,12 11.7,10 10,7 13,8"
        fill="#FF0000"
      />
    </FlagSvg>
  );
}

const FLAG_COMPONENTS: Record<string, () => React.ReactElement> = {
  us: FlagUS,
  es: FlagES,
  mx: FlagMX,
  br: FlagBR,
  ca: FlagCA,
};

export default function FlagIcon({ countryCode, className, size = 20 }: FlagIconProps) {
  const code = countryCode.toLowerCase();
  const height = Math.round(size * (VIEWBOX_H / VIEWBOX_W));
  const FlagComponent = FLAG_COMPONENTS[code];

  const wrapperClassName = className ?? "inline-block shadow-sm";

  if (!FlagComponent) {
    return (
      <span
        className={`${wrapperClassName} flex items-center justify-center rounded-[2px] bg-slate-200 font-black text-slate-500`}
        style={{ width: size, height, fontSize: Math.max(8, size * 0.45) }}
      >
        {code.toUpperCase()}
      </span>
    );
  }

  return (
    <span className={wrapperClassName} style={{ width: size, height }}>
      <FlagComponent />
    </span>
  );
}
