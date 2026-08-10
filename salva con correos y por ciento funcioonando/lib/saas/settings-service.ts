import { supabase } from "@/lib/supabase"

export type SaasSettings = {
  primary_color: string
  secondary_color: string
}

const ROW_ID = "default"

/**
 * Colores de marca del panel Super Admin (la plataforma en sí, NO una
 * tienda de cliente). Viven en su propia tabla de una sola fila,
 * separada de `stores`, porque no pertenecen a ningún cliente.
 */
export async function getSaasSettings(): Promise<SaasSettings> {
  const { data, error } = await supabase
    .from("saas_settings")
    .select("primary_color, secondary_color")
    .eq("id", ROW_ID)
    .maybeSingle()

  if (error || !data) {
    // Si la migración SQL todavía no corrió, o falla la consulta,
    // no rompemos el panel: caemos a los colores actuales por defecto.
    return { primary_color: "#111827", secondary_color: "#2563EB" }
  }

  return data
}

export async function updateSaasSettings(
  settings: Partial<SaasSettings>
): Promise<{ data: SaasSettings | null; error: string | null }> {
  const { data, error } = await supabase
    .from("saas_settings")
    .update(settings)
    .eq("id", ROW_ID)
    .select("primary_color, secondary_color")
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
