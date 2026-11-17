import { createHash } from "node:crypto";
import { db } from "@/lib/saas-billing/server";
import { invoicePdf } from "@/lib/saas-billing/pdf";
import type { Invoice } from "@/lib/saas-billing/model";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const headers = {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
  };
  const missing = () =>
    new Response("Enlace no disponible o vencido.", { status: 404, headers });
  if (!/^[a-f0-9]{64}$/.test(token)) return missing();
  const { data: link, error } = await db
    .from("saas_invoice_links")
    .select("invoice_id")
    .eq("token_hash", createHash("sha256").update(token).digest("hex"))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !link) return missing();
  const { data: invoice } = await db
    .from("saas_subscription_invoices")
    .select("*")
    .eq("id", link.invoice_id)
    .in("status", ["pending", "paid"])
    .maybeSingle();
  if (!invoice) return missing();
  // A possession link discloses only this PDF, never invoice lists or payment references.
  return new Response(new Uint8Array(await invoicePdf(invoice as Invoice)), {
    headers: {
      ...headers,
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
