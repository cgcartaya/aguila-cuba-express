import type { SupabaseClient } from "@supabase/supabase-js";

type CheckoutCustomer = {
  store_id: string;
  phone: string;
  name: string;
  email: string | null;
  city: string | null;
  device_token: string;
};

/** Phone remains the customer's identity within a store, even for shared emails. */
export async function saveCheckoutCustomer(
  database: SupabaseClient,
  customer: CheckoutCustomer
) {
  const save = (values: Omit<CheckoutCustomer, "email"> & { email?: string | null }) =>
    database
      .from("customers")
      .upsert(values, { onConflict: "store_id,phone" })
      .select("id")
      .single();

  const result = await save(customer);
  if (
    result.error?.code !== "23505" ||
    !result.error.message.includes('"customers_store_id_email_key"')
  ) {
    return result;
  }

  // Do not merge customers or move their device tokens/history by shared email.
  // Omitting email preserves this phone's email on update, or leaves it unset
  // on insert. Checkout confirmation still uses the submitted email separately.
  const withoutEmail: Omit<CheckoutCustomer, "email"> & { email?: string | null } = { ...customer };
  delete withoutEmail.email;
  return save(withoutEmail);
}
