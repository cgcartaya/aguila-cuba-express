/* =========================================================
   FLAG ICON
   ---------------------------------------------------------
   Windows + Chrome no dibuja las banderas emoji a color (se
   ven como "US", "ES" en una cajita). Para que se vea igual
   en todos los sistemas, usamos imágenes reales servidas por
   flagcdn.com (gratis, sin API key, por código ISO de país).
========================================================= */

type FlagIconProps = {
  countryCode: string; // ISO 3166-1 alpha-2, minúsculas (ej. "us", "es", "mx")
  className?: string;
  size?: number; // ancho en px, alto se ajusta proporcional (~0.75)
};

export default function FlagIcon({ countryCode, className, size = 20 }: FlagIconProps) {
  const code = countryCode.toLowerCase();
  const height = Math.round(size * 0.75);

  return (
    <img
      src={`https://flagcdn.com/${size * 2}x${height * 2}/${code}.png`}
      srcSet={`https://flagcdn.com/${size}x${height}/${code}.png 1x, https://flagcdn.com/${size * 2}x${height * 2}/${code}.png 2x`}
      width={size}
      height={height}
      alt=""
      aria-hidden="true"
      className={className ?? "inline-block rounded-[2px] object-cover shadow-sm"}
      style={{ width: size, height }}
      loading="lazy"
    />
  );
}
