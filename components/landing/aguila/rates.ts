/** Published Águila rates in USD per pound. Maritime transit time is not specified. */
export const AGUILA_RATES = [
  {
    id: "maritimo",
    title: "Marítimo",
    rate: 2.99,
    coverage: "A todo el país",
    detail: "Entrega puerta a puerta",
    timing: null,
  },
  {
    id: "cienfuegos",
    title: "Express · Cienfuegos",
    rate: 6,
    coverage: "Entrega a domicilio",
    detail: "Por avión a Cienfuegos",
    timing: "24–48 horas",
  },
  {
    id: "provincias",
    title: "Express · demás provincias",
    rate: 5,
    coverage: "Incluye Isla de la Juventud",
    detail: "Por avión a las demás provincias",
    timing: "7–12 días",
  },
] as const;
