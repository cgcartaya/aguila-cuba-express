import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  TRACKING_STATUS_LABELS,
  type TrackingStatus,
} from "@/lib/tracking/types";

const EVIDENCE_BUCKET = "delivery-photos";
const SIGNED_URL_SECONDS = 10 * 60;

type ShipmentRow = {
  id: string;
  tracking_code: string;
  location: string | null;
  recipient_name: string | null;
  status: string | null;
  created_date: string | null;
  delivered_date: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  public_tracking_enabled: boolean | null;
  delivery_photo_url: string | null;
};

type TrackingEventRow = {
  status: TrackingStatus;
  title: string;
  description: string | null;
  event_date: string;
};

function normalizeCode(value: string) {
  return decodeURIComponent(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function maskName(value: string | null) {
  const clean = value?.trim();
  if (!clean) return "Destinatario";

  const parts = clean.split(/\s+/);

  if (parts.length === 1) {
    return `${parts[0].charAt(0)}***`;
  }

  return `${parts[0]} ${parts.at(-1)?.charAt(0) ?? ""}.`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await context.params;
  const trackingCode = normalizeCode(codigo);

  if (!/^ACE-[A-Z0-9]{6,12}$/.test(trackingCode)) {
    return NextResponse.json(
      { error: "Código de rastreo inválido" },
      { status: 400 }
    );
  }

  const shipmentQuery = await supabaseAdmin
    .from("shipments")
    .select(
      [
        "id",
        "tracking_code",
        "location",
        "recipient_name",
        "status",
        "created_date",
        "delivered_date",
        "updated_at",
        "deleted_at",
        "public_tracking_enabled",
        "delivery_photo_url",
      ].join(",")
    )
    .ilike("tracking_code", trackingCode)
    .is("deleted_at", null)
    .eq("public_tracking_enabled", true)
    .maybeSingle();

  if (shipmentQuery.error) {
    console.error("Tracking shipment error", shipmentQuery.error);

    return NextResponse.json(
      { error: "No se pudo consultar el envío" },
      { status: 500 }
    );
  }

  /*
   * El cliente Supabase tipado del proyecto no conoce todavía las columnas
   * nuevas de rastreo y por eso TypeScript puede inferir GenericStringError.
   * Validamos el resultado en tiempo de ejecución y luego lo tratamos como
   * ShipmentRow para mantener el build seguro.
   */
  const shipment = shipmentQuery.data as unknown as ShipmentRow | null;

  if (!shipment) {
    return NextResponse.json(
      { error: "No encontramos un envío activo con ese código" },
      { status: 404 }
    );
  }

  const eventsQuery = await supabaseAdmin
    .from("shipment_tracking_events")
    .select("status, title, description, event_date")
    .eq("shipment_id", shipment.id)
    .order("event_date", { ascending: true });

  if (eventsQuery.error) {
    console.error("Tracking events error", eventsQuery.error);
  }

  const events =
    (eventsQuery.data as unknown as TrackingEventRow[] | null) ?? [];

  let deliveryPhotoUrl: string | null = null;

  const storagePath =
    typeof shipment.delivery_photo_url === "string"
      ? shipment.delivery_photo_url.trim()
      : "";

  if (storagePath) {
    const signedResult = await supabaseAdmin.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

    if (signedResult.error) {
      console.error(
        "Tracking evidence signed URL error",
        signedResult.error
      );
    } else {
      deliveryPhotoUrl = signedResult.data.signedUrl;
    }
  }

  const status =
    (shipment.status || "received_miami") as TrackingStatus;

  return NextResponse.json(
    {
      trackingCode: shipment.tracking_code,
      location: shipment.location || "Cuba",
      status,
      statusLabel:
        TRACKING_STATUS_LABELS[status] ||
        "Actualización del envío",
      createdDate: shipment.created_date,
      deliveredDate: shipment.delivered_date,
      updatedAt: shipment.updated_at,
      recipientDisplay: maskName(shipment.recipient_name),
      events: events.map((event) => ({
        status: event.status,
        title: event.title,
        description: event.description,
        eventDate: event.event_date,
      })),
      deliveryPhotoUrl,
      hasDeliveryPhoto: Boolean(storagePath),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
