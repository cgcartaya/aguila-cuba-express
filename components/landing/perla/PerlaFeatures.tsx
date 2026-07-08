import {
  BarChart3,
  Globe2,
  MessageCircle,
  PackageCheck,
  ShoppingCart,
  Store,
} from "lucide-react";

const features = [
  [Store, "Tiendas ilimitadas", "Gestiona varias marcas desde un solo panel."],
  [PackageCheck, "Productos y stock", "Control total de productos, variantes e inventario."],
  [ShoppingCart, "Órdenes y clientes", "Administra pedidos, estados y clientes."],
  [MessageCircle, "WhatsApp integrado", "Comunícate al instante con tus clientes."],
  [Globe2, "Dominios propios", "Usa tu dominio o un subdominio gratis."],
  [BarChart3, "Reportes y estadísticas", "Datos claros para tomar mejores decisiones."],
];

export default function PerlaFeatures() {
  return (
    <section id="caracteristicas" className="px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-violet-100 bg-white p-5 shadow-2xl shadow-violet-100/80 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {features.map(([Icon, title, text]) => {
            const FeatureIcon = Icon as typeof Store;
            return (
              <div key={title as string} className="rounded-3xl p-4 text-center transition hover:-translate-y-1 hover:bg-violet-50">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <FeatureIcon className="h-7 w-7" strokeWidth={2.4} />
                </div>
                <h3 className="mt-4 text-sm font-black text-[#071044]">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5c6794]">{text as string}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
