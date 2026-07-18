import { supabase } from "@/lib/supabase";
import type { Shipment, ShipmentInput, ShippingDriver } from "@/lib/shipping/types";

function identity() {
  const id = crypto.randomUUID();
  return { id, trackingCode: `ACE-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}` };
}

function paymentStatus(total: number, paid: number) {
  if (total > 0 && paid >= total) return "paid";
  if (paid > 0) return "partial";
  return "pending";
}

export function getShipmentsByStoreId(storeId: string) {
  return supabase.from("shipments").select("*").eq("store_id", storeId).is("deleted_at", null).order("order_number", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).returns<Shipment[]>();
}

export function getShipmentById(storeId: string, shipmentId: string) {
  return supabase.from("shipments").select("*").eq("store_id", storeId).eq("id", shipmentId).is("deleted_at", null).maybeSingle<Shipment>();
}

export function getShipmentItems(storeId: string, shipmentId: string) {
  return supabase
    .from("shipment_items")
    .select("*")
    .eq("store_id", storeId)
    .eq("shipment_id", shipmentId)
    .order("sort_order");
}

export function getShipmentFees(shipmentId: string) {
  return supabase.from("shipment_extra_fees").select("*").eq("shipment_id", shipmentId).order("created_at");
}

export function getShippingDriversByStoreId(storeId: string) {
  return supabase.from("app_users").select("id,name,username,is_active").eq("store_id", storeId).eq("role", "DRIVER").order("name").returns<ShippingDriver[]>();
}

async function replaceItems(storeId: string, shipmentId: string, input: ShipmentInput) {
  await supabase.from("shipment_items").delete().eq("store_id", storeId).eq("shipment_id", shipmentId);
  const rows: Record<string, unknown>[] = [];
  let sort = 1;
  if (input.contains_package) rows.push({ store_id: storeId, shipment_id: shipmentId, item_type: "PACKAGE", description: input.service_type_name || "Paquete", quantity: input.weight_lb, unit: "lb", unit_price: input.rate_per_lb, subtotal: input.weight_subtotal, discount_amount: 0, total: input.weight_subtotal, metadata: { legacy_location: input.location }, sort_order: sort++ });
  if (input.contains_money) rows.push({ store_id: storeId, shipment_id: shipmentId, item_type: "MONEY", description: "Comisión por envío de dinero", quantity: input.money_amount, unit: "USD enviados", unit_price: input.money_commission_rate, subtotal: input.money_commission, discount_amount: input.money_discount, total: input.money_total, metadata: { discount_reason: input.money_discount_reason }, sort_order: sort++ });
  input.selected_fees.forEach((fee) => rows.push({ store_id: storeId, shipment_id: shipmentId, item_type: "EXTRA_FEE", description: fee.fee_name, quantity: 1, unit: "fee", unit_price: fee.calculated_amount, subtotal: fee.calculated_amount, discount_amount: 0, total: fee.calculated_amount, metadata: { fee_id: fee.fee_id }, sort_order: sort++ }));
  if (input.discount_amount > 0) rows.push({ store_id: storeId, shipment_id: shipmentId, item_type: "DISCOUNT", description: input.discount_reason || "Descuento general", quantity: 1, unit: "descuento", unit_price: -input.discount_amount, subtotal: -input.discount_amount, discount_amount: input.discount_amount, total: -input.discount_amount, metadata: {}, sort_order: sort++ });
  if (rows.length) {
    const { error } = await supabase.from("shipment_items").insert(rows);
    if (error) throw error;
  }
}

async function save(storeId: string, shipmentId: string | null, input: ShipmentInput, userId?: string | null) {
  const now = new Date().toISOString();
  const data = {
    store_id: storeId,
    location: input.location,
    country_id: input.country_id,
    province_id: input.province_id,
    municipality_id: input.municipality_id,
    shipping_location_id: input.shipping_location_id,
    service_type_id: input.service_type_id,
    service_type_name: input.service_type_name,
    recipient_name: input.recipient_name.trim(),
    recipient_address: input.recipient_address.trim(),
    recipient_phone: input.recipient_phone.trim(),
    sender_name: input.sender_name.trim(),
    sender_phone: input.sender_phone.trim(),
    notes: input.notes.trim(),
    status: input.status,
    delivered: input.status === "delivered",
    delivered_date: input.status === "delivered" ? now : null,
    public_tracking_enabled: input.public_tracking_enabled,
    assigned_driver_id: input.assigned_driver_id,
    assigned_driver_name: input.assigned_driver_name,
    contains_package: input.contains_package,
    contains_money: input.contains_money,
    weight_lb: input.contains_package ? input.weight_lb : 0,
    rate_per_lb: input.contains_package ? input.rate_per_lb : 0,
    weight_subtotal: input.contains_package ? input.weight_subtotal : 0,
    money_amount: input.contains_money ? input.money_amount : 0,
    money_commission_rate: input.contains_money ? input.money_commission_rate : 0,
    money_commission: input.contains_money ? input.money_commission : 0,
    money_discount: input.contains_money ? input.money_discount : 0,
    money_discount_reason: input.contains_money ? input.money_discount_reason || null : null,
    money_total: input.contains_money ? input.money_total : 0,
    extra_fees_total: input.extra_fees_total,
    discount_amount: input.discount_amount,
    discount_reason: input.discount_reason || null,
    service_price: input.service_price,
    amount_paid: input.amount_paid,
    balance_due: input.balance_due,
    payment_status: paymentStatus(input.service_price, input.amount_paid),
    payment_method: input.payment_method || null,
    updated_by: userId || null,
    updated_at: now,
  };

  if (!shipmentId) {
    const ids = identity();

    const result = await supabase.rpc("create_numbered_shipment", {
      p_store_id: storeId,
      p_id: ids.id,
      p_tracking_code: ids.trackingCode,
      p_payload: {
        ...data,
        created_date: now,
        created_by: userId || null,
      },
    });

    const shipment = (result.data || null) as Shipment | null;

    if (!result.error && shipment) {
      await replaceItems(storeId, shipment.id, input);
    }

    return {
      data: shipment,
      error: result.error,
    };
  }

  const result = await supabase.from("shipments").update(data).eq("store_id", storeId).eq("id", shipmentId).select("*").single<Shipment>();
  if (!result.error) await replaceItems(storeId, shipmentId, input);
  return result;
}

export function createShipment(storeId: string, input: ShipmentInput, createdBy?: string | null) { return save(storeId, null, input, createdBy); }
export function updateShipment(storeId: string, shipmentId: string, input: ShipmentInput, updatedBy?: string | null) { return save(storeId, shipmentId, input, updatedBy); }
export function moveShipmentToTrash(storeId: string, shipmentId: string) { return supabase.from("shipments").update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("store_id", storeId).eq("id", shipmentId); }
