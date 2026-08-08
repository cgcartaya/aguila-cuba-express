import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ShippingDashboardData } from "@/lib/shipping/dashboard-types";

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const money = (value: unknown) => Number(Number(value || 0).toFixed(2));

async function canReadStore(request: NextRequest, storeId: string) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return fail("No se recibió la sesión.", 401);

  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return fail("Sesión inválida.", 401);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role,active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.active) return fail("Usuario inactivo.", 403);
  if (profile.role === "super_admin") return null;

  const { data: membership } = await supabaseAdmin
    .from("store_users")
    .select("active")
    .eq("store_id", storeId)
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();

  return membership ? null : fail("No tienes acceso a esta tienda.", 403);
}

type FinancialShipment = {
  id: string;
  order_number: number | null;
  tracking_code: string | null;
  recipient_name: string | null;
  sender_name: string | null;
  location: string | null;
  status: string;
  assigned_staff_id: string | null;
  assigned_driver_id: string | null;
  assigned_driver_name: string | null;
  service_price: number;
  amount_paid: number;
  balance_due: number;
  weight_lb: number;
  contains_package: boolean;
  contains_money: boolean;
  money_amount: number;
  created_at: string;
  delivered_date: string | null;
};

function dateKey(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export async function GET(request: NextRequest) {
  const storeId = String(request.nextUrl.searchParams.get("store_id") || "").trim();
  if (!storeId) return fail("store_id es obligatorio.");

  const denied = await canReadStore(request, storeId);
  if (denied) return denied;

  const [shipmentsResult, receiptsResult] = await Promise.all([
    supabaseAdmin
      .from("shipments")
      .select("id,order_number,tracking_code,recipient_name,sender_name,location,status,assigned_staff_id,assigned_driver_id,assigned_driver_name,service_price,amount_paid,balance_due,weight_lb,contains_package,contains_money,money_amount,created_at,delivered_date")
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("payment_receipts")
      .select("shipment_id,amount")
      .eq("store_id", storeId),
  ]);

  if (shipmentsResult.error || receiptsResult.error) {
    return fail(shipmentsResult.error?.message || receiptsResult.error?.message || "No se pudieron calcular las estadísticas.", 500);
  }

  const rows = (shipmentsResult.data || []) as FinancialShipment[];
  const receiptTotals = new Map<string, number>();
  (receiptsResult.data || []).forEach((receipt) => {
    receiptTotals.set(receipt.shipment_id, money((receiptTotals.get(receipt.shipment_id) || 0) + Number(receipt.amount || 0)));
  });

  const financialRows = rows.map((shipment) => {
    const billed = money(shipment.service_price);
    const receipts = money(receiptTotals.get(shipment.id) || 0);
    // Compatibilidad: operaciones antiguas pueden tener amount_paid pero no
    // recibo. Nunca reconocemos como cobrado más de lo facturado.
    const paid = money(Math.min(billed, Math.max(receipts, Number(shipment.amount_paid || 0))));
    return { ...shipment, billed, paid, outstanding: money(Math.max(billed - paid, 0)) };
  });

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const isToday = (shipment: FinancialShipment) => dateKey(shipment.created_at) === today;
  const isMonth = (shipment: FinancialShipment) => dateKey(shipment.created_at).startsWith(month);
  const sum = <T,>(items: T[], selector: (item: T) => number) => money(items.reduce((total, item) => total + selector(item), 0));

  const statusLabels: Record<string, string> = {
    received_miami: "Recibido en Miami",
    preparing: "Preparando salida",
    in_transit: "En tránsito",
    received_cuba: "Recibido en Cuba",
    out_for_delivery: "En reparto",
    delivered: "Entregado",
    issue: "Incidencia",
  };

  const statuses = Object.entries(statusLabels).map(([status, label]) => ({
    status,
    label,
    count: financialRows.filter((shipment) => shipment.status === status).length,
  }));

  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const dayRows = financialRows.filter((shipment) => dateKey(shipment.created_at) === key);
    return {
      date: key,
      label: new Intl.DateTimeFormat("es-US", { weekday: "short", timeZone: "UTC" }).format(date).replace(".", ""),
      created: dayRows.length,
      delivered: financialRows.filter((shipment) => dateKey(shipment.delivered_date) === key).length,
      billed: sum(dayRows, (shipment) => shipment.billed),
    };
  });

  const destinationMap = new Map<string, { location: string; count: number; weight_lb: number; total_amount: number }>();
  financialRows.forEach((shipment) => {
    const location = shipment.location?.trim() || "Sin destino";
    const current = destinationMap.get(location) || { location, count: 0, weight_lb: 0, total_amount: 0 };
    current.count += 1;
    current.weight_lb += Number(shipment.weight_lb || 0);
    current.total_amount += shipment.billed;
    destinationMap.set(location, current);
  });

  const driverMap = new Map<string, { driver_id: string | null; driver_name: string; assigned: number; pending: number; delivered: number; issues: number; completion_rate: number }>();
  financialRows.filter((shipment) => shipment.assigned_staff_id || shipment.assigned_driver_id || shipment.assigned_driver_name).forEach((shipment) => {
    const key = shipment.assigned_staff_id || shipment.assigned_driver_id || shipment.assigned_driver_name || "unassigned";
    const current = driverMap.get(key) || { driver_id: shipment.assigned_staff_id || shipment.assigned_driver_id, driver_name: shipment.assigned_driver_name || "Sin nombre", assigned: 0, pending: 0, delivered: 0, issues: 0, completion_rate: 0 };
    current.assigned += 1;
    if (shipment.status === "delivered") current.delivered += 1;
    else if (shipment.status === "issue") current.issues += 1;
    else current.pending += 1;
    current.completion_rate = current.assigned ? Math.round((current.delivered / current.assigned) * 100) : 0;
    driverMap.set(key, current);
  });

  const data: ShippingDashboardData = {
    summary: {
      total_active: financialRows.length,
      created_today: financialRows.filter(isToday).length,
      created_this_week: financialRows.filter((shipment) => {
        const created = new Date(shipment.created_at).getTime();
        return created >= now.getTime() - 7 * 86_400_000;
      }).length,
      pending_total: financialRows.filter((shipment) => !["delivered", "issue"].includes(shipment.status)).length,
      delivered_total: financialRows.filter((shipment) => shipment.status === "delivered").length,
      delivered_today: financialRows.filter((shipment) => dateKey(shipment.delivered_date) === today).length,
      issues_total: financialRows.filter((shipment) => shipment.status === "issue").length,
      in_transit_total: financialRows.filter((shipment) => shipment.status === "in_transit").length,
      received_cuba_total: financialRows.filter((shipment) => shipment.status === "received_cuba").length,
      out_for_delivery_total: financialRows.filter((shipment) => shipment.status === "out_for_delivery").length,
      unassigned_total: financialRows.filter((shipment) => !shipment.assigned_staff_id && !shipment.assigned_driver_id && !shipment.assigned_driver_name).length,
      billed_today: sum(financialRows.filter(isToday), (shipment) => shipment.billed),
      billed_this_month: sum(financialRows.filter(isMonth), (shipment) => shipment.billed),
      outstanding_total: sum(financialRows, (shipment) => shipment.outstanding),
      paid_total: sum(financialRows, (shipment) => shipment.paid),
      weight_today_lb: sum(financialRows.filter(isToday), (shipment) => shipment.contains_package ? Number(shipment.weight_lb || 0) : 0),
      weight_this_month_lb: sum(financialRows.filter(isMonth), (shipment) => shipment.contains_package ? Number(shipment.weight_lb || 0) : 0),
      money_sent_today: sum(financialRows.filter(isToday), (shipment) => shipment.contains_money ? Number(shipment.money_amount || 0) : 0),
      money_sent_this_month: sum(financialRows.filter(isMonth), (shipment) => shipment.contains_money ? Number(shipment.money_amount || 0) : 0),
    },
    statuses,
    last_7_days: last7Days,
    top_destinations: Array.from(destinationMap.values()).map((item) => ({ ...item, weight_lb: Number(item.weight_lb.toFixed(2)), total_amount: money(item.total_amount) })).sort((a, b) => b.count - a.count).slice(0, 6),
    drivers: Array.from(driverMap.values()).sort((a, b) => b.assigned - a.assigned),
    recent_shipments: financialRows.slice(0, 8).map((shipment) => ({
      id: shipment.id,
      order_number: shipment.order_number,
      tracking_code: shipment.tracking_code,
      recipient_name: shipment.recipient_name,
      sender_name: shipment.sender_name,
      location: shipment.location || "",
      status: shipment.status,
      assigned_driver_name: shipment.assigned_driver_name,
      service_price: shipment.billed,
      balance_due: shipment.outstanding,
      weight_lb: Number(shipment.weight_lb || 0),
      contains_package: shipment.contains_package,
      contains_money: shipment.contains_money,
      created_at: shipment.created_at,
    })),
  };

  return NextResponse.json({ ok: true, data });
}
