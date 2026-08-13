/* =========================================================
   ZELLE ICON
   ---------------------------------------------------------
   lucide-react no trae el logo de Zelle. En vez de usar el
   logo oficial (tema de marca registrada), se dibuja una "Z"
   limpia con las puntas en flecha — evoca el estilo del
   ícono real sin reproducirlo, y junto al texto "Zelle" al
   lado queda clara igual.
========================================================= */

export default function ZelleIcon({ size = 19, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M7 7.5H16.2C16.6 7.5 16.85 7.95 16.6 8.28L7.4 16.72C7.15 17.05 7.4 17.5 7.8 17.5H17"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5.5 10.3V7.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M9.6 7.5H5.7" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M18.5 13.7V16.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M14.4 16.5H18.3" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  );
}
