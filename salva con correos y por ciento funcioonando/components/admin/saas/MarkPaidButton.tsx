"use client"

import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { updateStore } from "@/lib/services/stores"

type MarkPaidButtonProps = {
  storeId: string
  currentNextPaymentDate?: string | null
}

function addOneMonth(date: Date) {
  const newDate = new Date(date)
  newDate.setMonth(newDate.getMonth() + 1)
  return newDate
}

function formatDate(date: Date) {
  return date.toISOString().split("T")[0]
}

export default function MarkPaidButton({
  storeId,
  currentNextPaymentDate,
}: MarkPaidButtonProps) {
  const router = useRouter()

  async function handleMarkPaid() {
    const today = new Date()

    const baseDate = currentNextPaymentDate
      ? new Date(currentNextPaymentDate)
      : today

    const nextPaymentDate = addOneMonth(baseDate)

    const { error } = await updateStore(storeId, {
      payment_status: "paid",
      last_payment_date: formatDate(today),
      next_payment_date: formatDate(nextPaymentDate),
      is_active: true,
    })

    if (error) {
      console.error("ERROR MARKING AS PAID:", error)
      alert(error.message || "Error marcando como pagado")
      return
    }

    alert("Pago actualizado correctamente")
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleMarkPaid}
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
    >
      <CheckCircle2 className="h-4 w-4" />
      Marcar pagado
    </button>
  )
}