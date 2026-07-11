export type TrackingStatus =
  | "received_miami"
  | "preparing"
  | "in_transit"
  | "received_cuba"
  | "out_for_delivery"
  | "delivered"
  | "issue";

export interface PublicTrackingEvent {
  status: TrackingStatus;
  title: string;
  description: string | null;
  eventDate: string;
}

export interface PublicTrackingResult {
  trackingCode: string;
  location: string;
  status: TrackingStatus;
  statusLabel: string;
  createdDate: string | null;
  deliveredDate: string | null;
  updatedAt: string | null;
  recipientDisplay: string;
  events: PublicTrackingEvent[];
}

export const TRACKING_STATUS_LABELS: Record<TrackingStatus, string> = {
  received_miami: "Recibido en Miami",
  preparing: "Preparando salida",
  in_transit: "En tránsito hacia Cuba",
  received_cuba: "Recibido en Cuba",
  out_for_delivery: "En reparto",
  delivered: "Entregado",
  issue: "Incidencia",
};
