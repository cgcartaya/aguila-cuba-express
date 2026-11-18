import { Suspense } from "react";
import SubscriptionBilling from "@/components/admin/saas/SubscriptionBilling";
export default function SubscriptionBillingPage() {
  return (
    <Suspense fallback={<p className="p-6">Cargando facturación…</p>}>
      <SubscriptionBilling />
    </Suspense>
  );
}
