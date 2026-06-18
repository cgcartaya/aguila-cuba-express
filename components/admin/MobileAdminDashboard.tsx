import MobileStats from "@/components/admin/MobileStats";
import MobileQuickActions from "@/components/admin/MobileQuickActions";
import MobileRecentOrders from "@/components/admin/MobileRecentOrders";
import { Store } from "lucide-react";
import Link from "next/link";

type RecentOrder = {
  id: string;
  customer: string;
  total: number;
  status: "Pendiente" | "Preparando" | "En camino" | "Entregado";
};

type Props = {
  ordersCount: number;
  sales: number;
  productsCount: number;
  customersCount: number;
  recentOrders: RecentOrder[];
};

export default function MobileAdminDashboard({
  ordersCount,
  sales,
  productsCount,
  customersCount,
  recentOrders,
}: Props) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-24 pt-5">
      <section className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-500">
            Panel administrativo
          </p>

          <h1 className="text-2xl font-black text-[#061b3a]">
            Águila Admin
          </h1>
        </div>

        <Link
          href="/tienda"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm border"
        >
          <Store size={22} className="text-[#061b3a]" />
        </Link>
      </section>

      <MobileStats
        orders={ordersCount}
        sales={sales}
        products={productsCount}
        customers={customersCount}
      />

      <MobileQuickActions />

      <MobileRecentOrders orders={recentOrders} />
    </main>
  );
}