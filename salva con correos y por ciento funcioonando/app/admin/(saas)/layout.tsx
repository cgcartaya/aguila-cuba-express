import type { ReactNode } from "react";

import AdminAccessGuard from "@/components/admin/auth/AdminAccessGuard";
import SaasAdminShell from "@/components/admin/layout/SaasAdminShell";

export default function SaasAdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAccessGuard area="saas">
      <SaasAdminShell>{children}</SaasAdminShell>
    </AdminAccessGuard>
  );
}
