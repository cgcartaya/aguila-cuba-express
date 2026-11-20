import { HAVANA_MUNICIPALITIES } from "./cuba-provinces";

const provincialDelivery: Record<string, { municipality: string; fee: number }> = {
  "Pinar del Río": { municipality: "Pinar del Río", fee: 5 },
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
