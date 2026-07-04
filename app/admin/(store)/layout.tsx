import type { ReactNode } from "react";

import AdminAccessGuard from "@/components/admin/auth/AdminAccessGuard";
import StoreAdminShell from "@/components/admin/layout/StoreAdminShell";

export default function StoreAdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAccessGuard area="store">
      <StoreAdminShell>{children}</StoreAdminShell>
    </AdminAccessGuard>
  );
}
