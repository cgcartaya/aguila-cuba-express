import { supabase } from "@/lib/supabase";
import type {
  CustomerWithRecipients,
  SaveShippingCustomerInput,
  SaveShippingRecipientInput,
  ShippingCustomer,
  ShippingRecipient,
} from "@/lib/shipping/customer-types";

export function normalizeCustomerPhone(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function searchShippingCustomers(
  storeId: string,
  search: string,
  limit = 12
) {
  const { data, error } = await supabase.rpc("search_shipping_customers", {
    p_store_id: storeId,
    p_search: search.trim(),
    p_limit: limit,
  });

  return {
    data: (data || []) as ShippingCustomer[],
    error,
  };
}

export async function getShippingCustomerWithRecipients(
  storeId: string,
  customerId: string
) {
  const { data, error } = await supabase.rpc(
    "get_shipping_customer_with_recipients",
    {
      p_store_id: storeId,
      p_customer_id: customerId,
    }
  );

  return {
    data: (data || null) as CustomerWithRecipients | null,
    error,
  };
}

export async function findShippingCustomerDuplicate(
  storeId: string,
  phone: string,
  birthDate: string
) {
  const { data, error } = await supabase.rpc(
    "find_shipping_customer_duplicate",
    {
      p_store_id: storeId,
      p_phone: normalizeCustomerPhone(phone),
      p_birth_date: birthDate,
    }
  );

  return {
    data: (data || null) as ShippingCustomer | null,
    error,
  };
}

export async function saveShippingCustomer(
  input: SaveShippingCustomerInput
) {
  const { data, error } = await supabase.rpc("save_shipping_customer_v2", {
    p_store_id: input.store_id,
    p_customer_id: input.id || null,
    p_name: input.name,
    p_phone: normalizeCustomerPhone(input.phone),
    p_birth_date: input.birth_date,
    p_email: input.email || null,
    p_address: input.address || null,
    p_notes: input.notes || null,
  });

  return {
    data: (data || null) as ShippingCustomer | null,
    error,
  };
}

export async function saveShippingRecipient(
  input: SaveShippingRecipientInput
) {
  const { data, error } = await supabase.rpc(
    "save_shipping_recipient_v2",
    {
      p_store_id: input.store_id,
      p_customer_id: input.customer_id,
      p_recipient_id: input.id || null,
      p_name: input.name,
      p_phone: normalizeCustomerPhone(input.phone),
      p_address: input.address,
      p_identity_card: input.identity_card || null,
      p_country_id: input.country_id || null,
      p_province_id: input.province_id || null,
      p_municipality_id: input.municipality_id || null,
      p_shipping_location_id: input.shipping_location_id || null,
      p_legacy_location: input.legacy_location || null,
      p_relationship: input.relationship || null,
      p_notes: input.notes || null,
      p_is_favorite: input.is_favorite || false,
    }
  );

  return {
    data: (data || null) as ShippingRecipient | null,
    error,
  };
}

export async function getShippingCustomers(storeId: string) {
  const { data, error } = await supabase.rpc("get_shipping_customers", {
    p_store_id: storeId,
  });

  return {
    data: (data || []) as ShippingCustomer[],
    error,
  };
}

export async function getShippingCustomerDetail(
  storeId: string,
  customerId: string
) {
  const { data, error } = await supabase.rpc(
    "get_shipping_customer_detail",
    {
      p_store_id: storeId,
      p_customer_id: customerId,
    }
  );

  return {
    data: (data || null) as
      | {
          customer: ShippingCustomer;
          recipients: ShippingRecipient[];
          shipments: Array<Record<string, any>>;
        }
      | null,
    error,
  };
}

export async function setShippingRecipientActive(
  storeId: string,
  recipientId: string,
  isActive: boolean
) {
  return supabase
    .from("shipping_recipients")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId)
    .eq("id", recipientId);
}

/**
 * Carga los clientes activos mediante el RPC existente y, opcionalmente,
 * agrega los archivados directamente desde la tabla para poder restaurarlos.
 */
export async function getShippingCustomersWithArchived(storeId: string) {
  const activeResult = await getShippingCustomers(storeId);
  if (activeResult.error) return activeResult;

  const { data: archived, error: archivedError } = await supabase
    .from("shipping_customers")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", false)
    .order("updated_at", { ascending: false });

  if (archivedError) return { data: activeResult.data, error: archivedError };

  const merged = new Map<string, ShippingCustomer>();
  [...(activeResult.data || []), ...((archived || []) as ShippingCustomer[])].forEach((customer) => {
    merged.set(customer.id, {
      operations_count: 0,
      recipients_count: 0,
      total_billed: 0,
      total_paid: 0,
      total_balance: 0,
      total_weight_lb: 0,
      total_money_sent: 0,
      last_operation_at: null,
      ...customer,
    });
  });

  return { data: Array.from(merged.values()), error: null };
}

export async function archiveShippingCustomer(storeId: string, customerId: string) {
  return supabase
    .from("shipping_customers")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .eq("id", customerId);
}

export async function restoreShippingCustomer(storeId: string, customerId: string) {
  return supabase
    .from("shipping_customers")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .eq("id", customerId);
}

export async function deleteShippingCustomer(storeId: string, customerId: string) {
  const { count, error: shipmentCheckError } = await supabase
    .from("shipments")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("customer_id", customerId);

  if (shipmentCheckError) return { error: shipmentCheckError };
  if ((count || 0) > 0) {
    return { error: new Error("Este cliente ya tiene envíos y solamente puede archivarse.") };
  }

  const { error: recipientsError } = await supabase
    .from("shipping_recipients")
    .delete()
    .eq("store_id", storeId)
    .eq("customer_id", customerId);

  if (recipientsError) return { error: recipientsError };

  const { error } = await supabase
    .from("shipping_customers")
    .delete()
    .eq("store_id", storeId)
    .eq("id", customerId);

  return { error };
}


export async function deleteOrArchiveShippingRecipient(
  storeId: string,
  recipientId: string
): Promise<{ action: "deleted" | "archived" | null; error: Error | null }> {
  const { count, error: shipmentCheckError } = await supabase
    .from("shipments")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("recipient_id", recipientId);

  if (shipmentCheckError) {
    return { action: null, error: shipmentCheckError };
  }

  if ((count || 0) > 0) {
    const { error } = await setShippingRecipientActive(storeId, recipientId, false);
    return {
      action: error ? null : "archived",
      error: error ? new Error(error.message) : null,
    };
  }

  const { error } = await supabase
    .from("shipping_recipients")
    .delete()
    .eq("store_id", storeId)
    .eq("id", recipientId);

  return {
    action: error ? null : "deleted",
    error: error ? new Error(error.message) : null,
  };
}
