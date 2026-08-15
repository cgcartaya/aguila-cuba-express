import type { ReactNode } from "react";

import ReservasAccessGuard from "@/components/admin/auth/ReservasAccessGuard";

export default function ReservasAdminLayout({ children }: { children: ReactNode }) {
  return <ReservasAccessGuard>{children}</ReservasAccessGuard>;
}
