import AdminNav from "@/components/admin/AdminNav";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-gray-50 lg:flex">
        
        {/* Sidebar solo escritorio */}
        <div className="hidden lg:block">
          <AdminNav />
        </div>

        {/* Contenido */}
        <div className="flex-1">
          {children}
        </div>

      </div>
    </AdminAuthGuard>
  );
}