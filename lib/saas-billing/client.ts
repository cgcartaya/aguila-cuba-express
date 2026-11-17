import { supabase } from "@/lib/supabase";
export async function billingRequest(query = "", body?: unknown) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Inicia sesión nuevamente.");
  const response = await fetch(`/api/saas/subscriptions${query}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "No se pudo completar la operación." }));
    throw new Error(error.error);
  }
  return response;
}
export async function billingCommand(body: unknown) {
  return (await billingRequest("", body)).json();
}
export async function openInvoicePdf(id: string) {
  // Open synchronously so browsers allow the new tab; replace only after authorized download.
  const tab = window.open("about:blank", "_blank");
  try {
    const response = await billingRequest(`?pdf=${encodeURIComponent(id)}`);
    const url = URL.createObjectURL(await response.blob());
    if (tab) tab.location.href = url;
    else {
      const a = document.createElement("a");
      a.href = url;
      a.download = "factura.pdf";
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}
