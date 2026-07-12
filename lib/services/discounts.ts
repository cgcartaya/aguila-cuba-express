
import { supabase } from "@/lib/supabase";
import { normalizeCustomerPhone } from "@/lib/utils/phone";

export type DiscountCampaign = {
  id: string;
  store_id: string;
  name: string;
  code: string;
  discount_amount: number;
  authorized_limit: number;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DiscountCampaignCustomer = {
  id: string;
  campaign_id: string;
  store_id: string;
  customer_phone: string;
  status: "available" | "used" | "revoked";
  used_at: string | null;
  order_id: string | null;
  created_at: string;
};

export async function getDiscountCampaigns(storeId: string) {
  return supabase
    .from("discount_campaigns")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
}

export async function createDiscountCampaign(
  storeId: string,
  input: {
    name: string;
    code: string;
    discount_amount: number;
    authorized_limit: number;
    expires_at: string;
    is_active: boolean;
  }
) {
  return supabase
    .from("discount_campaigns")
    .insert({
      ...input,
      store_id: storeId,
      code: input.code.trim().toUpperCase(),
    })
    .select()
    .single();
}

export async function updateDiscountCampaign(
  id: string,
  storeId: string,
  input: Partial<
    Pick<
      DiscountCampaign,
      | "name"
      | "code"
      | "discount_amount"
      | "authorized_limit"
      | "expires_at"
      | "is_active"
    >
  >
) {
  const payload = {
    ...input,
    ...(input.code ? { code: input.code.trim().toUpperCase() } : {}),
  };

  return supabase
    .from("discount_campaigns")
    .update(payload)
    .eq("id", id)
    .eq("store_id", storeId)
    .select()
    .single();
}

export async function deleteDiscountCampaign(
  id: string,
  storeId: string
) {
  return supabase
    .from("discount_campaigns")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);
}

export async function getCampaignCustomers(
  campaignId: string,
  storeId: string
) {
  return supabase
    .from("discount_campaign_customers")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
}

export async function addCampaignPhones(
  campaign: DiscountCampaign,
  phones: string[]
) {
  const normalized = Array.from(
    new Set(
      phones
        .map(normalizeCustomerPhone)
        .filter((phone) => phone.length >= 8)
    )
  );

  const { count, error: countError } = await supabase
    .from("discount_campaign_customers")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaign.id);

  if (countError) {
    return { data: null, error: countError };
  }

  const currentCount = count || 0;
  const remaining = Math.max(campaign.authorized_limit - currentCount, 0);

  if (normalized.length > remaining) {
    return {
      data: null,
      error: {
        message: `Solo quedan ${remaining} espacios disponibles en esta campaña.`,
      },
    };
  }

  if (normalized.length === 0) {
    return {
      data: [],
      error: {
        message: "No se encontraron teléfonos válidos.",
      },
    };
  }

  return supabase
    .from("discount_campaign_customers")
    .upsert(
      normalized.map((customer_phone) => ({
        campaign_id: campaign.id,
        store_id: campaign.store_id,
        customer_phone,
        status: "available",
      })),
      {
        onConflict: "campaign_id,customer_phone",
        ignoreDuplicates: true,
      }
    )
    .select();
}

export async function updateCampaignCustomerStatus(
  id: string,
  storeId: string,
  status: "available" | "revoked"
) {
  return supabase
    .from("discount_campaign_customers")
    .update({
      status,
      ...(status === "available"
        ? { used_at: null, order_id: null }
        : {}),
    })
    .eq("id", id)
    .eq("store_id", storeId)
    .select()
    .single();
}

export async function removeCampaignCustomer(
  id: string,
  storeId: string
) {
  return supabase
    .from("discount_campaign_customers")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);
}
