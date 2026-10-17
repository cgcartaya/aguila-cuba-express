import type { Result } from "@/lib/shareapp/client";
export default function Results({ rows }: { rows: Result[] }) {
  const total = rows.reduce(
    (acc, row) => ({
      visits: acc.visits + Number(row.visits),
      views: acc.views + Number(row.product_views),
      orders: acc.orders + Number(row.orders),
      paid: acc.paid + Number(row.paid_orders),
      amount: acc.amount + Number(row.paid_total),
    }),
    { visits: 0, views: 0, orders: 0, paid: 0, amount: 0 },
  );
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Visitas", total.visits],
          ["Productos vistos", total.views],
          ["Pedidos creados", total.orders],
          ["Pedidos pagados", total.paid],
          ["Ventas pagadas · USD", total.amount.toFixed(2)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-500">
        Últimos 30 días. Las visitas cuentan entradas con referencia; pueden
        incluir repeticiones. Las ventas se calculan desde pedidos con pago
        confirmado, excluyendo cancelados. No son comisiones.
      </p>
      {rows.length > 1 && (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {[
                  "Gestor",
                  "Visitas",
                  "Vistas",
                  "Pedidos",
                  "Pagados",
                  "USD",
                ].map((text) => (
                  <th className="p-3" key={text}>
                    {text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t" key={row.member_id}>
                  <td className="p-3 font-bold">{row.display_name}</td>
                  {[
                    row.visits,
                    row.product_views,
                    row.orders,
                    row.paid_orders,
                    Number(row.paid_total).toFixed(2),
                  ].map((value, i) => (
                    <td className="p-3" key={i}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
