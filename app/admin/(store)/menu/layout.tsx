import type { ReactNode } from "react";

import MenuAccessGuard from "@/components/admin/auth/MenuAccessGuard";

export default function MenuAdminLayout({ children }: { children: ReactNode }) {
  return <MenuAccessGuard>{children}</MenuAccessGuard>;
}
