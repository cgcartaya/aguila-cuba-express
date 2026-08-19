/* =========================================================
   FORMA DEL LIENZO POR ESPACIO

   En vez de dejar que cada espacio tenga ancho/alto libres (fácil
   de terminar con un lienzo rarísimo), se elige entre un puñado de
   proporciones predefinidas. "panoramic" (16:10) es el valor por
   defecto y es exactamente la proporción que ya se usaba antes de
   que esto existiera — así ningún espacio ya configurado se mueve
   o se distorsiona al agregar esta columna.
========================================================= */

export type CanvasShape =
  | "panoramic"
  | "square"
  | "wide"
  | "ultra_wide"
  | "vertical";

export const CANVAS_SHAPE_OPTIONS: CanvasShape[] = [
  "panoramic",
  "square",
  "wide",
  "ultra_wide",
  "vertical",
];

export const CANVAS_SHAPE_RATIO: Record<
  CanvasShape,
  { width: number; height: number }
> = {
  panoramic: { width: 16, height: 10 },
  square: { width: 10, height: 10 },
  wide: { width: 20, height: 10 },
  ultra_wide: { width: 30, height: 10 },
  vertical: { width: 10, height: 16 },
};

export const CANVAS_SHAPE_LABEL: Record<CanvasShape, string> = {
  panoramic: "Panorámico (16:10) — el de siempre",
  square: "Cuadrado (1:1)",
  wide: "Alargado (2:1)",
  ultra_wide: "Muy alargado (3:1)",
  vertical: "Vertical (10:16)",
};

export function canvasAspectRatioCss(
  shape: CanvasShape | null | undefined
): string {
  const ratio = CANVAS_SHAPE_RATIO[shape || "panoramic"] || CANVAS_SHAPE_RATIO.panoramic;
  return `${ratio.width} / ${ratio.height}`;
}

// Dimensiones base (en px, antes del zoom) para el lienzo del editor
// admin. Mantienen aproximadamente la misma ÁREA que el lienzo
// panorámico original (860×650), así las mesas se ven de un tamaño
// razonable sin importar qué forma se elija — un lienzo cuadrado no
// se ve ni gigante ni diminuto comparado con uno panorámico.
const BASE_AREA = 860 * 650;

export function canvasBaseDimensions(shape: CanvasShape | null | undefined): {
  width: number;
  height: number;
} {
  const ratio = CANVAS_SHAPE_RATIO[shape || "panoramic"] || CANVAS_SHAPE_RATIO.panoramic;
  const aspect = ratio.width / ratio.height;

  const height = Math.round(Math.sqrt(BASE_AREA / aspect));
  const width = Math.round(height * aspect);

  return { width, height };
}
