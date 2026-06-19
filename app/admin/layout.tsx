import AdminNav from "@/components/admin/AdminNav";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import AdminBottomNav from "@/components/admin/AdminBottomNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-gray-50 lg:flex">
        <div className="hidden lg:block">
          <AdminNav />
        </div>

        <div className="flex-1 pb-24 lg:pb-0">{children}</div>

        <div className="lg:hidden">
          <AdminBottomNav />
        </div>
      </div>
    </AdminAuthGuard>
  );
}