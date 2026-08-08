import { supabase } from "@/lib/supabase"

/* =========================================================
   LIQUIDACIONES DE COMISIÓN DE PLATAFORMA (PERLA)

   El periodo NO es automático por mes: tú decides cuándo cortarlo.
   "Pendiente" = todo lo vendido desde la última liquidación
   registrada (o desde que existe la tienda, si nunca se ha
   registrado ninguna) hasta ahora.

   Registrar una liquidación no mueve dinero por sí solo: es tu
   confirmación de que YA recibiste ese pago de la tienda, y sirve
   para que el corte de "pendiente" arranque de cero otra vez.
========================================================= */

export type PlatformFeeSettlement = {
  id: string
  store_id: string
  period_start: string
  period_end: string
  sales_amount: number
  fee_amount: number
  registered_at: string
  notes: string | null
}

export type PendingPlatformFee = {
  periodStart: string
  salesAmount: number
  feeAmount: number
  ordersCount: number
}

async function getLastSettlementEnd(storeId: string): Promise<string> {
  const { data } = await supabase
    .from("platform_fee_settlements")
    .select("period_end")
    .eq("store_id", storeId)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (data?.period_end) return data.period_end

  const { data: store } = await supabase
    .from("stores")
    .select("created_at")
    .eq("id", storeId)
    .maybeSingle()

  return store?.created_at || new Date(0).toISOString()
}

/**
 * Comisión acumulada desde la última liquidación registrada
 * (o desde el inicio de la tienda si nunca se ha registrado una).
 */
export async function getPendingPlatformFee(
  storeId: string
): Promise<PendingPlatformFee> {
  const periodStart = await getLastSettlementEnd(storeId)

  const { data, error } = await supabase
    .from("orders")
    .select("total, platform_fee_amount")
    .eq("store_id", storeId)
    .gt("created_at", periodStart)

  if (error || !data) {
    console.error("Error loading pending platform fee:", error)
    return { periodStart, salesAmount: 0, feeAmount: 0, ordersCount: 0 }
  }

  const salesAmount = data.reduce(
    (sum, row) => sum + Number(row.total || 0),
    0
  )
  const feeAmount = data.reduce(
    (sum, row) =>
      sum +
      Number(
        (row as { platform_fee_amount?: number }).platform_fee_amount || 0
      ),
    0
  )

  return {
    periodStart,
    salesAmount: Math.round(salesAmount * 100) / 100,
    feeAmount: Math.round(feeAmount * 100) / 100,
    ordersCount: data.length,
  }
}

export async function getPlatformFeeSettlementHistory(
  storeId: string
): Promise<PlatformFeeSettlement[]> {
  const { data, error } = await supabase
    .from("platform_fee_settlements")
    .select(
      "id, store_id, period_start, period_end, sales_amount, fee_amount, registered_at, notes"
    )
    .eq("store_id", storeId)
    .order("period_end", { ascending: false })

  if (error || !data) {
    console.error("Error loading settlement history:", error)
    return []
  }

  return data as PlatformFeeSettlement[]
}

/**
 * Cierra el periodo pendiente y lo marca como pagado. Úsalo solo
 * cuando YA recibiste el dinero de la tienda por ese acumulado.
 */
export async function registerPlatformFeeSettlement(
  storeId: string,
  notes?: string
) {
  const pending = await getPendingPlatformFee(storeId)

  if (pending.feeAmount <= 0) {
    return {
      data: null,
      error: { message: "No hay comisión pendiente por registrar." },
    }
  }

  const periodEnd = new Date().toISOString()

  const result = await supabase
    .from("platform_fee_settlements")
    .insert({
      store_id: storeId,
      period_start: pending.periodStart,
      period_end: periodEnd,
      sales_amount: pending.salesAmount,
      fee_amount: pending.feeAmount,
      notes: notes?.trim() || null,
    })
    .select(
      "id, store_id, period_start, period_end, sales_amount, fee_amount, registered_at, notes"
    )
    .single()

  return result
}
