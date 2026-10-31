export const ALVAREZ_STORE_ID = "211dd255-7168-4045-a278-afc4164a3172";
export const ALVAREZ_DEPARTURES = "Dos salidas por semana. Los tiempos de entrega se cuentan a partir de la salida del envío.";

export function alvarezShippingPolicy(serviceCode = "", provinceName = "") {
  const express = serviceCode.toUpperCase() === "EXPRESS";
  const havana = provinceName.trim().toLowerCase() === "la habana";
  const minimumWeight = express && havana ? 5 : 10;
  const minDays = express ? havana ? 1 : 5 : 7;
  const maxDays = express ? havana ? 2 : 6 : 12;
  const deliveryLabel = express && havana ? "24–48 horas" : `${minDays}–${maxDays} días`;
  return { minimumWeight, minDays, maxDays, deliveryLabel };
}
