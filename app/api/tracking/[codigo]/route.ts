import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  TRACKING_STATUS_LABELS,
  type TrackingStatus,
} from "@/lib/tracking/types";

const EVIDENCE_BUCKET = "delivery-photos";
const SIGNED_URL_SECONDS = 10 * 60;

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
  if (parts.length === 1) return `${parts[0].charAt(0)}***`;

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

  const { data: shipment, error: shipmentError } = await supabaseAdmin
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

  if (shipmentError) {
    console.error("Tracking shipment error", shipmentError);
    return NextResponse.json(
      { error: "No se pudo consultar el envío" },
      { status: 500 }
    );
  }

  if (!shipment) {
    return NextResponse.json(
      { error: "No encontramos un envío activo con ese código" },
      { status: 404 }
    );
  }

  const { data: events, error: eventsError } = await supabaseAdmin
    .from("shipment_tracking_events")
    .select("status, title, description, event_date")
    .eq("shipment_id", shipment.id)
    .order("event_date", { ascending: true });

  if (eventsError) {
    console.error("Tracking events error", eventsError);
  }

  let deliveryPhotoUrl: string | null = null;
  const storagePath =
    typeof shipment.delivery_photo_url === "string"
      ? shipment.delivery_photo_url.trim()
      : "";

  if (storagePath) {
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

    if (signedError) {
      console.error("Tracking evidence signed URL error", signedError);
    } else {
      deliveryPhotoUrl = signedData.signedUrl;
    }
  }

  const status = (shipment.status || "received_miami") as TrackingStatus;

  return NextResponse.json(
    {
      trackingCode: shipment.tracking_code,
      location: shipment.location || "Cuba",
      status,
      statusLabel:
        TRACKING_STATUS_LABELS[status] || "Actualización del envío",
      createdDate: shipment.created_date,
      deliveredDate: shipment.delivered_date,
      updatedAt: shipment.updated_at,
      recipientDisplay: maskName(shipment.recipient_name),
      events: (events || []).map((event) => ({
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
