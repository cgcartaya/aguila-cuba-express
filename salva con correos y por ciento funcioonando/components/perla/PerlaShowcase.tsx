import Image from "next/image";

const modules = [
  { title: "Dashboard ejecutivo", text: "Ventas, órdenes, productos y accesos rápidos para entender tu operación en segundos.", image: "/perla/dashboard.png", bullets: ["Indicadores clave", "Órdenes recientes", "Acciones rápidas"] },
  { title: "Productos e inventario", text: "Catálogo organizado, carga masiva y control de existencias conectado con cada venta.", image: "/perla/inventory.png", bullets: ["Alertas de stock", "Entradas y ajustes", "Historial por producto"] },
  { title: "Órdenes y WhatsApp", text: "Gestiona cada pedido, cambia estados y comunica novedades al cliente desde el mismo flujo.", image: "/perla/orders.png", bullets: ["Búsqueda avanzada", "Estados de entrega", "Mensajes por WhatsApp"] },
  { title: "Analytics que ayudan a vender", text: "Mide visitas, carrito, checkout, órdenes y campañas para tomar decisiones con datos reales.", image: "/perla/analytics.png", bullets: ["Embudo de compra", "Conversión por producto", "Campañas UTM"] },
];

export default function PerlaShowcase() {
  return (
    <section id="soluciones" className="bg-[#071044] px-5 py-24 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[.25em] text-violet-300">Operación visual y simple</p>
          <h2 className="mt-4 text-4xl font-black sm:text-5xl">Tu negocio completo, sin saltar entre herramientas.</h2>
        </div>

        <div className="mt-16 space-y-20">
          {modules.map((module, index) => (
            <article key={module.title} className="grid items-center gap-10 lg:grid-cols-2">
              <div className={index % 2 ? "lg:order-2" : ""}>
                <span className="text-sm font-black text-violet-300">0{index + 1}</span>
                <h3 className="mt-3 text-3xl font-black">{module.title}</h3>
                <p className="mt-4 max-w-xl text-lg leading-8 text-white/65">{module.text}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {module.bullets.map((bullet) => <div key={bullet} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/85">{bullet}</div>)}
                </div>
              </div>
              <div className={index % 2 ? "lg:order-1" : ""}>
                <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white p-2 shadow-2xl shadow-black/40">
                  <Image src={module.image} alt={module.title} width={1100} height={850} className="h-auto w-full rounded-[1.35rem]" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
