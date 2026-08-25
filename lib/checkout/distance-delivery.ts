export type DistanceDeliverySettings = {
  delivery_origin_address: string;
  delivery_origin_latitude: number | null;
  delivery_origin_longitude: number | null;
  distance_base_km: number;
  distance_base_fee: number;
  distance_additional_fee_per_km: number;
  max_delivery_distance_km: number | null;
};

export type DeliveryRoute = {
  distanceMeters: number;
  durationSeconds: number | null;
  provider: "openrouteservice" | "osrm";
};

function finite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeDistanceSettings(row: Record<string, unknown>): DistanceDeliverySettings {
  return {
    delivery_origin_address: String(row.delivery_origin_address || "").trim(),
    delivery_origin_latitude: finite(row.delivery_origin_latitude),
    delivery_origin_longitude: finite(row.delivery_origin_longitude),
    distance_base_km: Math.max(0, finite(row.distance_base_km) ?? 1),
    distance_base_fee: Math.max(0, finite(row.distance_base_fee) ?? 200),
    distance_additional_fee_per_km: Math.max(
      0,
      finite(row.distance_additional_fee_per_km) ?? 100
    ),
    max_delivery_distance_km:
      finite(row.max_delivery_distance_km) == null
        ? null
        : Math.max(0, finite(row.max_delivery_distance_km)!),
  };
}

/**
 * Cobra la distancia adicional de manera proporcional, no por kilómetros
 * completos. Trabajar en metros evita errores como convertir 1.2 km en 2 km.
 */
export function calculateDistanceDeliveryFee(
  distanceMeters: number,
  settings: Pick<
    DistanceDeliverySettings,
    "distance_base_km" | "distance_base_fee" | "distance_additional_fee_per_km"
  >
) {
  const safeMeters = Math.max(0, Number(distanceMeters || 0));
  const baseMeters = Math.max(0, settings.distance_base_km) * 1000;
  const additionalKm = Math.max(0, safeMeters - baseMeters) / 1000;
  return Math.round(
    (settings.distance_base_fee +
      additionalKm * settings.distance_additional_fee_per_km) *
      100
  ) / 100;
}

export async function getDrivingRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<DeliveryRoute> {
  const orsKey = process.env.OPENROUTESERVICE_API_KEY;
  if (orsKey) {
    try {
      const response = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car",
        {
          method: "POST",
          headers: {
            Authorization: orsKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            coordinates: [
              [origin.longitude, origin.latitude],
              [destination.longitude, destination.latitude],
            ],
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(9000),
        }
      );
      if (response.ok) {
        const payload = await response.json();
        const summary = payload?.routes?.[0]?.summary;
        const distanceMeters = Number(summary?.distance);
        if (Number.isFinite(distanceMeters) && distanceMeters > 0) {
          return {
            distanceMeters,
            durationSeconds: Number.isFinite(Number(summary?.duration))
              ? Number(summary.duration)
              : null,
            provider: "openrouteservice",
          };
        }
      }
    } catch (error) {
      console.error("OpenRouteService delivery route failed", error);
    }
  }

  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false&steps=false`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "PerlaMarketplace-Delivery/1.0" },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error("No se pudo calcular la ruta de entrega.");
  const payload = await response.json();
  const route = payload?.routes?.[0];
  const distanceMeters = Number(route?.distance);
  if (payload?.code !== "Ok" || !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    throw new Error("No encontramos una ruta en automóvil hasta esa ubicación.");
  }
  return {
    distanceMeters,
    durationSeconds: Number.isFinite(Number(route?.duration)) ? Number(route.duration) : null,
    provider: "osrm",
  };
}

export function validCoordinate(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function normalizeCubanAddress(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:av|ave)\.?\b/g, "avenida")
    .replace(/\b(?:cl|cll)\.?\b/g, "calle")
    .replace(/\b(?:e\/|e\/|ent)\b/g, "entre")
    .replace(/\besq\.?\b/g, "esquina")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 240);
}
