import { supabase } from "@/lib/supabase";
import {
  createDefaultCheckoutSettings,
  DEFAULT_CHECKOUT_BLOCKS,
  type CheckoutBlocks,
  type CheckoutMethod,
  type CheckoutSettings,
} from "@/lib/checkout/types";

type CheckoutSettingsRow = Omit<CheckoutSettings, "blocks"> & {
  blocks: Partial<CheckoutBlocks> | null;
};

function normalize(row: CheckoutSettingsRow): CheckoutSettings {
  return {
    ...row,
    fixed_delivery_fee: Number(row.fixed_delivery_fee || 0),
    blocks: {
      ...DEFAULT_CHECKOUT_BLOCKS,
      ...(row.blocks || {}),
    },
  };
}

export async function getCheckoutSettings(storeId: string): Promise<{
  data: CheckoutSettings;
  exists: boolean;
  error: string | null;
}> {
  const fallback = createDefaultCheckoutSettings(storeId);

  const { data, error } = await supabase
    .from("checkout_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    return { data: fallback, exists: false, error: error.message };
  }

  if (!data) {
    return { data: fallback, exists: false, error: null };
  }

  return {
    data: normalize(data as CheckoutSettingsRow),
    exists: true,
    error: null,
  };
}

export async function saveCheckoutSettings(settings: CheckoutSettings) {
  const enabledMethods: CheckoutMethod[] = [
    settings.enabled_delivery ? "delivery" : null,
    settings.enabled_cuba ? "cuba" : null,
    settings.enabled_pickup ? "pickup" : null,
  ].filter(Boolean) as CheckoutMethod[];

  if (enabledMethods.length === 0) {
    return { data: null, error: "Activa al menos un método de entrega." };
  }

  const defaultMethod = enabledMethods.includes(settings.default_method)
    ? settings.default_method
    : enabledMethods[0];

  const payload = {
    store_id: settings.store_id,
    enabled_delivery: settings.enabled_delivery,
    enabled_cuba: settings.enabled_cuba,
    enabled_pickup: settings.enabled_pickup,
    default_method: defaultMethod,
    delivery_address_mode: settings.delivery_address_mode,
    cuba_address_mode: settings.cuba_address_mode,
    show_delivery_price: settings.show_delivery_price,
    fixed_delivery_fee: Math.max(0, Number(settings.fixed_delivery_fee || 0)),
    blocks: settings.blocks,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("checkout_settings")
    .upsert(payload, { onConflict: "store_id" })
    .select("*")
    .single();

  return {
    data: data ? normalize(data as CheckoutSettingsRow) : null,
    error: error?.message || null,
  };
}
