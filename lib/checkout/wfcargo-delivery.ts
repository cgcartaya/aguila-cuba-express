import { HAVANA_MUNICIPALITIES } from "./cuba-provinces";

const provincialDelivery: Record<string, { municipality: string; fee: number }> = {
  "Pinar del Río": { municipality: "Pinar del Río", fee: 5 },
  "Santiago de Cuba": { municipality: "Santiago de Cuba", fee: 5 },
  "Holguín": { municipality: "Holguín", fee: 5 },
  Granma: { municipality: "Bayamo", fee: 5 },
  "Guantánamo": { municipality: "Guantánamo", fee: 5 },
  "Las Tunas": { municipality: "Las Tunas", fee: 5 },
  Matanzas: { municipality: "Matanzas", fee: 5 },
  Cienfuegos: { municipality: "Cienfuegos", fee: 5 },
};

export function getWfCargoComboMunicipalities(province: string): readonly string[] {
  if (province === "La Habana") return HAVANA_MUNICIPALITIES;
  const coverage = provincialDelivery[province];
  return coverage ? [coverage.municipality] : [];
}

export function getWfCargoComboDeliveryFee(
  items: readonly { delivery_included?: boolean | null }[],
  province: string,
) {
  if (!items.some((item) => item.delivery_included !== true)) return 0;
  return province === "La Habana" ? 3 : provincialDelivery[province]?.fee ?? 0;
}
