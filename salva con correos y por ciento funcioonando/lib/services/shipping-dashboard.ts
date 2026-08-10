import { supabase } from "@/lib/supabase";
import type { ShippingDashboardData } from "@/lib/shipping/dashboard-types";

export async function getShippingDashboard(
  storeId: string
) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    return { data: null, error: new Error("No se encontró una sesión activa.") };
  }

  const response = await fetch(
    `/api/admin/shipping/dashboard?store_id=${encodeURIComponent(storeId)}`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const payload = await response.json().catch(() => null);

  return {
    data: response.ok ? (payload?.data as ShippingDashboardData) : null,
    error: response.ok
      ? null
      : new Error(payload?.error || "No se pudieron calcular las estadísticas."),
  };
}
