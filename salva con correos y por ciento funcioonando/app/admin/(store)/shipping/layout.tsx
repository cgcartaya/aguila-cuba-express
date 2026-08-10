import type { ReactNode } from "react";

import ShippingAccessGuard from "@/components/admin/auth/ShippingAccessGuard";

export default function ShippingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ShippingAccessGuard>{children}</ShippingAccessGuard>;
}
