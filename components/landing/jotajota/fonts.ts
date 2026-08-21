import { Anton, Caveat, Plus_Jakarta_Sans } from "next/font/google";

/**
 * Display condensada y muy sólida — hace eco del lettering grueso y
 * plano del logo (el "JOTA / JOTA" apilado y cortado en diagonal).
 * Se usa SOLO en titulares, nunca en texto largo.
 */
export const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-jj-display",
  display: "swap",
});

/**
 * Cuerpo de texto: geométrica, limpia, con buen rango de pesos para
 * párrafos, botones y microcopy.
 */
export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jj-body",
  display: "swap",
});

/**
 * Trazo manuscrito tipo "tiza/rotulador de pizzería" — se usa muy
 * puntual, para notas cortas (ej. "hecho a mano", precios de pizarra).
 */
export const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-jj-note",
  display: "swap",
});
