import { supabase } from "@/lib/supabase";

export default async function TrashPage() {
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .not("deleted_at", "is", null);

  const { data: combos } = await supabase
    .from("combos")
    .select("*")
    .not("deleted_at", "is", null);

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .not("deleted_at", "is", null);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-black text-[#061b3a]">
          🗑 Papelera
        </h1>

        <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-black">
            Productos ({products?.length || 0})
          </h2>

          <div className="space-y-2">
            {products?.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border p-4"
              >
                {p.name}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-black">
            Combos ({combos?.length || 0})
          </h2>

          <div className="space-y-2">
            {combos?.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border p-4"
              >
                {c.name}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-black">
            Órdenes ({orders?.length || 0})
          </h2>

          <div className="space-y-2">
            {orders?.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border p-4"
              >
                {o.order_number || o.id.slice(0, 8)}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}