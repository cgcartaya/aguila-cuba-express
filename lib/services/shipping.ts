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

export type ShipmentsPageFilters = {
  page: number; // 1-based
  pageSize: number;
  search?: string;
  status?: string; // "all" | ShippingStatus
  tripId?: string; // "all" | "unassigned" | uuid
  provinceId?: string;
  municipalityId?: string;
  locationId?: string;
  driverName?: string;
  contentType?: "all" | "package" | "money" | "mixed";
  paymentStatus?: string; // "all" | pending | partial | paid
  assignment?: "all" | "assigned" | "unassigned";
  dateFrom?: string; // yyyy-mm-dd
  dateTo?: string;
  sort?: "newest" | "oldest" | "order_asc" | "order_desc";
};

// Trae solo una página de envíos, con todos los filtros y el orden
// aplicados en el servidor (Supabase), en vez de traer la tienda
// completa y filtrar en el navegador. Devuelve también el conteo total
// que cumple los filtros (para pintar "página X de Y").
export function getShipmentsPage(storeId: string, filters: ShipmentsPageFilters) {
  let query = supabase
    .from("shipments")
    .select("*", { count: "exact" })
    .eq("store_id", storeId)
    .is("deleted_at", null);

  const search = filters.search?.trim();
  if (search) {
    const like = `%${search}%`;
    query = query.or(
      [
        `order_number::text.ilike.${like}`,
        `tracking_code.ilike.${like}`,
        `recipient_name.ilike.${like}`,
        `recipient_phone.ilike.${like}`,
        `sender_name.ilike.${like}`,
        `sender_phone.ilike.${like}`,
        `recipient_identity_card.ilike.${like}`,
        `recipient_address.ilike.${like}`,
        `location.ilike.${like}`,
      ].join(",")
    );
  }

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

  if (filters.tripId && filters.tripId !== "all") {
    query = filters.tripId === "unassigned" ? query.is("trip_id", null) : query.eq("trip_id", filters.tripId);
  }

  if (filters.provinceId) query = query.eq("province_id", filters.provinceId);
  if (filters.municipalityId) query = query.eq("municipality_id", filters.municipalityId);
  if (filters.locationId) query = query.eq("shipping_location_id", filters.locationId);
  if (filters.driverName) query = query.eq("assigned_driver_name", filters.driverName);
  if (filters.paymentStatus && filters.paymentStatus !== "all") query = query.eq("payment_status", filters.paymentStatus);

  if (filters.assignment === "assigned") query = query.not("assigned_driver_id", "is", null);
  if (filters.assignment === "unassigned") query = query.is("assigned_driver_id", null);

  if (filters.contentType === "package") query = query.eq("contains_package", true).eq("contains_money", false);
  if (filters.contentType === "money") query = query.eq("contains_money", true).eq("contains_package", false);
  if (filters.contentType === "mixed") query = query.eq("contains_package", true).eq("contains_money", true);

  if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59`);

  if (filters.sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (filters.sort === "order_asc") query = query.order("order_number", { ascending: true, nullsFirst: false });
  else if (filters.sort === "order_desc") query = query.order("order_number", { ascending: false, nullsFirst: true });
  else query = query.order("created_at", { ascending: false });

  const start = (filters.page - 1) * filters.pageSize;
  const end = start + filters.pageSize - 1;

  return query.range(start, end).returns<Shipment[]>();
}

// Conteos livianos para las tarjetas del encabezado. Son consultas
// "head" (count-only), no traen filas, así que son baratas incluso con
// muchos envíos.
export async function getShipmentsSummaryCounts(storeId: string) {
  const base = () => supabase.from("shipments").select("id", { count: "exact", head: true }).eq("store_id", storeId).is("deleted_at", null);

  const [totalResult, pendingResult, unassignedResult] = await Promise.all([
    base(),
    base().neq("payment_status", "paid"),
    base().is("assigned_driver_id", null).is("assigned_driver_name", null),
  ]);

  return {
    total: totalResult.count || 0,
    pending: pendingResult.count || 0,
    unassigned: unassignedResult.count || 0,
    error: totalResult.error || pendingResult.error || unassignedResult.error || null,
  };
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

  // Un envío puede crearse sin viaje. El consecutivo general se asigna
  // igualmente y trip_order permanece nulo hasta que se asigne a uno.
  const tripId = input.trip_id ?? null;

  // IMPORTANTE: trip_id sólo se incluye en el payload cuando el llamador lo
  // especificó explícitamente. Si se defaulteara a null cada vez que el
  // formulario no lo trae (como pasa en la edición, que no gestiona viajes),
  // cada guardado desvincularía el envío de su viaje y rompería el
  // consecutivo (trip_order) sin que nadie lo pidiera. Para crear, trip_id
  // siempre se especifica (incluso null, válido para un envío sin viaje);
  // para actualizar, el cambio de viaje debe pedirse a propósito.
  const tripIdProvided = input.trip_id !== undefined;

  const data: Record<string, unknown> = {
    store_id: storeId,
    customer_id: input.customer_id,
    recipient_id: input.recipient_id,
    location: input.location,
    country_id: input.country_id,
    province_id: input.province_id,
    municipality_id: input.municipality_id,
    shipping_location_id: input.shipping_location_id,
    // Igual que con weight_lb/rate_per_lb más abajo: si el envío ya no
    // incluye paquete, no puede quedar un tipo de paquete "fantasma"
    // (p.ej. "Normal") guardado de una edición anterior, porque eso
    // hace que las vistas que muestran el tipo por texto (como el
    // manifiesto de viaje) sigan diciendo "Paquete normal" aunque el
    // envío ahora sea solo de dinero.
    service_type_id: input.contains_package ? input.service_type_id : null,
    service_type_name: input.contains_package ? input.service_type_name : null,
    recipient_name: input.recipient_name.trim(),
    recipient_address: input.recipient_address.trim(),
    recipient_phone: input.recipient_phone.trim(),
    recipient_identity_card: input.recipient_identity_card?.trim() || null,
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

    // V21: Supabase asigna order_number una sola vez y, cuando hay viaje,
    // asigna trip_order independientemente.
    const result = await supabase.rpc("create_numbered_shipment", {
      p_store_id: storeId,
      p_id: ids.id,
      p_tracking_code: ids.trackingCode,
      p_payload: {
        ...data,
        trip_id: tripId,
        created_date: now,
        created_by: userId || null,
      },
    });

    if (result.error) return { data: null, error: result.error };

    let shipment = (result.data || null) as Shipment | null;
    if (!shipment?.id) {
      return {
        data: null,
        error: { message: "El envío fue procesado, pero Supabase no devolvió el registro creado." },
      };
    }

    if (shipment.trip_id !== tripId) {
      return {
        data: shipment,
        error: { message: "El envío fue creado, pero el viaje devuelto no coincide con el seleccionado." },
      };
    }

    if (!shipment.order_number) {
      return {
        data: shipment,
        error: { message: "El envío fue creado, pero no recibió su consecutivo general." },
      };
    }

    if (tripId && !shipment.trip_order) {
      return {
        data: shipment,
        error: { message: "El envío fue creado, pero no recibió su posición dentro del viaje." },
      };
    }

    try {
      await replaceItems(storeId, shipment.id, input);
    } catch (itemError) {
      await supabase.from("shipments").delete().eq("store_id", storeId).eq("id", shipment.id);
      return {
        data: null,
        error: itemError instanceof Error ? itemError : { message: "No se pudieron guardar los artículos del envío." },
      };
    }

    return { data: shipment, error: null };
  }

  const updateData = tripIdProvided ? { ...data, trip_id: tripId } : data;
  const result = await supabase.from("shipments").update(updateData).eq("store_id", storeId).eq("id", shipmentId).select("*").single<Shipment>();
  if (!result.error) await replaceItems(storeId, shipmentId, input);
  return result;
}

export function createShipment(storeId: string, input: ShipmentInput, createdBy?: string | null) { return save(storeId, null, input, createdBy); }
export function updateShipment(storeId: string, shipmentId: string, input: ShipmentInput, updatedBy?: string | null) { return save(storeId, shipmentId, input, updatedBy); }
export function moveShipmentToTrash(storeId: string, shipmentId: string, deletedBy?: string | null) {
  return supabase.rpc("trash_shipments_v21", {
    p_store_id: storeId,
    p_shipment_ids: [shipmentId],
    p_deleted_by: deletedBy || null,
  });
}

export function getTrashedShipmentsByStoreId(storeId: string) {
  return supabase.from("shipments").select("*").eq("store_id", storeId).not("deleted_at", "is", null).order("deleted_at", { ascending: false }).returns<Shipment[]>();
}

export function restoreShipment(storeId: string, shipmentId: string) {
  return supabase.rpc("restore_shipment_v21", {
    p_store_id: storeId,
    p_shipment_id: shipmentId,
  });
}

export function permanentlyDeleteShipment(storeId: string, shipmentId: string) {
  return supabase.rpc("permanently_delete_shipment_v21", {
    p_store_id: storeId,
    p_shipment_id: shipmentId,
  });
}

export function updateShipmentStatus(
  storeId: string,
  shipmentId: string,
  status: Shipment["status"],
) {
  const now = new Date().toISOString();
  return supabase
    .from("shipments")
    .update({
      status,
      delivered: status === "delivered",
      delivered_date: status === "delivered" ? now : null,
      updated_at: now,
    })
    .eq("store_id", storeId)
    .eq("id", shipmentId)
    .is("deleted_at", null);
}

export function bulkUpdateShipmentStatus(
  storeId: string,
  shipmentIds: string[],
  status: Shipment["status"],
) {
  if (!shipmentIds.length) return Promise.resolve({ data: null, error: null });
  const now = new Date().toISOString();
  return supabase
    .from("shipments")
    .update({
      status,
      delivered: status === "delivered",
      delivered_date: status === "delivered" ? now : null,
      updated_at: now,
    })
    .eq("store_id", storeId)
    .in("id", shipmentIds)
    .is("deleted_at", null);
}

export function bulkMoveShipmentsToTrash(storeId: string, shipmentIds: string[], deletedBy?: string | null) {
  if (!shipmentIds.length) return Promise.resolve({ data: 0, error: null });
  return supabase.rpc("trash_shipments_v21", {
    p_store_id: storeId,
    p_shipment_ids: shipmentIds,
    p_deleted_by: deletedBy || null,
  });
}

export function bulkAssignShipmentDriver(
  storeId: string,
  shipmentIds: string[],
  driver: Pick<ShippingDriver, "id" | "name"> | null,
) {
  if (!shipmentIds.length) return Promise.resolve({ data: null, error: null });
  return supabase
    .from("shipments")
    .update({
      assigned_driver_id: driver?.id || null,
      assigned_driver_name: driver?.name || null,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId)
    .in("id", shipmentIds)
    .is("deleted_at", null);
}

export function bulkMoveShipmentsToTrip(
  storeId: string,
  shipmentIds: string[],
  tripId: string,
) {
  if (!shipmentIds.length) return Promise.resolve({ data: null, error: null });
  return supabase.rpc("move_shipments_to_trip_v21", {
    p_store_id: storeId,
    p_shipment_ids: shipmentIds,
    p_trip_id: tripId,
  });
}
