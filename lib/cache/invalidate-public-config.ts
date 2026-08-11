import { supabase } from "@/lib/supabase";

export type PublicConfigScope =
  | "commercial-portal-config"
  | "public-quote-config"
  | "pickup-config"
  | "payment-availability";

export async function invalidatePublicConfig(storeId: string, scopes: PublicConfigScope[]) {
  if (!storeId || !scopes.length) return false;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;

    const response = await fetch("/api/admin/cache/revalidate", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ store_id: storeId, scopes }),
    });

    return response.ok;
  } catch (error) {
    console.warn("No se pudo invalidar la caché pública:", error);
    return false;
  }
}
