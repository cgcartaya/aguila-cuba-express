import type { ReactNode } from "react";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <AdminAuthGuard>{children}</AdminAuthGuard>;
}
