import AdminNav from "@/components/admin/AdminNav";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import Link from "next/link";
import { Menu, Store } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-gray-50 lg:flex">
        <AdminNav />

        <div className="flex-1">
          <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="font-bold text-gray-900">Águila Admin</p>
                <p className="text-xs text-gray-500">Panel de control</p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/tienda"
                  className="rounded-xl border p-2 text-gray-700"
                >
                  <Store size={20} />
                </Link>

                <button className="rounded-xl border p-2 text-gray-700">
                  <Menu size={20} />
                </button>
              </div>
            </div>

            <nav className="flex gap-2 overflow-x-auto px-4 pb-4">
              <MobileLink href="/admin" label="Dashboard" />
              <MobileLink href="/admin/products" label="Productos" />
              <MobileLink href="/admin/orders" label="Órdenes" />
              <MobileLink href="/admin/products/new" label="+ Producto" />
            </nav>
          </header>

          {children}
        </div>
      </div>
    </AdminAuthGuard>
  );
}

function MobileLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="whitespace-nowrap rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700"
    >
      {label}
    </Link>
  );
}