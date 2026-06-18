import { ShoppingCart, DollarSign, Package, Users } from "lucide-react";

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
            className="rounded-[1.5rem] border bg-white p-4 shadow-sm"
          >
            <div
              className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${card.bg}`}
            >
              <Icon size={22} className={card.color} />
            </div>

            <p className="text-sm font-medium text-gray-500">{card.title}</p>

            <h3 className="mt-1 text-3xl font-black leading-none text-[#061b3a]">
              {card.value}
            </h3>

            <p className={`mt-2 text-xs font-bold ${card.color}`}>
              {card.extra}
            </p>
          </div>
        );
      })}
    </section>
  );
}