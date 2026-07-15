import { BarChart3, Boxes, Building2, Gift, MapPinned, MessageCircle, PackageSearch, ShoppingBag, Smartphone, Warehouse } from "lucide-react";

const features = [
  [ShoppingBag, "Tienda online", "Catálogo, carrito y checkout adaptados a móviles."],
  [Warehouse, "Inventario", "Entradas, ajustes, historial y alertas de bajo stock."],
  [PackageSearch, "Órdenes", "Estados, clientes, entregas y comunicación inmediata."],
  [MessageCircle, "WhatsApp", "Mensajes y pedidos conectados con tu operación."],
  [BarChart3, "Analytics", "Visitas, conversión, embudo y productos más vistos."],
  [Building2, "Multiempresa", "Varias tiendas separadas y administradas en una plataforma."],
  [Gift, "Bonos", "Campañas de descuento controladas por teléfono y código."],
  [MapPinned, "Entregas", "Zonas, costos, mínimos y domicilio gratis."],
  [Boxes, "Banners", "Promociones visuales por categoría o tienda completa."],
  [Smartphone, "App Android", "Operaciones móviles y soluciones personalizadas."],
];

export default function PerlaFeatures() {
  return (
    <section id="plataforma" className="px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[.25em] text-violet-600">Una plataforma completa</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-[#071044] sm:text-5xl">Todo lo que necesitas para vender y operar mejor.</h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">Perla Marketplace reúne comercio electrónico, administración y marketing en una experiencia sencilla para cualquier tipo de negocio.</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {features.map(([Icon, title, text]) => {
            const FeatureIcon = Icon as typeof ShoppingBag;
            return (
              <article key={title as string} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white"><FeatureIcon size={25} /></div>
                <h3 className="mt-5 font-black text-[#071044]">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text as string}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
