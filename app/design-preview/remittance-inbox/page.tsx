import { notFound } from "next/navigation";
import RemittanceInboxPreview from "@/components/admin/remittances/RemittanceInboxPreview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vista de diseño · Órdenes de remesas", robots: { index: false, follow: false } };

export default function RemittanceDesignPreview() {
  // Fixtures are accessible in preview deployments only, never in production.
  if (process.env.VERCEL_ENV !== "preview") notFound();
  return <RemittanceInboxPreview />;
}
