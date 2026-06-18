import {
  ShoppingCart,
  DollarSign,
  Package,
  Users,
} from "lucide-react";

type Props = {
  orders: number;
  sales: number;
  products: number;
  customers: number;
};

export default function MobileStats({
  orders,
  sales,
  products,
  customers,
}: Props) {
  const cards = [
    {
      title: "Órdenes",
      value: orders,
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-50",
      extra: "Pendientes",
    },
    {
      title: "Ventas",
      value: `$${sales.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
      extra: "Este mes",
    },
    {
      title: "Productos",
      value: products,
      icon: Package,
      color: "text-purple-600",
      bg: "bg-purple-50",
      extra: "Activos",
    },
    {
      title: "Clientes",
      value: customers,
      icon: Users,
      color: "text-orange-600",
      bg: "bg-orange-50",
      extra: "Registrados",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="rounded-3xl bg-white p-4 shadow-sm border"
          >
            <div
              className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${card.bg}`}
            >
              <Icon
                size={24}
                className={card.color}
              />
            </div>

            <p className="text-sm text-gray-500">
              {card.title}
            </p>

            <h3 className="text-3xl font-black text-[#061b3a]">
              {card.value}
            </h3>

            <p className={`text-xs font-bold ${card.color}`}>
              {card.extra}
            </p>
          </div>
        );
      })}
    </section>
  );
}