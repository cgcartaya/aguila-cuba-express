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
