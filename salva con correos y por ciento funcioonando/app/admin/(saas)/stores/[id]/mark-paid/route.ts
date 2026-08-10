import { NextRequest, NextResponse } from "next/server"
import {
  getStoreById,
  markStoreAsPaid,
} from "@/lib/services/stores"

function addOneMonth(date: Date) {
  const newDate = new Date(date)
  newDate.setMonth(newDate.getMonth() + 1)
  return newDate
}

function formatDate(date: Date) {
  return date.toISOString().split("T")[0]
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  }
) {
  const { id } = await context.params

  const store = await getStoreById(id)

  if (!store) {
    return NextResponse.redirect(new URL("/admin/saas", request.url))
  }

  const today = new Date()

  const baseDate = store.next_payment_date
    ? new Date(store.next_payment_date)
    : today

  const nextPaymentDate = addOneMonth(baseDate)

  const { error } = await markStoreAsPaid(id, {
    payment_status: "paid",
    last_payment_date: formatDate(today),
    next_payment_date: formatDate(nextPaymentDate),
    is_active: true,
  })

  if (error) {
    console.error("ERROR MARKING STORE AS PAID:", error)
  }

  return NextResponse.redirect(new URL("/admin/saas", request.url))
}