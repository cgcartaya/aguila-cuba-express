import MobileStats from "@/components/admin/MobileStats";
import MobileQuickActions from "@/components/admin/MobileQuickActions";
import MobileRecentOrders from "@/components/admin/MobileRecentOrders";
import MobileAdminBottomNav from "@/components/admin/MobileAdminBottomNav";

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
      <section className="mb-5">
        <p className="text-sm font-bold text-gray-500">Bienvenido, Admin</p>

        <h1 className="text-3xl font-black text-[#061b3a]">
          Resumen de tu tienda
        </h1>
      </section>

      <MobileStats
        orders={ordersCount}
        sales={sales}
        products={productsCount}
        customers={customersCount}
      />

      <div className="mt-7">
        <MobileQuickActions />
      </div>

      <div className="mt-7">
        <MobileRecentOrders orders={recentOrders} />
      </div>
      <MobileAdminBottomNav />
    </main>
  );
}