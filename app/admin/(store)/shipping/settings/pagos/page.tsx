import { redirect } from "next/navigation";

// Keep existing bookmarks and previously issued Stripe onboarding links working.
export default async function LegacyPaymentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  }
  const query = params.toString();
  redirect(`/admin/settings/payments${query ? `?${query}` : ""}`);
}
