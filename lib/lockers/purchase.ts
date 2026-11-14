export type Purchase = {
  id: string;
  merchant: string;
  contents: string;
  tracking: string | null;
  tracking_url: string | null;
  declared_value: number;
  created_at: string;
  completed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  external_tracking: string | null;
  external_url: string | null;
  invoice_url: string | null;
  events: { at: string; action: string }[];
};

export function purchaseStatus(purchase: Purchase, boxes: number) {
  if (purchase.delivered_at) return "Entregada";
  if (purchase.dispatched_at) return "En tránsito";
  if (purchase.completed_at) return "Recibida en almacén";
  if (boxes) return "Recibida parcialmente";
  return "Prealerta enviada";
}

export function purchaseDate(value: string) {
  return new Date(value).toLocaleDateString("es-US", { timeZone: "America/New_York" });
}
